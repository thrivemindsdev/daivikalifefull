<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Product;
use App\Models\StockNotification;
use App\Support\Json;
use App\Support\Text;

// Back-in-stock reminders: runs after any request that changed stock and tells the customers waiting for a
// variant that now has stock. SMS needs its own DLT template (DLT_RESTOCK_TEMPLATE_*); logged-in customers also
// get a dashboard notification and web push. A request nothing could be delivered for stays pending.
class RestockAlerts
{
    private static bool $scheduled = false;

    public static function schedule(): void
    {
        if (self::$scheduled) {
            return;
        }
        self::$scheduled = true;
        app()->terminating(function () {
            self::$scheduled = false;
            try {
                self::run();
            } catch (\Throwable $e) {
                logger()->error('[restock] failed: '.$e->getMessage());
            }
        });
    }

    public static function run(): void
    {
        $pending = StockNotification::query()->where('status', 'pending')->limit(500)->get();
        if ($pending->isEmpty()) {
            return;
        }
        $totals = VendorStore::stockTotals();
        $products = [];
        foreach (Product::query()->whereIn('id', $pending->pluck('productId')->unique()->all())->get() as $p) {
            $products[$p->id] = VendorStore::withVendorStock($p->toArray(), $totals);
        }
        foreach ($pending as $request) {
            $product = $products[$request->productId] ?? null;
            if (! $product) {
                $request->delete();
                continue;
            }
            if (self::available($product, $request->variant, $request->color) && self::deliver($request, $product)) {
                $request->status = 'sent';
                $request->notifiedAt = now();
                $request->save();
            }
        }
    }

    private static function available(array $product, string $variant, string $color): bool
    {
        $inventory = Json::list($product['inventory'] ?? []);
        $want = VendorStore::stockKey($variant, $color);
        foreach ($inventory as $inv) {
            $inv = Json::arr($inv);
            if (VendorStore::stockKey($inv['variant'] ?? '', $inv['color'] ?? '') === $want) {
                return Text::num($inv['stock'] ?? 0) > 0;
            }
        }
        return count($inventory) === 1 && Text::num(Json::arr($inventory[0])['stock'] ?? 0) > 0;
    }

    private static function deliver(StockNotification $request, array $product): bool
    {
        $name = Text::s($product['name'] ?? 'Your product');

        // DLT template variables are limited to 30 characters
        $delivered = SmsOtp::sendTemplate($request->phone, (string) config('daivika.sms.restock_template_id'), (string) config('daivika.sms.restock_template_text'), mb_substr($name, 0, 30))['ok'];

        if ($request->userId) {
            $title = 'Back in stock 🎉';
            $message = "$name is available again. Order before it sells out.";
            $link = '/product/'.$request->productId;
            try {
                Notification::query()->create(['targetUserId' => $request->userId, 'title' => $title, 'message' => $message, 'type' => 'general', 'link' => $link, 'isRead' => false]);
                $delivered = true;
                if (WebPushService::configured()) {
                    WebPushService::send($request->userId, $title, $message, $link);
                }
            } catch (\Throwable $e) {
                logger()->warning('[restock] notification failed: '.$e->getMessage());
            }
        }
        return $delivered;
    }
}
