<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// The single place where an order becomes paid. Called only after the payment provider has been verified
// on the server (Razorpay signature / webhook, Cashfree API / webhook) — never because the browser said so.
class OrderPayment
{
    private const CLAIM = 'Verifying';

    public const DEFAULT_COMPANY = [
        'companyName' => 'DAIVIKA Store',
        'companyLogo' => '',
        'companyStreet' => 'Kuriyedam, Ayikkarapadi',
        'companyCity' => 'Malappuram',
        'companyState' => 'Kerala',
        'companyPin' => '673637',
        'companyEmail' => 'support@daivika.in',
        'companyPhone' => '+91 75108 21228',
        'invoicePrefix' => 'SPO',
        'nextInvoiceNum' => 1,
    ];

    // Next invoice number from the admin's invoice settings (also returns the company block printed on invoices).
    // The settings row is locked while the number is taken, so two payments can't get the same number.
    public static function takeInvoiceNumber(): array
    {
        return DB::transaction(function () {
            $row = Setting::query()->where('key', 'invoice_settings')->lockForUpdate()->first();
            $settings = array_merge(self::DEFAULT_COMPANY, Json::obj($row?->value));
            $serial = (int) Text::num($settings['nextInvoiceNum']) ?: 1;
            $prefix = Text::s($settings['invoicePrefix']) ?: 'SPO';
            $invoiceNumber = $prefix.str_pad((string) $serial, 6, '0', STR_PAD_LEFT);
            $next = array_merge($settings, ['nextInvoiceNum' => $serial + 1]);
            if ($row) {
                $row->value = $next;
                $row->save();
            } else {
                Setting::query()->create(['key' => 'invoice_settings', 'value' => $next]);
            }
            unset($settings['invoicePrefix'], $settings['nextInvoiceNum']);
            return ['invoiceNumber' => $invoiceNumber, 'company' => $settings];
        });
    }

    // Atomically moves a pending order into the "Verifying" state so two confirmations can't both run
    private static function claim(string $orderId): bool
    {
        return Order::query()->where('id', $orderId)->where('paymentStatus', 'Pending')->update(['paymentStatus' => self::CLAIM]) === 1;
    }

    private static function release(string $orderId): void
    {
        Order::query()->where('id', $orderId)->where('paymentStatus', self::CLAIM)->update(['paymentStatus' => 'Pending']);
    }

    public static function amountDue(array|Order $order): float
    {
        return (float) Text::num(! empty($order['isPartialCod']) ? $order['advanceAmount'] : ($order['advanceAmount'] ?: $order['total']));
    }

    /**
     * Marks an order as paid after a verified payment.
     *  amountPaid: rupees actually received for this order (checked against the server-computed amount due)
     *  gateway:    label shown as the payment method for full online payments
     * Returns ['order' => array, 'alreadyConfirmed' => bool]. Throws if the order is missing or the amount is short.
     */
    public static function confirm(string $orderId, ?string $paymentId, float $amountPaid, string $gateway = 'Razorpay'): array
    {
        $order = Order::query()->find($orderId);
        if (! $order) {
            throw new RuntimeException('Order not found');
        }
        if (VendorRouting::isConfirmed($order) && $order->paymentStatus !== self::CLAIM) {
            return ['order' => $order->toArray(), 'alreadyConfirmed' => true];
        }
        if ($order->status === 'Cancelled') {
            throw new RuntimeException('This order was cancelled');
        }

        $due = self::amountDue($order);
        if (! ($amountPaid + 0.5 >= $due)) {
            AdminNotifier::notify(
                'Payment amount mismatch ⚠️',
                "Order $orderId: received ₹".self::money($amountPaid).' but ₹'.self::money($due).' was due. The order was not confirmed.',
                'system',
                '/admin/dashboard?tab=orders'
            );
            throw new RuntimeException('Payment amount does not match the order');
        }

        if (! self::claim($orderId)) {
            // Another request is confirming (or already confirmed) this order
            $current = Order::query()->find($orderId);
            return ['order' => $current?->toArray(), 'alreadyConfirmed' => VendorRouting::isConfirmed($current)];
        }

        try {
            if ($order->invoiceNumber) {
                $invoiceNumber = $order->invoiceNumber;
                $company = Json::obj($order->companyDetails);
            } else {
                ['invoiceNumber' => $invoiceNumber, 'company' => $company] = self::takeInvoiceNumber();
            }
            $paymentStatus = $order->isPartialCod ? 'Partially Paid' : 'Paid';
            $patch = [
                'status' => 'Processing',
                'paymentStatus' => $paymentStatus,
                'paymentMethod' => $order->isPartialCod ? 'Cash on Delivery' : $gateway,
                'razorpay_payment_id' => $paymentId ?: ($order->razorpay_payment_id ?: ''),
                'invoiceNumber' => $invoiceNumber,
                'companyDetails' => array_merge(Json::obj($order->companyDetails), $company),
            ];

            $candidate = array_merge($order->toArray(), $patch);
            $routed = false;
            try {
                if (VendorRouting::shouldAutoRoute($candidate)) {
                    $patch = array_merge($patch, VendorRouting::route($candidate));
                    $routed = true;
                }
            } catch (\Throwable $e) {
                logger()->error('[order-payment] vendor routing failed, using main store: '.$e->getMessage());
            }
            if (! $routed && ! $order->isStockDecremented) {
                VendorRouting::adjustMainStock(Json::list($order->itemsList), -1);
                $patch['isStockDecremented'] = true;
                $patch['stockSource'] = 'main';
            }

            $saved = VendorRouting::saveOrderPatch($orderId, $patch);

            AdminNotifier::notify(
                'New Order Received 🛍️',
                ($order->user ?: 'A customer').' placed an order of ₹'.self::money($order->total)." ($paymentStatus).",
                'new_order',
                '/admin/dashboard?tab=orders'
            );

            return ['order' => $saved, 'alreadyConfirmed' => false];
        } catch (\Throwable $e) {
            self::release($orderId);
            throw $e;
        }
    }

    // What the storefront may see about an order it does not own (no address / phone / email)
    public static function publicView(Order|array $o): array
    {
        return [
            '_id' => (string) ($o['id'] ?? ''),
            'status' => $o['status'],
            'paymentStatus' => $o['paymentStatus'],
            'invoiceNumber' => $o['invoiceNumber'] ?: '',
            'total' => $o['total'],
            'advanceAmount' => $o['advanceAmount'],
            'remainingAmount' => $o['remainingAmount'],
        ];
    }

    // 1234.5 -> "1234.5", 500.0 -> "500" (how JavaScript prints numbers)
    public static function money(float|int|string|null $n): string
    {
        $n = (float) $n;
        return floor($n) === $n ? (string) (int) $n : rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }
}
