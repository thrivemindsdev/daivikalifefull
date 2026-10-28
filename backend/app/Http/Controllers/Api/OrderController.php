<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderPayment;
use App\Services\OrderPricing;
use App\Services\PricingError;
use App\Services\RateLimit;
use App\Services\VendorRouting;
use App\Services\VendorStore;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\Response;

// GET  /api/orders                 the signed-in customer's orders (admins: all confirmed orders)
// GET  /api/orders/track           public tracking (order id or invoice + phone)
// POST /api/orders                 create a pending order; prices are computed here, never taken from the browser
// POST /api/orders/sync            link the signed-in customer's guest orders to their account
// PUT  /api/orders/:id/status      admin status change
class OrderController extends ApiController
{
    private const ADMIN_STATUSES = ['Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    private const EMAIL_RE = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
    private const SAFE_IMAGE = '/^(https?:\/\/|\/)[^\s"\'<>]*$/i';

    protected function handle(string $method): Response
    {
        return match ($method) {
            'GET' => $this->get(),
            'POST' => $this->post(),
            'PUT' => $this->put(),
            'DELETE' => $this->error('Order deletion is disabled', 403),
            default => $this->notFound(),
        };
    }

    private static function confirmedScope(Builder $q): Builder
    {
        return $q->where('status', '!=', 'Pending Payment')->where('paymentStatus', '!=', 'Pending');
    }

    private function get(): Response
    {
        if ($this->seg(0) === 'track') {
            return $this->track();
        }
        $user = $this->user();
        if (! $user) {
            return $this->error('Not authorized to access orders', 401);
        }
        try {
            if ($user->role === 'admin') {
                // Route any confirmed orders that came in through payment webhooks
                VendorRouting::routeUnassigned();
                $orders = self::confirmedScope(Order::query())->orderByDesc('createdAt')->get();
                return $this->ok($orders->map->toArray()->all());
            }
            // Customer: only their own confirmed orders
            return $this->ok($this->ownOrders($user)->map->toArray()->all());
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    private function ownOrders(User $user)
    {
        $q = Order::query()->where(function ($w) use ($user) {
            $w->where('userId', $user->id);
            if ($user->email) {
                $w->orWhere('email', strtolower(trim($user->email)));
            }
            if ($user->phone) {
                $w->orWhere('phone', trim($user->phone));
            }
        });
        return self::confirmedScope($q)->orderByDesc('createdAt')->get();
    }

    // Public tracking for guests: needs both the reference and the phone number on the order, and returns
    // no address or contact details
    private function track(): Response
    {
        if ($limited = RateLimit::hit('track:'.$this->ip(), 20, 15 * 60 * 1000)) {
            return $limited;
        }
        $ref = mb_strtolower(Text::clean($this->request->query('ref'), 60));
        $phone = Text::phoneKey($this->request->query('phone'));
        if ($ref === '' || strlen($phone) !== 10) {
            return $this->error('Enter your order ID (or invoice number) and the mobile number used for the order', 400);
        }
        $candidates = self::confirmedScope(Order::query())
            ->where(fn ($w) => $w->whereRaw('LOWER("id") = ?', [$ref])->orWhereRaw('LOWER("invoiceNumber") = ?', [$ref]))
            ->orderByDesc('createdAt')->get();
        $order = $candidates->first(fn ($o) => Text::phoneKey($o->phone) === $phone);
        if (! $order) {
            return $this->error('No order found with these details', 404);
        }
        return $this->ok([
            '_id' => $order->id,
            'invoiceNumber' => $order->invoiceNumber ?: '',
            'status' => $order->status,
            'paymentStatus' => $order->paymentStatus,
            'date' => $order->date ?: '',
            'createdAt' => $order->toArray()['createdAt'] ?? null,
            'total' => $order->total,
            'itemsList' => array_map(fn ($it) => [
                'name' => $it['name'] ?? null,
                'qty' => ($it['qty'] ?? null) ?: (($it['quantity'] ?? null) ?: 1),
                'size' => ($it['size'] ?? '') ?: '',
                'image' => ($it['image'] ?? '') ?: '',
            ], array_map(fn ($it) => Json::arr($it), Json::list($order->itemsList))),
        ]);
    }

    private function post(): Response
    {
        // Links guest orders placed with this account's email / phone. Never creates orders.
        if ($this->seg(0) === 'sync') {
            $user = $this->user();
            if (! $user) {
                return $this->error('Not authorized to sync orders', 401);
            }
            try {
                $email = $user->email ? strtolower(trim($user->email)) : null;
                $phone = $user->phone ? trim($user->phone) : null;
                if ($email || $phone) {
                    Order::query()
                        ->where(function ($w) use ($email, $phone) {
                            if ($email) {
                                $w->orWhere('email', $email);
                            }
                            if ($phone) {
                                $w->orWhere('phone', $phone);
                            }
                        })
                        ->where(fn ($w) => $w->where('isGuest', true)->orWhereNull('userId'))
                        ->update(['userId' => $user->id, 'isGuest' => false, 'updatedAt' => now()]);
                }
                return $this->ok($this->ownOrders($user)->map->toArray()->all());
            } catch (\Throwable $e) {
                return $this->error($e->getMessage(), 500);
            }
        }
        if ($this->path) {
            return $this->notFound();
        }
        return $this->create();
    }

    private function create(): Response
    {
        if ($limited = RateLimit::hit('order:'.$this->ip(), 30, 15 * 60 * 1000)) {
            return $limited;
        }
        try {
            $body = Json::decode($this->request->getContent());
            if (! is_array($body) || array_is_list($body)) {
                return $this->error('Invalid order data', 400);
            }

            // An order that already exists can't be changed from the storefront: payment is confirmed by
            // /api/payment/*, and status changes are admin-only. Older checkouts re-post the paid order;
            // answer with its current state (without personal details) so they keep working.
            if (! empty($body['_id'])) {
                $existing = Order::query()->find(Text::s($body['_id']));
                if ($existing) {
                    return $this->ok(OrderPayment::publicView($existing), 200);
                }
            }

            $user = $this->user();
            $address = Json::arr($body['address'] ?? []);
            $order = [
                'user' => Text::clean($body['user'] ?? '', 120),
                'email' => mb_strtolower(Text::clean($body['email'] ?? '', 160)),
                'phone' => Text::clean($body['phone'] ?? '', 20),
                'address' => [
                    'street' => Text::clean($address['street'] ?? '', 300),
                    'city' => Text::clean($address['city'] ?? '', 100),
                    'district' => Text::clean($address['district'] ?? '', 100),
                    'state' => Text::clean($address['state'] ?? '', 100),
                    'pincode' => Text::clean($address['pincode'] ?? '', 10),
                    'country' => 'India',
                ],
            ];
            if ($order['user'] === '') {
                return $this->error('Please enter your name', 400);
            }
            if (strlen(Text::phoneKey($order['phone'])) !== 10) {
                return $this->error('Please enter a valid 10-digit mobile number', 400);
            }
            if ($order['email'] !== '' && ! preg_match(self::EMAIL_RE, $order['email'])) {
                return $this->error('Please enter a valid email address', 400);
            }
            if ($order['address']['street'] === '' || $order['address']['city'] === '' || $order['address']['state'] === '') {
                return $this->error('Please fill in your full delivery address', 400);
            }
            if (! preg_match('/^\d{6}$/', $order['address']['pincode'])) {
                return $this->error('Please enter a valid 6-digit PIN code', 400);
            }

            $isCod = ! empty($body['isPartialCod']) || preg_match('/cash on delivery/i', Text::s($body['paymentMethod'] ?? '')) === 1;
            $items = [];
            foreach (array_slice(Json::list($body['itemsList'] ?? []), 0, 50) as $it) {
                $it = Json::arr($it);
                $image = Text::s($it['image'] ?? '');
                $items[] = [
                    'productId' => Text::clean($it['productId'] ?? '', 80),
                    'qty' => $it['qty'] ?? ($it['quantity'] ?? null),
                    'size' => Text::clean($it['size'] ?? '', 80),
                    'color' => Text::clean($it['color'] ?? '', 80),
                    'isFreeGift' => ! empty($it['isFreeGift']),
                    'image' => preg_match(self::SAFE_IMAGE, $image) ? $image : '',
                    'name' => Text::clean($it['name'] ?? '', 200),
                ];
            }
            $pricing = OrderPricing::price($items, $order['address']['state'], Text::clean($body['couponCode'] ?? '', 40), $order['phone'], $isCod);
            unset($pricing['subtotal']);

            $userId = $user?->id;
            if (! $userId && $order['email'] !== '') {
                $userId = User::query()->where('email', $order['email'])->value('id');
            }

            $utmData = [];
            foreach (array_slice(Json::obj($body['utmData'] ?? []), 0, 20, true) as $k => $v) {
                $utmData[Text::clean($k, 40)] = Text::clean($v, 300);
            }

            $created = Order::query()->create($order + $pricing + [
                'id' => $this->newOrderId(),
                'invoiceNumber' => '',
                'razorpay_payment_id' => '',
                'status' => 'Pending Payment',
                'paymentStatus' => 'Pending',
                'paymentMethod' => $isCod ? 'Cash on Delivery (Advance Paid)' : 'Razorpay',
                'isStockDecremented' => false,
                'userId' => $userId,
                'isGuest' => ! $userId,
                'time' => now('Asia/Kolkata')->format('h:i a'),
                'date' => gmdate('Y-m-d'),
                'companyDetails' => ['utmData' => Json::object($utmData)],
            ]);
            return $this->ok($created->fresh()->toArray(), 201);
        } catch (PricingError $e) {
            return $this->error($e->getMessage(), 400, $e->productId !== '' ? ['unavailableProductId' => $e->productId] : []);
        } catch (\Throwable $e) {
            report($e);
            return $this->error('Could not create your order. Please try again.', 500);
        }
    }

    private function newOrderId(): string
    {
        for ($i = 0; $i < 5; $i++) {
            $id = 'ORD_'.strtoupper(base_convert((string) (int) (microtime(true) * 1000), 10, 36)).strtoupper(bin2hex(random_bytes(3)));
            if (! Order::query()->whereKey($id)->exists()) {
                return $id;
            }
        }
        throw new \RuntimeException('Could not allocate an order number, please try again');
    }

    private function put(): Response
    {
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        $id = $this->seg(0);
        if (! $id) {
            return $this->error('Order ID is required', 400);
        }
        if ($this->seg(1) !== 'status') {
            return $this->notFound();
        }
        try {
            $status = Text::s($this->body()['status'] ?? '');
            if (! in_array($status, self::ADMIN_STATUSES, true)) {
                return $this->error('Status must be one of: '.implode(', ', self::ADMIN_STATUSES), 400);
            }
            $order = Order::query()->find($id);
            if (! $order) {
                return $this->error('Order not found', 404);
            }
            if ($order->status === 'Pending Payment' || $order->paymentStatus === 'Pending') {
                return $this->error('This order has not been paid yet', 400);
            }

            $patch = ['status' => $status];
            $items = Json::list($order->itemsList);
            // Cancelling gives the stock back to whoever holds it; re-opening takes it from the main store again
            if ($status === 'Cancelled' && $order->status !== 'Cancelled' && $order->isStockDecremented) {
                if ($order->stockSource === 'vendor' && $order->vendorId) {
                    VendorStore::adjustForItems($order->vendorId, $items, +1);
                } else {
                    VendorRouting::adjustMainStock($items, +1);
                }
                $patch += ['isStockDecremented' => false, 'stockSource' => ''];
            } elseif ($order->status === 'Cancelled' && $status !== 'Cancelled' && ! $order->isStockDecremented) {
                VendorRouting::adjustMainStock($items, -1);
                $patch += ['isStockDecremented' => true, 'stockSource' => 'main'];
            }

            return $this->ok(VendorRouting::saveOrderPatch($id, $patch), 200, ['message' => 'Order status updated successfully']);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
