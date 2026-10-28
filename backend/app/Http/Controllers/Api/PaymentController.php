<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Services\AdminNotifier;
use App\Services\OrderPayment;
use App\Services\VendorRouting;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

// POST /api/payment/create-order   { orderId }  -> Razorpay order for the amount due on our pending order
// POST /api/payment/verify         { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// POST /api/payment/webhook        Razorpay webhook (payment.captured)
// POST /api/payment/cashfree-verify, /api/payment/cashfree-webhook   (legacy Cashfree return / webhook)
//
// An order is only ever marked paid by OrderPayment::confirm() after the provider has been verified here.
class PaymentController extends ApiController
{
    protected function handle(string $method): Response
    {
        if ($method !== 'POST') {
            return $this->notFound();
        }
        return match ($this->seg(0)) {
            'create-order' => $this->createOrder(),
            'verify' => $this->verify(),
            'webhook', 'razorpay-webhook' => $this->razorpayWebhook(),
            'cashfree-verify' => $this->cashfreeVerify(),
            'cashfree-webhook' => $this->cashfreeWebhook(),
            default => $this->notFound(),
        };
    }

    private static function safeEqual(mixed $a, mixed $b): bool
    {
        $a = Text::s($a);
        $b = Text::s($b);
        return $a !== '' && strlen($a) === strlen($b) && hash_equals($a, $b);
    }

    private static function cashfree(): array
    {
        return [
            'appId' => (string) config('daivika.cashfree.app_id'),
            'secretKey' => (string) config('daivika.cashfree.secret_key'),
            'base' => config('daivika.cashfree.env') === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders',
        ];
    }

    // Razorpay order for a pending order. The amount comes from the order saved on the server.
    private function createOrder(): Response
    {
        try {
            $orderId = Text::s($this->body()['orderId'] ?? '');
            $keyId = (string) config('daivika.razorpay.key_id');
            $keySecret = (string) config('daivika.razorpay.key_secret');
            if ($keyId === '' || $keySecret === '') {
                return $this->error('Online payment is not configured. Please contact the store.', 503);
            }
            if ($orderId === '') {
                return $this->error('Order ID is required', 400);
            }
            $order = Order::query()->find($orderId);
            if (! $order) {
                return $this->error('Order not found', 404);
            }
            if ($order->status !== 'Pending Payment' || $order->paymentStatus !== 'Pending') {
                return $this->error('This order has already been paid', 409);
            }
            $amountDue = OrderPayment::amountDue($order);
            if (! ($amountDue > 0)) {
                return $this->error('Nothing to pay for this order', 400);
            }

            $res = Http::withBasicAuth($keyId, $keySecret)->timeout(30)->post('https://api.razorpay.com/v1/orders', [
                'amount' => (int) round($amountDue * 100),
                'currency' => 'INR',
                'receipt' => substr($order->id, 0, 40),
                'payment_capture' => 1,
                'notes' => ['orderId' => $order->id],
            ]);
            if (! $res->successful() || ! $res->json('id')) {
                logger()->error('Razorpay Order Creation Error: '.$res->body());
                return $this->error('Could not start the payment. Please try again.', 502);
            }
            $rzpOrder = $res->json();
            // Until payment, this field holds the Razorpay order id; verify() checks the signature against it
            VendorRouting::saveOrderPatch($order->id, ['razorpay_payment_id' => $rzpOrder['id']]);
            return $this->ok($rzpOrder + ['keyId' => $keyId], 200, ['order' => $rzpOrder, 'keyId' => $keyId]);
        } catch (\Throwable $e) {
            logger()->error('Razorpay Order Creation Error: '.$e->getMessage());
            return $this->error('Could not start the payment. Please try again.', 502);
        }
    }

    // Checkout handler response: the signature proves Razorpay order <-> payment, and the Razorpay order was
    // created by us for this order's amount, so the amount is guaranteed.
    private function verify(): Response
    {
        try {
            $body = $this->body();
            $orderId = Text::s($body['orderId'] ?? '');
            $rzpOrderId = Text::s($body['razorpay_order_id'] ?? '');
            $paymentId = Text::s($body['razorpay_payment_id'] ?? '');
            $signature = Text::s($body['razorpay_signature'] ?? '');
            $keySecret = (string) config('daivika.razorpay.key_secret');
            if ($keySecret === '') {
                return $this->error('Online payment is not configured on the server', 503);
            }
            if ($orderId === '' || $rzpOrderId === '' || $paymentId === '' || $signature === '') {
                return $this->error('Incomplete payment details', 400);
            }
            $expected = hash_hmac('sha256', "$rzpOrderId|$paymentId", $keySecret);
            if (! self::safeEqual($expected, $signature)) {
                return $this->error('Invalid payment signature', 400);
            }

            $order = Order::query()->find($orderId);
            if (! $order) {
                return $this->error('Order not found', 404);
            }
            $alreadyPaidWithThis = $order->razorpay_payment_id === $paymentId;
            if ($order->razorpay_payment_id !== $rzpOrderId && ! $alreadyPaidWithThis) {
                return $this->error('Payment does not belong to this order', 400);
            }

            $result = OrderPayment::confirm($order->id, $paymentId, OrderPayment::amountDue($order), 'Razorpay');
            return $this->ok($result['order'], 200, ['message' => 'Payment verified successfully']);
        } catch (\Throwable $e) {
            logger()->error('Payment Verification Error: '.$e->getMessage());
            return $this->error($e->getMessage() ?: 'Payment verification failed', 400);
        }
    }

