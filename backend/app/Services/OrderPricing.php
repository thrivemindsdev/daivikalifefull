<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductGroup;
use App\Support\Json;
use App\Support\Text;

// Server-side order pricing. Mirrors the checkout page's rules so the amount a customer pays is always
// computed from database prices and admin settings, never from values sent by the browser.
class OrderPricing
{
    // Defaults used by the checkout page when the admin has not saved these settings
    public const DEFAULT_COUPONS = [
        ['code' => 'Daivika10', 'discountType' => 'percentage', 'discountValue' => 10, 'minPurchase' => 500, 'usageLimit' => 1],
        ['code' => 'KERALA500', 'discountType' => 'fixed', 'discountValue' => 500, 'minPurchase' => 2000, 'usageLimit' => 2],
        ['code' => 'FIRSTBUY', 'discountType' => 'percentage', 'discountValue' => 20, 'minPurchase' => 1000, 'usageLimit' => 3],
    ];

    public const DEFAULT_SHIPPING_ZONES = [
        ['id' => 'zone_1', 'name' => 'South India Logistics', 'rate' => 75, 'states' => ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Lakshadweep'], 'rules' => []],
        ['id' => 'zone_2', 'name' => 'North India Express', 'rate' => 150, 'states' => ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Himachal Pradesh', 'Jammu and Kashmir', 'Uttarakhand', 'Ladakh', 'Chandigarh'], 'rules' => []],
        ['id' => 'zone_3', 'name' => 'Middle India Cargo', 'rate' => 120, 'states' => ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Goa', 'Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Manipur', 'Nagaland', 'Tripura', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu'], 'rules' => []],
    ];

    private const DEFAULT_FREE_SHIPPING = 600;
    private const DEFAULT_COD_PERCENT = 30;
    private const NO_ZONE_RATE = 100;
    private const STANDARD_COUPON_CATEGORIES = ['welcome', 'referral', 'festival', 'other'];
    private const MAX_QTY_PER_LINE = 100;

    public static function storeSettings(): array
    {
        $map = [];
        try {
            $map = Settings::all();
        } catch (\Throwable $e) {
            logger()->warning('[order-pricing] settings lookup failed: '.$e->getMessage());
        }
        $cod = Json::arr($map['cod_settings'] ?? []);
        return [
            'coupons' => isset($map['coupons']) && is_array($map['coupons']) && array_is_list($map['coupons']) ? $map['coupons'] : self::DEFAULT_COUPONS,
            'couponsEnabled' => array_key_exists('coupons_enabled', $map) ? (bool) $map['coupons_enabled'] : true,
            'shippingZones' => isset($map['shipping_zones']) && is_array($map['shipping_zones']) && array_is_list($map['shipping_zones']) ? $map['shipping_zones'] : self::DEFAULT_SHIPPING_ZONES,
            'freeShippingThreshold' => array_key_exists('free_shipping_threshold', $map) ? Text::num($map['free_shipping_threshold']) : self::DEFAULT_FREE_SHIPPING,
            'codPercent' => array_key_exists('advancePercent', $cod) ? Text::num($cod['advancePercent']) : self::DEFAULT_COD_PERCENT,
            'codEnabled' => ($cod['enabled'] ?? true) !== false,
            'freeGift' => isset($map['free_gift_settings']) ? Json::arr($map['free_gift_settings']) : null,
        ];
    }

    private static function stockKey(mixed $variant, mixed $color): string
    {
        return Text::lc($variant).'|'.Text::lc($color);
    }

    // [id => product array (with vendor stock)] for the given ids
    private static function loadProducts(array $ids): array
    {
        $ids = array_values(array_unique(array_map('strval', $ids)));
        $totals = [];
        try {
            $totals = VendorStore::stockTotals();
        } catch (\Throwable) {
        }
        $map = [];
        foreach (Product::query()->whereIn('id', $ids)->get() as $p) {
            $map[$p->id] = VendorStore::withVendorStock($p->toArray(), $totals);
        }
        return $map;
    }

    // [productId => groupId] for products in a product group (bulk pricing counts the whole group)
    private static function groupMap(): array
    {
        $map = [];
        try {
            foreach (ProductGroup::query()->get() as $g) {
                foreach (Json::list($g->productIds) as $p) {
                    $id = is_array($p) ? ($p['_id'] ?? ($p['id'] ?? null)) : $p;
                    if ($id) {
                        $map[(string) $id] = (string) $g->id;
                    }
                }
            }
        } catch (\Throwable) {
        }
        return $map;
    }

    private static function findShippingRule(array $rules, mixed $collection, mixed $category): ?array
    {
        $c = Text::lc($collection);
        $k = Text::lc($category);
        $tests = [
            fn ($r) => Text::lc($r['collection'] ?? '') === $c && Text::lc($r['category'] ?? '') === $k,
            fn ($r) => Text::lc($r['collection'] ?? '') === 'all' && Text::lc($r['category'] ?? '') === $k,
            fn ($r) => Text::lc($r['collection'] ?? '') === $c && Text::lc($r['category'] ?? '') === 'all',
            fn ($r) => Text::lc($r['collection'] ?? '') === 'all' && Text::lc($r['category'] ?? '') === 'all',
        ];
        foreach ($tests as $test) {
            foreach ($rules as $r) {
                $r = Json::arr($r);
                if ($test($r)) {
                    return $r;
                }
            }
        }
        return null;
    }

    private static function couponUsageCount(string $code, string $phone, string $excludeOrderId): int
    {
        $p = Text::phoneKey($phone);
        if ($p === '') {
            return 0;
        }
        $count = 0;
        $orders = Order::query()->whereRaw('LOWER("couponCode") = ?', [mb_strtolower(trim($code))])->get();
        foreach ($orders as $o) {
            if (VendorRouting::isConfirmed($o) && $o->id !== $excludeOrderId && Text::phoneKey($o->phone) === $p) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Prices an order from database products and admin settings.
     *  items: [['productId', 'qty', 'size', 'color', 'isFreeGift', 'image', 'name']]
     * Throws PricingError for anything the customer must fix (unknown product, out of stock, bad coupon).
     */
    public static function price(array $items, string $state, string $couponCode, string $phone, bool $isCod = false, string $orderId = ''): array
    {
        if (! $items) {
            throw new PricingError('Your cart is empty');
        }
        if (trim($state) === '') {
            throw new PricingError('Delivery state is required');
        }

        $settings = self::storeSettings();
        $paid = array_values(array_filter($items, fn ($it) => empty($it['isFreeGift'])));
        if (! $paid) {
            throw new PricingError('Your cart is empty');
        }

        foreach ($items as $it) {
            $q = $it['qty'];
            if (! self::isWholeNumber($q) || (int) $q < 1 || (int) $q > self::MAX_QTY_PER_LINE) {
                throw new PricingError('Invalid quantity for '.(($it['name'] ?? '') !== '' ? $it['name'] : 'an item'));
            }
            if (($it['productId'] ?? '') === '') {
                throw new PricingError('An item in your cart is missing its product');
            }
        }

        $products = self::loadProducts(array_column($items, 'productId'));
        $groupOf = self::groupMap();

        // Quantities per product (or product group) and variant decide bulk pricing
        $variantOf = function (array $product, string $size): ?array {
            foreach (Json::list($product['variants'] ?? []) as $v) {
                $v = Json::arr($v);
                if (Text::lc($v['name'] ?? '') === Text::lc($size)) {
                    return $v;
                }
            }
            return null;
        };
        $bulkKey = fn (string $pid, string $size) => (isset($groupOf[$pid]) ? 'group_'.$groupOf[$pid] : "prod_$pid").'_'.Text::lc($size);
        $bulkQty = [];
        foreach ($paid as $it) {
            $key = $bulkKey($it['productId'], $it['size']);
            $bulkQty[$key] = ($bulkQty[$key] ?? 0) + (int) $it['qty'];
        }

        $need = [];
        $lines = [];
        $subtotal = 0;
        foreach ($paid as $it) {
            $pid = $it['productId'];
            $product = $products[$pid] ?? null;
            if (! $product) {
                throw new PricingError((($it['name'] ?? '') !== '' ? $it['name'] : 'A product').' is no longer available', 'product_unavailable', $pid);
            }
            $qty = (int) $it['qty'];
            $variant = $it['size'] !== '' ? $variantOf($product, $it['size']) : null;
            if ($it['size'] !== '' && Json::list($product['variants'] ?? []) && ! $variant) {
                throw new PricingError("The option \"{$it['size']}\" of {$product['name']} is no longer available", 'product_unavailable', $pid);
            }
            $base = $variant && Text::num($variant['price'] ?? 0) > 0 ? Text::num($variant['price']) : Text::num($product['price'] ?? 0);
            $src = $variant ?? $product;
            $minQ = Text::num($src['bulkMinQty'] ?? 0);
            $bulk = Text::num($src['bulkPrice'] ?? 0);
            $price = ($minQ > 0 && $bulk > 0 && $bulkQty[$bulkKey($pid, $it['size'])] >= $minQ) ? $bulk : $base;
            if (! ($price > 0)) {
                throw new PricingError("{$product['name']} has no valid price", 'product_unavailable');
            }

            $k = $pid.'::'.self::stockKey($it['size'], $it['color']);
            $need[$k] = ['product' => $product, 'size' => $it['size'], 'color' => $it['color'], 'qty' => ($need[$k]['qty'] ?? 0) + $qty];

            $subtotal += $price * $qty;
            $lines[] = [
                'productId' => $pid,
                'name' => $product['name'],
                'qty' => $qty,
                'price' => $price,
                'image' => $it['image'] !== '' ? $it['image'] : ($product['image'] ?? ''),
                'size' => $it['size'],
                'color' => $it['color'],
                'isFreeGift' => false,
                'category' => $product['category'] ?? '',
                'gender' => $product['gender'] ?? '',
            ];
        }

        foreach ($need as $n) {
            foreach (Json::list($n['product']['inventory'] ?? []) as $inv) {
                $inv = Json::arr($inv);
                if (self::stockKey($inv['variant'] ?? '', $inv['color'] ?? '') === self::stockKey($n['size'], $n['color'])) {
                    $stock = Text::num($inv['stock'] ?? 0);
                    if ($stock < $n['qty']) {
                        throw new PricingError($stock > 0 ? "Only $stock of {$n['product']['name']} left in stock" : "{$n['product']['name']} is out of stock", 'out_of_stock');
                    }
                    break;
                }
            }
        }

        // Free gift: only the configured gift product, once, when the cart qualifies
        $gift = $settings['freeGift'];
        $giftItem = null;
        foreach ($items as $it) {
            if (! empty($it['isFreeGift'])) {
                $giftItem = $it;
                break;
            }
        }
        if ($giftItem && $gift && ! empty($gift['enabled']) && $giftItem['productId'] === Text::s($gift['giftProductId'] ?? '')) {
            $eligible = array_map(fn ($x) => Text::s($x), Json::list($gift['eligibleProductIds'] ?? []));
            $qualifies = $subtotal >= Text::num($gift['minimumSpend'] ?? 0)
                && (! $eligible || (bool) array_filter($paid, fn ($it) => in_array($it['productId'], $eligible, true)));
            $giftProduct = self::loadProducts([$giftItem['productId']])[$giftItem['productId']] ?? null;
            if ($qualifies && $giftProduct) {
                $lines[] = [
                    'productId' => $giftItem['productId'],
                    'name' => $giftProduct['name'].' (Free Gift 🎁)',
                    'qty' => 1,
                    'price' => 0,
                    'image' => $giftItem['image'] !== '' ? $giftItem['image'] : ($giftProduct['image'] ?? ''),
                    'size' => 'Standard',
                    'color' => 'Default',
                    'isFreeGift' => true,
                ];
            }
        }

        // Coupon
        $discount = 0;
        $appliedCoupon = '';
        if (trim($couponCode) !== '') {
            if (! $settings['couponsEnabled']) {
                throw new PricingError('Coupons are currently disabled', 'coupon_invalid');
            }
            $coupon = null;
            foreach ($settings['coupons'] as $c) {
                $c = Json::arr($c);
                if (! empty($c['code']) && Text::lc($c['code']) === Text::lc($couponCode)) {
                    $coupon = $c;
                    break;
                }
            }
            if (! $coupon) {
                throw new PricingError('Invalid coupon code', 'coupon_invalid');
            }
            $minPurchase = Text::num($coupon['minPurchase'] ?? 0);
            if ($subtotal < $minPurchase) {
                throw new PricingError("Minimum purchase of ₹$minPurchase required for this coupon", 'coupon_invalid');
            }
            $cat = Text::lc($coupon['category'] ?? '');
            if ($cat !== '' && ! in_array($cat, self::STANDARD_COUPON_CATEGORIES, true)) {
                $catTotal = 0;
                foreach ($lines as $l) {
                    if (! $l['isFreeGift'] && Text::lc($l['category'] ?? '') === $cat) {
                        $catTotal += $l['price'] * $l['qty'];
                    }
                }
                if ($catTotal == 0) {
                    throw new PricingError("This coupon is only valid for \"{$coupon['category']}\" items", 'coupon_invalid');
                }
                if ($catTotal < $minPurchase) {
                    throw new PricingError("Minimum purchase of ₹$minPurchase for \"{$coupon['category']}\" items is required", 'coupon_invalid');
                }
            }
            $limit = Text::num($coupon['usageLimit'] ?? 0);
            if ($limit > 0) {
                if (Text::phoneKey($phone) === '') {
                    throw new PricingError('A valid phone number is required to use a coupon', 'coupon_invalid');
                }
                $used = self::couponUsageCount(Text::s($coupon['code']), $phone, $orderId);
                if ($used >= $limit) {
                    throw new PricingError("This coupon has already been used $used/$limit times with this phone number", 'coupon_invalid');
                }
            }
            $discount = ($coupon['discountType'] ?? '') === 'percentage'
                ? self::jsRound($subtotal * Text::num($coupon['discountValue'] ?? 0) / 100)
                : min($subtotal, Text::num($coupon['discountValue'] ?? 0));
            $appliedCoupon = mb_strtoupper(Text::s($coupon['code']));
        }

        // Shipping
        $shippingCharge = 0;
        if ($subtotal < $settings['freeShippingThreshold']) {
            $zone = null;
            foreach ($settings['shippingZones'] as $z) {
                $z = Json::arr($z);
                foreach (Json::list($z['states'] ?? []) as $s) {
                    if (Text::lc($s) === Text::lc($state)) {
                        $zone = $z;
                        break 2;
                    }
                }
            }
            if (! $zone) {
                $shippingCharge = self::NO_ZONE_RATE;
            } else {
                $shippingCharge = Text::num($zone['rate'] ?? 0);
                $rules = Json::list($zone['rules'] ?? []);
                foreach ($lines as $l) {
                    if ($l['isFreeGift']) {
                        continue;
                    }
                    $rule = self::findShippingRule($rules, $l['gender'] ?? '', $l['category'] ?? '');
                    if ($rule) {
                        $shippingCharge += Text::num($rule['rate'] ?? 0) * $l['qty'];
                    }
                }
            }
        }

        $total = max(0, $subtotal - $discount) + $shippingCharge;
        if ($isCod && ! $settings['codEnabled']) {
            throw new PricingError('Cash on delivery is not available right now', 'cod_disabled');
        }
        $codPercent = $settings['codPercent'];
        $advanceAmount = $isCod ? self::jsRound($total * ($codPercent / 100)) : $total;

        return [
            'itemsList' => array_map(function ($l) {
                unset($l['category'], $l['gender']);
                return $l;
            }, $lines),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'couponCode' => $appliedCoupon,
            'shippingCharge' => $shippingCharge,
            'total' => $total,
            'isPartialCod' => $isCod,
            'codPercent' => $codPercent,
            'advanceAmount' => $advanceAmount,
            'remainingAmount' => $total - $advanceAmount,
        ];
    }

    // JavaScript's Math.round (halves round up, also for negatives)
    public static function jsRound(float|int $n): int|float
    {
        return (int) floor($n + 0.5);
    }

    private static function isWholeNumber(mixed $q): bool
    {
        if (is_int($q)) {
            return true;
        }
        if (is_float($q)) {
            return is_finite($q) && floor($q) === $q;
        }
        if (is_string($q) && trim($q) !== '' && is_numeric(trim($q))) {
            $n = trim($q) + 0;
            return floor($n) == $n;
        }
        return false;
    }
}
