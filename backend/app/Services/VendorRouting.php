<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Support\Json;
use App\Support\Text;
use RuntimeException;

// Routes customer orders to the nearest vendor that has stock for every item. Distance is measured between
// district centres (IndiaDistricts). If no vendor can fulfil the whole order it stays with the main store
// (product.inventory).
class VendorRouting
{
    public const MAIN_STORE = 'Main store';

    public static function isConfirmed(array|Order|null $o): bool
    {
        if (! $o) {
            return false;
        }
        return ($o['status'] ?? null) !== 'Pending Payment' && ($o['paymentStatus'] ?? null) !== 'Pending' && ($o['status'] ?? null) !== 'Cancelled';
    }

    // Active vendors sorted nearest-first from the order's delivery district
    public static function rankVendors(array $order, bool $includeInactive = false): array
    {
        $addr = Json::arr($order['address'] ?? []);
        $from = IndiaDistricts::locate($addr['state'] ?? '', $addr['district'] ?? '');
        $ranked = [];
        foreach (VendorStore::listVendors() as $v) {
            if (! $includeInactive && ! $v['isActive']) {
                continue;
            }
            $at = IndiaDistricts::locate($v['state'], $v['district']);
            $km = ($from && $at) ? IndiaDistricts::distanceKm($from, $at) : INF;
            // Without a usable customer location, prefer vendors in the same state
            if (! $from && IndiaDistricts::findState($v['state']) && IndiaDistricts::findState($v['state']) === IndiaDistricts::findState($addr['state'] ?? '')) {
                $km = 0;
            }
            $ranked[] = ['vendor' => $v, 'distanceKm' => is_finite($km) ? (int) round($km) : null, 'sortKm' => $km];
        }
        usort($ranked, fn ($a, $b) => $a['sortKm'] <=> $b['sortKm']);
        return $ranked;
    }

    // Main store stock change for an order's items (sign -1 = take, +1 = give back)
    public static function adjustMainStock(array $items, int $sign): void
    {
        foreach ($items as $item) {
            $item = Json::arr($item);
            $product = Product::query()->find(VendorStore::itemProductId($item));
            if (! $product) {
                continue;
            }
            $inventory = Json::list($product->inventory);
            if (! $inventory) {
                continue;
            }
            $idx = 0;
            foreach ($inventory as $i => $inv) {
                $inv = Json::arr($inv);
                if (Text::lc($inv['variant'] ?? '') === Text::lc($item['size'] ?? '') && Text::lc($inv['color'] ?? '') === Text::lc($item['color'] ?? '')) {
                    $idx = $i;
                    break;
                }
            }
            $row = Json::arr($inventory[$idx]);
            $row['stock'] = max(0, Text::num($row['stock'] ?? 0) + $sign * VendorStore::itemQty($item));
            $inventory[$idx] = $row;
            $product->inventory = $inventory;
            $product->save();
        }
    }

    // Who currently holds the stock for this order
    private static function stockHolder(array $order): ?array
    {
        if (($order['stockSource'] ?? '') === 'vendor' && ! empty($order['vendorId'])) {
            return ['type' => 'vendor', 'id' => $order['vendorId']];
        }
        if (($order['stockSource'] ?? '') === 'main' || (! empty($order['isStockDecremented']) && empty($order['stockSource']))) {
            return ['type' => 'main'];
        }
        return null;
    }

    public static function rejectedVendorIds(array $order): array
    {
        $ids = [];
        foreach (Json::list($order['routingLog'] ?? []) as $e) {
            $e = Json::arr($e);
            if (! empty($e['rejectedBy'])) {
                $ids[] = $e['rejectedBy'];
            }
        }
        return $ids;
    }