    // Razorpay webhook: confirms orders even when the customer closes the browser after paying
    private function razorpayWebhook(): Response
    {
        try {
            $secret = (string) config('daivika.razorpay.webhook_secret');
            if ($secret === '') {
                return $this->error('Razorpay webhook secret not configured', 500);
            }
            $raw = $this->request->getContent();
            $expected = hash_hmac('sha256', $raw, $secret);
            if (! self::safeEqual($expected, $this->request->header('x-razorpay-signature'))) {
                return $this->error('Invalid signature', 400);
            }

            $payload = Json::arr(Json::decode($raw, []));
            if (($payload['event'] ?? '') !== 'payment.captured') {
                return $this->ok(['message' => 'Event ignored']);
            }
            $payment = Json::arr($payload['payload']['payment']['entity'] ?? []);
            $notes = Json::arr($payment['notes'] ?? []);
            $order = ! empty($notes['orderId']) ? Order::query()->find(Text::s($notes['orderId'])) : null;
            if (! $order && ! empty($payment['order_id'])) {
                $order = Order::query()->whereIn('razorpay_payment_id', array_filter([Text::s($payment['order_id']), Text::s($payment['id'] ?? '')]))->first();
            }
            if (! $order) {
                logger()->warning('[Razorpay webhook] captured payment without a matching order: '.($payment['id'] ?? ''));
                AdminNotifier::notify(
                    'Payment without order ⚠️',
                    'Razorpay payment '.($payment['id'] ?? '').' (₹'.OrderPayment::money(Text::num($payment['amount'] ?? 0) / 100).') has no matching order. Check the Razorpay dashboard.',
                    'system',
                    '/admin/dashboard?tab=orders'
                );
                return $this->ok(['message' => 'No matching order']);
            }

            try {
                OrderPayment::confirm($order->id, Text::s($payment['id'] ?? ''), Text::num($payment['amount'] ?? 0) / 100, 'Razorpay');
            } catch (\Throwable $e) {
                // Permanent problems (amount mismatch, cancelled order) are reported to the admin; don't make Razorpay retry
                logger()->warning('[Razorpay webhook] not confirmed: '.$e->getMessage());
                return $this->ok(['message' => $e->getMessage()]);
            }
            return $this->ok(['message' => 'Webhook processed']);
        } catch (\Throwable $e) {
            report($e);
            return $this->error('Webhook processing failed', 500);
        }
    }

    // Cashfree return page: ask Cashfree directly whether our order was paid
    private function cashfreeVerify(): Response
    {
        try {
            $orderId = Text::s($this->body()['orderId'] ?? '');
            if ($orderId === '') {
                return $this->error('Missing orderId', 400);
            }
            $cf = self::cashfree();
            if ($cf['appId'] === '' || $cf['secretKey'] === '') {
                return $this->error('Cashfree is not configured', 503);
            }
            $order = Order::query()->find($orderId);
            if (! $order) {
                return $this->error('Order not found', 404);
            }
            $res = Http::timeout(20)->withHeaders(['x-api-version' => '2023-08-01', 'x-client-id' => $cf['appId'], 'x-client-secret' => $cf['secretKey']])
                ->get($cf['base'].'/'.rawurlencode($orderId));
            $data = $res->json() ?? [];
            if (! $res->successful() || ! in_array($data['order_status'] ?? '', ['PAID', 'SUCCESS'], true)) {
                return $this->error(($data['message'] ?? '') ?: 'Payment is pending or failed', 400);
            }
            $result = OrderPayment::confirm($order->id, Text::s($data['cf_order_id'] ?? ''), (float) Text::num($data['order_amount'] ?? 0), 'Cashfree Online');
            return $this->ok($result['order'], 200, ['message' => 'Cashfree payment verified']);
        } catch (\Throwable $e) {
            logger()->error('Cashfree Verify Exception: '.$e->getMessage());
            return $this->error($e->getMessage() ?: 'Error verifying Cashfree payment', 400);
        }
    }

    // Cashfree webhook: only trusted with a valid signature
    private function cashfreeWebhook(): Response
    {
        try {
            $timestamp = (string) $this->request->header('x-webhook-timestamp', '');
            $signature = (string) $this->request->header('x-webhook-signature', '');
            $secret = self::cashfree()['secretKey'];
            $raw = $this->request->getContent();
            if ($secret === '' || $timestamp === '' || $signature === '') {
                return $this->error('Unauthorized webhook', 401);
            }
            $expected = base64_encode(hash_hmac('sha256', $timestamp.$raw, $secret, true));
            if (! self::safeEqual($expected, $signature)) {
                return $this->error('Invalid signature', 401);
            }

            $event = Json::arr(Json::decode($raw, []));
            $orderId = $event['data']['order']['order_id'] ?? null;
            $payment = Json::arr($event['data']['payment'] ?? []);
            if ($orderId && ($payment['payment_status'] ?? '') === 'SUCCESS') {
                $order = Order::query()->find(Text::s($orderId));
                if ($order) {
                    OrderPayment::confirm($order->id, Text::s($payment['cf_payment_id'] ?? ''), (float) Text::num($payment['payment_amount'] ?? 0), 'Cashfree Online');
                }
            }
            return $this->ok(['status' => 'OK']);
        } catch (\Throwable $e) {
            logger()->error('Cashfree Webhook Error: '.$e->getMessage());
            return $this->error('Webhook processing failed', 500);
        }
    }
}
