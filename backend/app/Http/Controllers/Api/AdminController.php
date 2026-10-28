<?php

namespace App\Http\Controllers\Api;

use App\Models\Banner;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Newsletter;
use App\Models\Order;
use App\Models\PopularSearch;
use App\Models\Product;
use App\Models\ProductGroup;
use App\Models\Setting;
use App\Models\Size;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Cloudinary;
use App\Services\MediaStorage;
use App\Services\ProductCatalog;
use App\Services\Settings;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

// Admin-only endpoints under /api/admin (dashboard data, users, settings, banners, product groups, uploads ...)
class AdminController extends ApiController
{
    private const DUMMY_ORDER_IDS = ['ord_1', 'ord_2', 'ord_3', 'ord_140378', '140378'];

    protected function handle(string $method): Response
    {
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        try {
            return match ($method) {
                'GET' => $this->get(),
                'POST' => $this->post(),
                'PUT' => $this->put(),
                'DELETE' => $this->delete(),
                default => $this->notFound(),
            };
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    private static function users(): array
    {
        return User::query()->orderByDesc('createdAt')->get()->map(fn ($u) => AuthService::publicUser($u))->all();
    }

    private static function categoryBreakdown(): array
    {
        return Product::query()->select('category', DB::raw('COUNT(*) AS count'))->groupBy('category')->get()
            ->map(fn ($r) => ['name' => $r->category, 'count' => (int) $r->count])->all();
    }

    private static function isDummyOrder(array $o): bool
    {
        $oid = strtolower((string) ($o['_id'] ?? ''));
        return in_array($oid, self::DUMMY_ORDER_IDS, true)
            || str_contains(strtolower((string) ($o['email'] ?? '')), 'sheenaponnappan')
            || str_contains(strtolower((string) ($o['user'] ?? '')), 'sheena ponnappan');
    }

    // ── GET ────────────────────────────────────────────────

    private function get(): Response
    {
        switch ($this->seg(0)) {
            case 'dashboard-init':
                $users = self::users();
                $breakdown = self::categoryBreakdown();
                $orders = Order::query()->where('status', '!=', 'Pending Payment')->where('paymentStatus', '!=', 'Pending')
                    ->orderByDesc('createdAt')->get()->map->toArray()->filter(fn ($o) => ! self::isDummyOrder($o))->values()->all();
                return $this->ok([
                    'stats' => [
                        'totalUsers' => count($users),
                        'totalProducts' => Product::query()->count(),
                        'totalCategories' => count($breakdown),
                        'categoryBreakdown' => $breakdown,
                        'recentUsers' => array_slice($users, 0, 5),
                    ],
                    'users' => $users,
                    'categories' => Category::ordered()->get()->map->toArray()->all(),
                    'productGroups' => ProductCatalog::populatedGroups(),
                    'orders' => $orders,
                    'banners' => Banner::query()->orderBy('createdAt')->get()->map->toArray()->all(),
                    'popularSearches' => PopularSearch::query()->orderByDesc('createdAt')->get()->map->toArray()->all(),
                    'sizes' => Size::query()->orderByDesc('createdAt')->get()->map->toArray()->all(),
                    'products' => Product::query()->orderByDesc('createdAt')->get()->map->toArray()->all(),
                ]);

            case 'stats':
                $breakdown = self::categoryBreakdown();
                return $this->ok([
                    'totalUsers' => User::query()->count(),
                    'totalProducts' => Product::query()->count(),
                    'totalCategories' => count($breakdown),
                    'categoryBreakdown' => $breakdown,
                    'recentUsers' => User::query()->orderByDesc('createdAt')->limit(5)->get()->map->toArray()->all(),
                ]);

            case 'users':
                return $this->ok(self::users());

            case 'contact-messages':
                return $this->ok(ContactMessage::query()->orderByDesc('createdAt')->get()->map->toArray()->all());

            case 'newsletter-subscribers':
                return $this->ok(Newsletter::query()->orderByDesc('createdAt')->get()->map->toArray()->all());

            case 'groups':
                return $this->ok(ProductCatalog::populatedGroups());

            case 'settings':
                return $this->ok(Json::object(Settings::all()));
        }
        return $this->notFound();
    }

    // ── POST ───────────────────────────────────────────────

    private function post(): Response
    {
        switch ($this->seg(0)) {
            case 'upload-logo':
            case 'upload-image':
                $file = MediaStorage::file($this->request, 'image') ?? MediaStorage::file($this->request, 'file');
                if (! $file) {
                    return $this->error('No image uploaded', 400);
                }
                try {
                    $url = MediaStorage::store($file);
                } catch (\Throwable $e) {
                    logger()->error('Upload Image Error: '.$e->getMessage());
                    return $this->error('Image upload failed', 500);
                }
                $label = $this->seg(0) === 'upload-logo' ? 'Logo' : 'Image';
                return $this->ok(['imageUrl' => $url], 200, ['imageUrl' => $url, 'message' => "$label uploaded successfully"]);

            // Lets the admin's browser upload a large video straight to Cloudinary without the API secret leaving the server
            case 'cloudinary-signature':
                $signed = Cloudinary::signedUploadParams();
                if (! $signed) {
                    return $this->error('Cloudinary is not configured on the server', 503);
                }
                return $this->ok($signed);

            case 'groups':
                $body = $this->body();
                $name = trim(Text::s($body['name'] ?? ''));
                if ($name === '') {
                    return $this->error('Group name is required', 400);
                }
                if (! isset($body['products']) || ! is_array($body['products']) || ! array_is_list($body['products'])) {
                    return $this->error('Products list is required', 400);
                }
                if (ProductGroup::query()->whereRaw('LOWER("name") = ?', [mb_strtolower($name)])->exists()) {
                    return $this->error('A product group with this name already exists', 400);
                }
                $group = ProductGroup::query()->create(['name' => $name, 'productIds' => self::productIds($body['products'])]);
                ProductCatalog::clearCache();
                return $this->ok(ProductCatalog::populateGroup($group->fresh()), 201, ['message' => 'Product Group created successfully']);

            case 'recover-pending-payments':
                return $this->recoverPendingPayments();
        }
        return $this->notFound();
    }

    private static function productIds(array $products): array
    {
        $ids = [];
        foreach ($products as $p) {
            $id = is_array($p) ? ($p['_id'] ?? ($p['id'] ?? null)) : $p;
            if ($id !== null && $id !== '' && ! in_array((string) $id, $ids, true)) {
                $ids[] = (string) $id;
            }
        }
        return $ids;
    }

    // Re-checks pending Cashfree orders (or one order id) with Cashfree and confirms the paid ones
    private function recoverPendingPayments(): Response
    {
        $body = $this->body();
        $specific = trim(Text::s($body['orderId'] ?? ''));
        $appId = (string) config('daivika.cashfree.app_id');
        $secret = (string) config('daivika.cashfree.secret_key');
        $base = config('daivika.cashfree.env') === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';
        if ($appId === '' || $secret === '') {
            return $this->error('Cashfree credentials not configured', 500);
        }

        $results = ['recovered' => [], 'stillPending' => [], 'errors' => []];
        $process = function (string $orderId, ?Order $existing) use ($base, $appId, $secret, &$results) {
            try {
                $res = Http::timeout(20)->withHeaders(['x-api-version' => '2023-08-01', 'x-client-id' => $appId, 'x-client-secret' => $secret])
                    ->get("$base/".rawurlencode($orderId));
                $cf = $res->json() ?? [];
                if ($res->successful() && in_array($cf['order_status'] ?? '', ['PAID', 'SUCCESS'], true)) {
                    $method = strtolower((string) ($existing?->paymentMethod ?? ''));
                    $isPartialCod = $existing?->isPartialCod || str_contains($method, 'cash on delivery') || str_contains($method, 'advance');
                    $update = [
                        'status' => 'Processing',
                        'paymentStatus' => $isPartialCod ? 'Partially Paid' : 'Paid',
                        'paymentMethod' => $isPartialCod ? 'Cash on Delivery' : 'Cashfree Online',
                        'razorpay_payment_id' => ($cf['cf_order_id'] ?? '') ?: (($existing?->razorpay_payment_id ?: '') ?: 'CF_RECOVERED_'.round(microtime(true) * 1000)),
                    ];
                    $order = Order::query()->find($orderId);
                    if ($order) {
                        $order->fill($update)->save();
                    } else {
                        // Order was never saved: create it from Cashfree's data
                        $cust = Json::arr($cf['customer_details'] ?? []);
                        $amt = (float) Text::num($cf['order_amount'] ?? 0);
                        Order::query()->create([
                            'id' => $orderId,
                            'invoiceNumber' => 'SPO'.random_int(100000, 999999),
                            'user' => ($cust['customer_name'] ?? '') ?: 'Customer',
                            'email' => ($cust['customer_email'] ?? '') ?: 'support@daivika.in',
                            'phone' => ($cust['customer_phone'] ?? '') ?: '',
                            'total' => $amt,
                            'advanceAmount' => $amt,
                            'remainingAmount' => 0,
                            'isPartialCod' => false,
                            'codPercent' => 30,
                            'shippingCharge' => 0,
                            'discount' => 0,
                            'couponCode' => '',
                            'status' => 'Processing',
                            'paymentStatus' => 'Paid',
                            'paymentMethod' => 'Cashfree Online / UPI',
                            'razorpay_payment_id' => ($cf['cf_order_id'] ?? '') ?: 'CF_'.round(microtime(true) * 1000),
                            'time' => now('Asia/Kolkata')->format('h:i a'),
                            'date' => gmdate('Y-m-d'),
                            'address' => ['street' => '', 'city' => '', 'state' => '', 'pincode' => '', 'country' => 'India'],
                            'itemsList' => [],
                            'isGuest' => true,
                            'companyDetails' => ['utmData' => ['source' => 'cashfree_admin_recovery', 'cf_order_id' => $cf['cf_order_id'] ?? null]],
                        ]);
                    }
                    $results['recovered'][] = [
                        'id' => $orderId,
                        'user' => $existing?->user ?? (Json::arr($cf['customer_details'] ?? [])['customer_name'] ?? null),
                        'total' => $existing?->total ?? ($cf['order_amount'] ?? null),
                        'paymentStatus' => $update['paymentStatus'],
                    ];
                } else {
                    $results['stillPending'][] = ['id' => $orderId, 'cfStatus' => ($cf['order_status'] ?? '') ?: 'UNKNOWN'];
                }
            } catch (\Throwable $e) {
                $results['errors'][] = ['id' => $orderId, 'error' => $e->getMessage()];
            }
        };

        if ($specific !== '') {
            $process($specific, null);
        } else {
            // Only orders from the last 7 days
            $pending = Order::query()->where('status', 'Pending Payment')->where('paymentStatus', 'Pending')
                ->where('createdAt', '>=', now()->subDays(7))->get();
            foreach ($pending as $order) {
                $process($order->id, $order);
            }
        }

        logger()->info('[Recovery] Recovered: '.count($results['recovered']).', Still pending: '.count($results['stillPending']));
        return $this->ok($results, 200, ['message' => 'Recovery complete. '.count($results['recovered']).' order(s) recovered.']);
    }

    // ── PUT ────────────────────────────────────────────────

    private function put(): Response
    {
        switch ($this->seg(0)) {
            case 'settings':
                return $this->saveSettings();
            case 'banners':
                return $this->saveBanners();

            case 'users':
                if ($this->seg(2) !== 'role') {
                    break;
                }
                $u = User::query()->find($this->seg(1));
                if (! $u) {
                    return $this->error('User not found', 404);
                }
                if ($u->id === $this->admin()->id) {
                    return $this->error('You cannot change your own administrator role', 400);
                }
                $u->role = $u->role === 'admin' ? 'user' : 'admin';
                $u->save();
                return $this->ok(AuthService::publicUser($u), 200, ['message' => "User role updated to {$u->role} successfully"]);

            case 'contact-messages':
                if ($this->seg(2) !== 'status') {
                    break;
                }
                $body = $this->body();
                $message = ContactMessage::query()->find($this->seg(1));
                if (! $message) {
                    return $this->error('Message not found', 404);
                }
                if (! empty($body['status'])) {
                    $message->status = Text::s($body['status']);
                }
                if (array_key_exists('notes', $body)) {
                    $message->notes = Text::s($body['notes']);
                }
                $message->save();
                return $this->ok($message->fresh()->toArray(), 200, ['message' => 'Message status updated successfully']);

            case 'groups':
                $id = $this->seg(1);
                if (! $id) {
                    return $this->error('Group ID is required', 400);
                }
                $body = $this->body();
                $group = ProductGroup::query()->find($id);
                if (! $group) {
                    return $this->error('Product Group not found', 404);
                }
                if (! empty($body['name'])) {
                    $group->name = trim(Text::s($body['name']));
                }
                if (isset($body['products']) && is_array($body['products'])) {
                    $group->productIds = self::productIds(Json::list($body['products']));
                }
                $group->save();
                ProductCatalog::clearCache();
                return $this->ok(ProductCatalog::populateGroup($group->fresh()), 200, ['message' => 'Product Group updated successfully']);
        }
        return $this->notFound();
    }

    // Saves several settings at once ({ key: value, ... }). The invoice counter never goes backwards.
    private function saveSettings(): Response
    {
        $body = Json::decode($this->request->getContent());
        if ($body instanceof \stdClass) {
            $body = [];
        }
        if (! is_array($body) || ($body && array_is_list($body))) {
            return $this->error('Invalid settings body', 400);
        }
        DB::transaction(function () use ($body) {
            foreach ($body as $key => $value) {
                $key = (string) $key;
                if ($key === 'invoice_settings') {
                    $existing = Setting::query()->where('key', $key)->lockForUpdate()->first();
                    $old = Json::obj($existing?->value);
                    $new = Json::obj($value);
                    if ($old && $value) {
                        $value = array_merge($old, $new, [
                            // Always keep the highest nextInvoiceNum to prevent duplicate serials
                            'nextInvoiceNum' => max((int) Text::num($old['nextInvoiceNum'] ?? 1) ?: 1, (int) Text::num($new['nextInvoiceNum'] ?? 1) ?: 1),
                        ]);
                    }
                }
                Settings::put($key, $value);
            }
        });
        ProductCatalog::clearCache();
        return $this->ok(Json::object(Settings::all()), 200, ['message' => 'Settings saved to database successfully']);
    }

    // Saving replaces the whole banner list (max 6)
    private function saveBanners(): Response
    {
        $body = $this->body();
        $banners = $body['banners'] ?? null;
        if (! is_array($banners) || ! array_is_list($banners)) {
            return $this->error('Invalid banners array format', 400);
        }
        // An empty list (e.g. the dashboard failed to load the banners and then saved) would delete every
        // banner, so that needs an explicit confirmation
        $withImage = array_filter($banners, fn ($b) => is_array($b) && (! empty($b['image']) || ! empty($b['mobileImage'])));
        if (! $withImage && empty($body['confirmRemoveAll'])) {
            return $this->error('No banners to save. Reload the page to load your banners first; nothing was changed.', 400);
        }

        DB::transaction(function () use ($banners) {
            $validIds = [];
            foreach (array_slice($banners, 0, 6) as $b) {
                $b = Json::arr($b);
                $id = Text::s(($b['id'] ?? null) ?: ($b['_id'] ?? null)) ?: 'banner_'.round(microtime(true) * 1000).'_'.substr(bin2hex(random_bytes(2)), 0, 4);
                $validIds[] = $id;
                $desk = Text::s($b['image'] ?? '') ?: Text::s($b['mobileImage'] ?? '');
                $mob = Text::s($b['mobileImage'] ?? '') ?: Text::s($b['image'] ?? '');
                $banner = Banner::query()->find($id) ?? new Banner(['id' => $id]);
                $banner->fill([
                    'image' => $desk,
                    'mobileImage' => $mob,
                    'title' => Text::s($b['title'] ?? '') ?: 'Daivika Banner',
                    'subtitle' => Text::s($b['subtitle'] ?? ''),
                    'description' => Text::s($b['description'] ?? ''),
                    'link' => Text::s($b['link'] ?? '') ?: '/products',
                    'buttonText' => Text::s($b['buttonText'] ?? '') ?: 'Shop Now',
                ])->save();
            }
            // Banners the admin removed
            $validIds ? Banner::query()->whereNotIn('id', $validIds)->delete() : Banner::query()->delete();
        });

        $updated = Banner::query()->orderBy('createdAt')->get()->map->toArray()->all();
        return $this->ok($updated, 200, ['message' => 'Hero banners saved to PostgreSQL successfully']);
    }

    // ── DELETE ─────────────────────────────────────────────

    private function delete(): Response
    {
        switch ($this->seg(0)) {
            case 'wipe-inventory':
                foreach (Product::query()->get(['id', 'image', 'subImages']) as $p) {
                    MediaStorage::delete($p->image);
                    foreach (Json::list($p->subImages) as $url) {
                        MediaStorage::delete($url);
                    }
                }
                foreach (Category::query()->get(['id', 'image']) as $c) {
                    MediaStorage::delete($c->image);
                }
                DB::transaction(function () {
                    Product::query()->delete();
                    Category::query()->delete();
                });
                ProductCatalog::clearCache();
                return $this->ok(null, 200, ['message' => 'Database inventory (all products & categories) wiped successfully']);

            case 'orders':
                $id = $this->seg(1);
                if ($id === 'clear-dummy' || $id === 'clear-all-dummy') {
                    DB::statement(<<<'SQL'
                        DELETE FROM "Order"
                        WHERE "id" IN ('ORD_140378', '140378', 'ord_1', 'ord_2', 'ord_3')
                           OR "email" ILIKE '%sheenaponnappan%'
                           OR "user" ILIKE '%sheena%ponnappan%'
                        SQL);
                    return $this->ok(null, 200, ['message' => 'Dummy test orders cleared successfully']);
                }
                if ($id) {
                    Order::query()->whereIn('id', [$id, "ORD_$id"])->delete();
                    return $this->ok(null, 200, ['message' => 'Order deleted successfully']);
                }
                return $this->error('Order ID required', 400);

            case 'users':
                $u = User::query()->find($this->seg(1));
                if (! $u) {
                    return $this->error('User not found', 404);
                }
                if ($u->id === $this->admin()->id) {
                    return $this->error('You cannot delete your own administrator account', 400);
                }
                if ($u->avatar) {
                    MediaStorage::delete($u->avatar);
                }
                $u->delete();
                return $this->ok(null, 200, ['message' => 'User account deleted successfully']);

            case 'contact-messages':
                $deleted = ContactMessage::query()->whereKey($this->seg(1))->delete();
                return $deleted ? $this->ok(null, 200, ['message' => 'Message deleted successfully']) : $this->error('Message not found', 404);

            case 'newsletter-subscribers':
                $deleted = Newsletter::query()->whereKey($this->seg(1))->delete();
                return $deleted ? $this->ok(null, 200, ['message' => 'Subscriber removed successfully']) : $this->error('Subscriber not found', 404);

            case 'groups':
                $id = $this->seg(1);
                if (! $id) {
                    return $this->error('Group ID is required', 400);
                }
                $deleted = ProductGroup::query()->whereKey($id)->delete();
                ProductCatalog::clearCache();
                return $deleted ? $this->ok(null, 200, ['message' => 'Product Group deleted successfully']) : $this->error('Product Group not found', 404);
        }
        return $this->notFound();
    }
}