    /**
     * Decides where an order goes and moves its stock there. Returns the order fields to save.
     *  target: null = nearest vendor with stock, 'main' = main store, or a vendor id
     *  exclude: vendor ids to skip (e.g. vendors that rejected the order)
     */
    public static function route(array $order, array $opts = []): array
    {
        $target = $opts['target'] ?? null;
        $actor = $opts['actor'] ?? 'system';
        $note = $opts['note'] ?? '';
        $rejectedBy = $opts['rejectedBy'] ?? null;
        $items = Json::list($order['itemsList'] ?? []);
        $settings = VendorStore::settings();
        $skip = array_flip(array_merge($opts['exclude'] ?? [], self::rejectedVendorIds($order), $rejectedBy ? [$rejectedBy] : []));
        $chosen = null;

        if ($target && $target !== 'main') {
            $vendor = VendorStore::getVendor($target);
            if (! $vendor) {
                throw new RuntimeException('Vendor not found');
            }
            foreach (self::rankVendors($order, true) as $r) {
                if ($r['vendor']['id'] === $vendor['id']) {
                    $chosen = $r;
                    break;
                }
            }
            $chosen ??= ['vendor' => $vendor, 'distanceKm' => null];
        } elseif (! $target) {
            $maxKm = (int) Text::num($settings['maxDistanceKm'] ?? 0);
            foreach (self::rankVendors($order) as $r) {
                if (isset($skip[$r['vendor']['id']])) {
                    continue;
                }
                if ($maxKm > 0 && ($r['distanceKm'] === null || $r['distanceKm'] > $maxKm)) {
                    continue;
                }
                if (VendorStore::canFulfil(VendorStore::listStock($r['vendor']['id']), $items)) {
                    $chosen = $r;
                    break;
                }
            }
        }

        // Move stock from the current holder to the new one
        $holder = self::stockHolder($order);
        $sameVendor = ($holder['type'] ?? null) === 'vendor' && $chosen && $holder['id'] === $chosen['vendor']['id'];
        if (! $sameVendor) {
            if (($holder['type'] ?? null) === 'vendor') {
                VendorStore::adjustForItems($holder['id'], $items, +1);
            }
            if (($holder['type'] ?? null) === 'main' && $chosen) {
                self::adjustMainStock($items, +1);
            }
            if ($chosen) {
                VendorStore::adjustForItems($chosen['vendor']['id'], $items, -1);
            } elseif (($holder['type'] ?? null) !== 'main') {
                self::adjustMainStock($items, -1);
            }
        }

        $name = $chosen ? ($chosen['vendor']['businessName'] ?: $chosen['vendor']['name']) : '';
        $log = Json::list($order['routingLog'] ?? []);
        if ($rejectedBy) {
            $log[] = ['at' => Text::nowIso(), 'actor' => $actor, 'rejectedBy' => $rejectedBy, 'vendorName' => $order['vendorName'] ?? '', 'note' => $note];
        }
        $log[] = [
            'at' => Text::nowIso(),
            'actor' => $actor,
            'to' => $chosen ? $name : self::MAIN_STORE,
            'vendorId' => $chosen ? $chosen['vendor']['id'] : null,
            'distanceKm' => $chosen ? $chosen['distanceKm'] : null,
            'note' => $rejectedBy ? 'Re-routed after rejection' : $note,
        ];

        return [
            'vendorId' => $chosen ? $chosen['vendor']['id'] : null,
            'vendorName' => $name,
            'vendorStatus' => $chosen ? 'Assigned' : self::MAIN_STORE,
            'stockSource' => $chosen ? 'vendor' : 'main',
            'isStockDecremented' => true,
            'routingLog' => $log,
        ];
    }

    // ── Orders ─────────────────────────────────────────────

    // Every order, newest first, as API arrays
    public static function listAllOrders(): array
    {
        return Order::query()->orderByDesc('createdAt')->get()->map->toArray()->all();
    }

    public static function getOrder(?string $id): ?Order
    {
        if ($id === null || $id === '') {
            return null;
        }
        return Order::query()->find($id);
    }

    public static function saveOrderPatch(string $id, array $patch): ?array
    {
        $order = Order::query()->find($id);
        if (! $order) {
            return null;
        }
        $order->fillColumns($patch)->save();
        return $order->fresh()->toArray();
    }

    // Whether a new order should be routed by the vendor system right now
    public static function shouldAutoRoute(array $order): bool
    {
        if (! self::isConfirmed($order) || ! empty($order['vendorStatus'])) {
            return false;
        }
        if (! empty($order['status']) && $order['status'] !== 'Processing') {
            return false;
        }
        $settings = VendorStore::settings();
        if (empty($settings['enabled']) || empty($settings['enabledAt'])) {
            return false;
        }
        $created = strtotime((string) ($order['createdAt'] ?? 'now')) ?: time();
        return $created >= (strtotime((string) $settings['enabledAt']) ?: PHP_INT_MAX);
    }

    // Routes confirmed orders that arrived through other paths (payment webhooks etc.) and haven't been
    // routed yet. Safe to call repeatedly.
    public static function routeUnassigned(): int
    {
        $count = 0;
        try {
            if (empty(VendorStore::settings()['enabled'])) {
                return 0;
            }
            $candidates = Order::query()->where('status', 'Processing')->where('vendorStatus', '')->get();
            foreach ($candidates as $o) {
                $data = $o->toArray();
                if (! self::shouldAutoRoute($data)) {
                    continue;
                }
                // Claim the order so two requests can't route it at the same time
                $claimed = Order::query()->where('id', $o->id)->where('vendorStatus', '')->update(['vendorStatus' => 'Routing']);
                if ($claimed !== 1) {
                    continue;
                }
                try {
                    self::saveOrderPatch($o->id, self::route($data));
                    $count++;
                } catch (\Throwable $e) {
                    Order::query()->where('id', $o->id)->where('vendorStatus', 'Routing')->update(['vendorStatus' => '']);
                    throw $e;
                }
            }
        } catch (\Throwable $e) {
            logger()->error('[vendor-routing] routeUnassignedOrders failed: '.$e->getMessage());
        }
        return $count;
    }
}
