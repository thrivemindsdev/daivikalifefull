<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use App\Support\Json;
use App\Support\Text;
use RuntimeException;

// Sales & stock reports built from live orders, products and vendor stock.
// Dates are bucketed in India time (IST, UTC+5:30) regardless of the server's timezone. Times are in ms.
class Reports
{
    private const IST_MS = 330 * 60 * 1000;
    private const DAY_MS = 24 * 60 * 60 * 1000;
    private const LOW_STOCK = 5;
    private const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    private const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    public const GROUPS = ['auto', 'hour', 'day', 'week', 'month', 'year'];
    private const MAX_COMPARE_PERIODS = 24;

    private static function round2(float|int|null $n): float|int
    {
        $r = floor(((float) $n) * 100 + 0.5) / 100;
        return floor($r) == $r ? (int) $r : $r;
    }

    private static function num(mixed $n): float|int
    {
        return Text::num($n);
    }

    // Wall-clock parts in IST for a UTC ms time: [y, m (0-11), d, h, i, weekday (0 = Sun)]
    private static function ist(float|int $ms): array
    {
        $sec = (int) floor(($ms + self::IST_MS) / 1000);
        $d = gmdate('Y n j G i w', $sec);
        [$y, $m, $day, $h, $i, $w] = explode(' ', $d);
        return [(int) $y, (int) $m - 1, (int) $day, (int) $h, (int) $i, (int) $w];
    }

    // Date.UTC(y, m, d, h) in ms (months 0-11, overflowing values roll over like JavaScript)
    private static function utc(int $y, int $m, int $d, int $h = 0): int
    {
        return gmmktime($h, 0, 0, $m + 1, $d, $y) * 1000;
    }

    public static function orderTime(array $o): int
    {
        $t = strtotime((string) ($o['createdAt'] ?? ($o['date'] ?? '')));
        return $t === false ? 0 : $t * 1000 + self::millis((string) ($o['createdAt'] ?? ''));
    }

    private static function millis(string $iso): int
    {
        return preg_match('/\.(\d{1,3})/', $iso, $m) ? (int) str_pad($m[1], 3, '0') : 0;
    }

    private static function isCod(array $o): bool
    {
        return preg_match('/cod|cash/i', (string) ($o['paymentMethod'] ?? '')) === 1 || ! empty($o['isPartialCod']);
    }

    private static function qtyOf(array $it): float|int
    {
        $q = self::num($it['qty'] ?? ($it['quantity'] ?? 1));
        return $q ?: 1;
    }

    private static function customerKey(array $o): string
    {
        $email = strtolower(trim((string) ($o['email'] ?? '')));
        if ($email !== '') {
            return $email;
        }
        $phone = Text::phoneKey($o['phone'] ?? '');
        if ($phone !== '') {
            return $phone;
        }
        return (string) (($o['userId'] ?? '') ?: ($o['_id'] ?? ''));
    }

    // ── Period buckets ─────────────────────────────────────

    public static function autoGroupBy(float|int $from, float|int $to): string
    {
        $days = ($to - $from) / self::DAY_MS;
        return match (true) {
            $days <= 2 => 'hour',
            $days <= 62 => 'day',
            $days <= 182 => 'week',
            $days <= 1100 => 'month',
            default => 'year',
        };
    }

    // Start (UTC ms) of the IST bucket containing ms
    private static function bucketStart(float|int $ms, string $groupBy): int
    {
        [$y, $m, $day, $h, , $w] = self::ist($ms);
        $wall = match ($groupBy) {
            'hour' => self::utc($y, $m, $day, $h),
            'day' => self::utc($y, $m, $day),
            'week' => self::utc($y, $m, $day - (($w + 6) % 7)), // Monday
            'month' => self::utc($y, $m, 1),
            default => self::utc($y, 0, 1),
        };
        return $wall - self::IST_MS;
    }

    private static function nextBucket(int $start, string $groupBy): int
    {
        [$y, $m, $day, $h] = self::ist($start);
        $wall = match ($groupBy) {
            'hour' => self::utc($y, $m, $day, $h + 1),
            'day' => self::utc($y, $m, $day + 1),
            'week' => self::utc($y, $m, $day + 7),
            'month' => self::utc($y, $m + 1, 1),
            default => self::utc($y + 1, 0, 1),
        };
        return $wall - self::IST_MS;
    }

    private static function hourLabel(int $h): string
    {
        return ((($h + 11) % 12) + 1).' '.($h < 12 ? 'AM' : 'PM');
    }

    private static function bucketLabel(int $start, string $groupBy): string
    {
        [$y, $m, $day, $h] = self::ist($start);
        $dm = $day.' '.self::MONTHS[$m];
        return match ($groupBy) {
            'hour' => "$dm, ".self::hourLabel($h),
            'day' => "$dm $y",
            'week' => "Week of $dm $y",
            'month' => self::MONTHS[$m]." $y",
            default => (string) $y,
        };
    }

    public static function formatIst(float|int $ms): string
    {
        [$y, $m, $day, $h, $i] = self::ist($ms);
        return str_pad((string) $day, 2, '0', STR_PAD_LEFT).' '.self::MONTHS[$m]." $y, ".((($h + 11) % 12) + 1).':'.str_pad((string) $i, 2, '0', STR_PAD_LEFT).' '.($h < 12 ? 'AM' : 'PM');
    }

    // ── Data loading ───────────────────────────────────────

    public static function loadContext(): array
    {
        $products = Product::query()->get(['id', 'name', 'code', 'category', 'price', 'inventory'])->map(fn ($p) => [
            '_id' => $p->id,
            'name' => $p->name,
            'code' => $p->code ?: '',
            'category' => $p->category ?: 'Uncategorised',
            'price' => self::num($p->price),
            'inventory' => Json::list($p->inventory),
        ])->all();

        $value = Json::obj(Settings::get('invoice_settings', []));
        $company = [
            'name' => ($value['companyName'] ?? '') ?: 'DAIVIKA Store',
            'address' => implode(', ', array_filter([$value['companyStreet'] ?? '', $value['companyCity'] ?? '', $value['companyState'] ?? '', $value['companyPin'] ?? ''], fn ($x) => $x !== '' && $x !== null)),
            'email' => ($value['companyEmail'] ?? '') ?: '',
            'phone' => ($value['companyPhone'] ?? '') ?: '',
        ];

        return [
            'allOrders' => VendorRouting::listAllOrders(),
            'products' => $products,
            'vendors' => VendorStore::listVendors(),
            'company' => $company,
            'users' => null,
        ];
    }

    private static function users(array &$ctx): array
    {
        if ($ctx['users'] === null) {
            try {
                $ctx['users'] = User::query()->where('role', 'user')->get(['id', 'createdAt'])->map(fn ($u) => $u->createdAt ? $u->createdAt->getTimestampMs() : 0)->all();
            } catch (\Throwable $e) {
                logger()->warning('[reports] user lookup failed: '.$e->getMessage());
                $ctx['users'] = [];
            }
        }
        return $ctx['users'];
    }

    // ── Summary for one set of orders ──────────────────────

    // Returning customer = someone whose first order was before this period
    private static function summarize(array $orders, array $firstOrderAt, float|int $periodStart): array
    {
        $active = array_filter($orders, fn ($o) => ($o['status'] ?? '') !== 'Cancelled');
        $cancelled = array_filter($orders, fn ($o) => ($o['status'] ?? '') === 'Cancelled');
        $gross = array_sum(array_map(fn ($o) => self::num($o['total'] ?? 0), $active));
        $items = 0;
        $productSales = 0;
        foreach ($active as $o) {
            foreach (Json::list($o['itemsList'] ?? []) as $it) {
                $it = Json::arr($it);
                if (! empty($it['isFreeGift'])) {
                    continue;
                }
                $items += self::qtyOf($it);
                $productSales += self::qtyOf($it) * self::num($it['price'] ?? 0);
            }
        }
        $customers = [];
        foreach ($active as $o) {
            $customers[self::customerKey($o)] = true;
        }
        $returning = 0;
        foreach (array_keys($customers) as $c) {
            if (isset($firstOrderAt[$c]) && $firstOrderAt[$c] < $periodStart) {
                $returning++;
            }
        }
        $cod = array_filter($active, fn ($o) => self::isCod($o));
        $codTotal = array_sum(array_map(fn ($o) => self::num($o['total'] ?? 0), $cod));
        $count = count($active);
        return [
            'grossSales' => self::round2($gross),
            'orders' => $count,
            'itemsSold' => $items,
            'avgOrderValue' => self::round2($count ? $gross / $count : 0),
            'productSales' => self::round2($productSales),
            'discounts' => self::round2(array_sum(array_map(fn ($o) => self::num($o['discount'] ?? 0), $active))),
            'shipping' => self::round2(array_sum(array_map(fn ($o) => self::num($o['shippingCharge'] ?? 0), $active))),
            'onlineSales' => self::round2($gross - $codTotal),
            'codSales' => self::round2($codTotal),
            'codOrders' => count($cod),
            'cancelledOrders' => count($cancelled),
            'cancelledValue' => self::round2(array_sum(array_map(fn ($o) => self::num($o['total'] ?? 0), $cancelled))),
            'deliveredOrders' => count(array_filter($active, fn ($o) => ($o['status'] ?? '') === 'Delivered')),
            'pendingFulfilment' => count(array_filter($active, fn ($o) => in_array($o['status'] ?? '', ['Processing', 'Packed', 'Shipped'], true))),
            'customers' => count($customers),
            'returningCustomers' => $returning,
        ];
    }

    private static function growth(float|int $cur, float|int $prev): float|int|null
    {
        if ($prev) {
            return self::round2((($cur - $prev) / $prev) * 100);
        }
        return $cur ? null : 0;
    }

    private static function tally(array &$map, string $key, array $add): void
    {
        $row = $map[$key] ?? ['key' => $key, 'orders' => 0, 'revenue' => 0, 'items' => 0];
        $row['orders'] += $add['orders'] ?? 0;
        $row['revenue'] += $add['revenue'] ?? 0;
        $row['items'] += $add['items'] ?? 0;
        $map[$key] = $row;
    }

    private static function sorted(array $map, string $by = 'revenue'): array
    {
        $rows = array_map(fn ($r) => array_merge($r, ['revenue' => self::round2($r['revenue'])]), array_values($map));
        usort($rows, fn ($a, $b) => $b[$by] <=> $a[$by]);
        return $rows;
    }

    private static function vendorLabel(array $vendorById, array $o, string $fallback): string
    {
        $v = $vendorById[$o['vendorId']] ?? null;
        if ($v) {
            return ($v['businessName'] ?? '') ?: (($v['name'] ?? '') ?: $fallback);
        }
        return ($o['vendorName'] ?? '') ?: $fallback;
    }

    /**
     * Builds a report.
     *  from, to   date range (ms)
     *  groupBy    hour | day | week | month | year | auto
     *  vendorId   null = all orders, 'main' = main store only, or a vendor id
     *  forVendor  true for a vendor's own report (hides store-wide data like sign-ups)
     */
    public static function build(float|int $from, float|int $to, string $groupBy = 'auto', ?string $vendorId = null, bool $forVendor = false, ?string $scopeLabel = null, ?array &$ctx = null): array
    {
        if (! ($to > $from)) {
            throw new RuntimeException('The end date must be after the start date');
        }
        $gb = $groupBy === 'auto' ? self::autoGroupBy($from, $to) : $groupBy;
        $span = $to - $from;
        if ($gb === 'hour' && $span > 62 * self::DAY_MS) {
            throw new RuntimeException('Hourly reports are limited to 62 days');
        }
        if ($gb === 'day' && $span > 3 * 366 * self::DAY_MS) {
            throw new RuntimeException('Daily reports are limited to 3 years');
        }

        if ($ctx === null) {
            $ctx = self::loadContext();
        }
        $productById = [];
        foreach ($ctx['products'] as $p) {
            $productById[$p['_id']] = $p;
        }
        $vendorById = [];
        foreach ($ctx['vendors'] as $v) {
            $vendorById[$v['id']] = $v;
        }

        $scoped = array_values(array_filter($ctx['allOrders'], function ($o) use ($vendorId) {
            if (! (VendorRouting::isConfirmed($o) || ($o['status'] ?? '') === 'Cancelled')) {
                return false;
            }
            if (($o['status'] ?? '') === 'Pending Payment' || ($o['paymentStatus'] ?? '') === 'Pending') {
                return false;
            }
            if (! $vendorId) {
                return true;
            }
            if ($vendorId === 'main') {
                return empty($o['vendorId']);
            }
            return ($o['vendorId'] ?? null) === $vendorId;
        }));

        // First order time per customer (for returning-customer counts)
        $firstOrderAt = [];
        foreach ($scoped as $o) {
            $k = self::customerKey($o);
            $t = self::orderTime($o);
            if (! isset($firstOrderAt[$k]) || $t < $firstOrderAt[$k]) {
                $firstOrderAt[$k] = $t;
            }
        }

        $inRange = fn ($o, $a, $b) => ($t = self::orderTime($o)) >= $a && $t <= $b;
        $orders = array_values(array_filter($scoped, fn ($o) => $inRange($o, $from, $to)));
        usort($orders, fn ($a, $b) => self::orderTime($a) <=> self::orderTime($b));
        $prevOrders = array_values(array_filter($scoped, fn ($o) => $inRange($o, $from - $span - 1, $from - 1)));
        $active = array_values(array_filter($orders, fn ($o) => ($o['status'] ?? '') !== 'Cancelled'));

        $summary = self::summarize($orders, $firstOrderAt, $from);
        $previous = self::summarize($prevOrders, $firstOrderAt, $from - $span - 1);
        $change = [];
        foreach ($summary as $k => $v) {
            $change[$k] = self::growth($v, $previous[$k]);
        }

        if (! $forVendor) {
            $users = self::users($ctx);
            $summary['newSignups'] = count(array_filter($users, fn ($t) => $t >= $from && $t <= $to));
            $previous['newSignups'] = count(array_filter($users, fn ($t) => $t >= $from - $span - 1 && $t <= $from - 1));
            $change['newSignups'] = self::growth($summary['newSignups'], $previous['newSignups']);
        }

        // Time series with every bucket present (zeros included)
        $series = [];
        $index = [];
        for ($b = self::bucketStart($from, $gb), $guard = 0; $b <= $to && $guard < 5000; $b = self::nextBucket($b, $gb), $guard++) {
            $index[$b] = count($series);
            $series[] = ['period' => self::bucketLabel($b, $gb), 'start' => $b, 'orders' => 0, 'revenue' => 0, 'items' => 0, 'cancelled' => 0];
        }
        foreach ($orders as $o) {
            $i = $index[self::bucketStart(self::orderTime($o), $gb)] ?? null;
            if ($i === null) {
                continue;
            }
            if (($o['status'] ?? '') === 'Cancelled') {
                $series[$i]['cancelled']++;
                continue;
            }
            $series[$i]['orders']++;
            $series[$i]['revenue'] += self::num($o['total'] ?? 0);
            $series[$i]['items'] += self::itemCount($o);
        }
        foreach ($series as &$r) {
            $r['revenue'] = self::round2($r['revenue']);
        }
        unset($r);

        // Breakdowns
        $byStatus = $byPayment = $byState = $byDistrict = $byCategory = $byProduct = $byVendor = $byCoupon = $byCustomer = [];
        $byHour = [];
        for ($h = 0; $h < 24; $h++) {
            $byHour[] = ['key' => self::hourLabel($h), 'orders' => 0, 'revenue' => 0];
        }
        $byWeekday = array_map(fn ($d) => ['key' => $d, 'orders' => 0, 'revenue' => 0], self::WEEKDAYS);

        foreach ($orders as $o) {
            self::tally($byStatus, ($o['status'] ?? '') ?: 'Unknown', ['orders' => 1, 'revenue' => self::num($o['total'] ?? 0)]);
        }
        foreach ($active as $o) {
            $total = self::num($o['total'] ?? 0);
            $items = self::itemCount($o);
            $add = ['orders' => 1, 'revenue' => $total, 'items' => $items];
            $addr = Json::arr($o['address'] ?? []);
            self::tally($byPayment, self::isCod($o) ? 'Cash on Delivery' : (($o['paymentMethod'] ?? '') ?: 'Online'), $add);
            self::tally($byState, ($addr['state'] ?? '') ?: 'Unknown', $add);
            self::tally($byDistrict, ! empty($addr['district']) ? $addr['district'].', '.($addr['state'] ?? '') : 'Not given', $add);
            self::tally($byVendor, ! empty($o['vendorId']) ? self::vendorLabel($vendorById, $o, 'Vendor') : 'Main store', $add);
            if (! empty($o['couponCode'])) {
                $c = $byCoupon[$o['couponCode']] ?? ['key' => $o['couponCode'], 'orders' => 0, 'discount' => 0, 'revenue' => 0];
                $c['orders']++;
                $c['discount'] += self::num($o['discount'] ?? 0);
                $c['revenue'] += $total;
                $byCoupon[$o['couponCode']] = $c;
            }
            $ck = self::customerKey($o);
            $cust = $byCustomer[$ck] ?? ['key' => $ck, 'name' => $o['user'] ?? '', 'phone' => $o['phone'] ?? '', 'state' => $addr['state'] ?? '', 'orders' => 0, 'items' => 0, 'revenue' => 0, 'returning' => isset($firstOrderAt[$ck]) && $firstOrderAt[$ck] < $from];
            $cust['orders']++;
            $cust['items'] += $items;
            $cust['revenue'] += $total;
            $byCustomer[$ck] = $cust;
            [, , , $hour, , $weekday] = self::ist(self::orderTime($o));
            $byHour[$hour]['orders']++;
            $byHour[$hour]['revenue'] += $total;
            $byWeekday[$weekday]['orders']++;
            $byWeekday[$weekday]['revenue'] += $total;

            foreach (Json::list($o['itemsList'] ?? []) as $it) {
                $it = Json::arr($it);
                if (! empty($it['isFreeGift'])) {
                    continue;
                }
                $pid = Text::s($it['productId'] ?? ($it['_id'] ?? ''));
                $p = $productById[$pid] ?? null;
                $q = self::qtyOf($it);
                $rev = $q * self::num($it['price'] ?? 0);
                self::tally($byCategory, $p['category'] ?? 'Uncategorised', ['orders' => 1, 'revenue' => $rev, 'items' => $q]);
                $row = $byProduct[$pid] ?? ['key' => $pid, 'name' => $p['name'] ?? (($it['name'] ?? '') ?: 'Unknown product'), 'code' => $p['code'] ?? '', 'category' => $p['category'] ?? '', 'orders' => 0, 'items' => 0, 'revenue' => 0];
                $row['orders']++;
                $row['items'] += $q;
                $row['revenue'] += $rev;
                $byProduct[$pid] = $row;
            }
        }
        foreach ($byHour as &$r) {
            $r['revenue'] = self::round2($r['revenue']);
        }
        unset($r);
        foreach ($byWeekday as &$r) {
            $r['revenue'] = self::round2($r['revenue']);
        }
        unset($r);

        // Stock snapshot (current, not historical)
        if ($forVendor || ($vendorId && $vendorId !== 'main')) {
            $stock = array_map(function ($r) use ($productById) {
                $p = $productById[$r['productId']] ?? null;
                $variant = implode(' / ', array_filter([$r['variant'], $r['color']], fn ($x) => $x !== '' && $x !== null)) ?: 'Standard';
                return ['product' => $p['name'] ?? '(deleted product)', 'code' => $p['code'] ?? '', 'category' => $p['category'] ?? '', 'variant' => $variant, 'stock' => $r['stock'], 'active' => $r['isActive'], 'low' => $r['isActive'] && $r['stock'] <= self::LOW_STOCK];
            }, VendorStore::listStock($vendorId));
        } else {
            $vendorRows = VendorStore::listStock();
            $activeVendors = [];
            foreach ($ctx['vendors'] as $v) {
                if ($v['isActive']) {
                    $activeVendors[$v['id']] = true;
                }
            }
            $stock = array_map(function ($p) use ($vendorRows, $activeVendors, $vendorId) {
                $main = array_sum(array_map(fn ($i) => self::num(Json::arr($i)['stock'] ?? 0), $p['inventory']));
                $vend = 0;
                foreach ($vendorRows as $r) {
                    if ($r['productId'] === $p['_id'] && $r['isActive'] && isset($activeVendors[$r['vendorId']])) {
                        $vend += self::num($r['stock']);
                    }
                }
                $total = $vendorId === 'main' ? $main : $main + $vend;
                return ['product' => $p['name'], 'code' => $p['code'], 'category' => $p['category'], 'mainStock' => $main, 'vendorStock' => $vend, 'stock' => $total, 'low' => $total <= self::LOW_STOCK];
            }, $ctx['products']);
        }
        usort($stock, fn ($a, $b) => $a['stock'] <=> $b['stock']);

        $orderRows = array_map(function ($o) use ($vendorById) {
            $addr = Json::arr($o['address'] ?? []);
            $its = array_filter(array_map(fn ($it) => Json::arr($it), Json::list($o['itemsList'] ?? [])), fn ($it) => empty($it['isFreeGift']));
            $itemsText = implode(', ', array_map(function ($it) {
                $opts = array_filter([$it['size'] ?? '', $it['color'] ?? ''], fn ($x) => $x !== '' && $x !== null);
                return (($it['name'] ?? '') ?: 'Item').($opts ? ' ('.implode('/', $opts).')' : '').' ×'.self::qtyOf($it);
            }, $its));
            return [
                'id' => (string) ($o['_id'] ?? ''),
                'invoice' => $o['invoiceNumber'] ?? '',
                'date' => self::formatIst(self::orderTime($o)),
                'customer' => $o['user'] ?? '',
                'phone' => $o['phone'] ?? '',
                'district' => $addr['district'] ?? '',
                'state' => $addr['state'] ?? '',
                'items' => $itemsText,
                'qty' => array_sum(array_map(fn ($it) => self::qtyOf($it), $its)),
                'payment' => $o['paymentMethod'] ?? '',
                'paymentStatus' => $o['paymentStatus'] ?? '',
                'status' => $o['status'] ?? '',
                'fulfilledBy' => ! empty($o['vendorId']) ? self::vendorLabel($vendorById, $o, 'Vendor') : 'Main store',
                'discount' => self::round2(self::num($o['discount'] ?? 0)),
                'shipping' => self::round2(self::num($o['shippingCharge'] ?? 0)),
                'total' => self::round2(self::num($o['total'] ?? 0)),
            ];
        }, array_reverse($orders));

        $topProducts = array_map(fn ($r) => array_merge($r, ['revenue' => self::round2($r['revenue'])]), array_values($byProduct));
        usort($topProducts, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);
        $coupons = array_map(fn ($r) => array_merge($r, ['discount' => self::round2($r['discount']), 'revenue' => self::round2($r['revenue'])]), array_values($byCoupon));
        usort($coupons, fn ($a, $b) => $b['orders'] <=> $a['orders']);
        $topCustomers = array_map(function ($r) {
            unset($r['key']);
            return $r;
        }, array_slice(self::sorted($byCustomer), 0, 100));

        $now = (int) floor(microtime(true) * 1000);
        $scope = $scopeLabel ?: ($vendorId === 'main' ? 'Main store' : ($vendorId ? ((($vendorById[$vendorId]['businessName'] ?? '') ?: ($vendorById[$vendorId]['name'] ?? '')) ?: 'Vendor') : 'All stores'));

        return [
            'meta' => [
                'from' => $from,
                'to' => $to,
                'fromLabel' => self::formatIst($from),
                'toLabel' => self::formatIst($to),
                'groupBy' => $gb,
                'generatedAt' => $now,
                'generatedLabel' => self::formatIst($now),
                'scope' => $scope,
                'forVendor' => $forVendor,
                'lowStockThreshold' => self::LOW_STOCK,
                'company' => $ctx['company'],
            ],
            'summary' => $summary,
            'previous' => $previous,
            'change' => $change,
            'series' => $series,
            'byStatus' => self::sorted($byStatus, 'orders'),
            'byPayment' => self::sorted($byPayment),
            'byState' => self::sorted($byState),
            'byDistrict' => array_slice(self::sorted($byDistrict), 0, 50),
            'byCategory' => self::sorted($byCategory),
            'topProducts' => $topProducts,
            'byVendor' => $forVendor ? [] : self::sorted($byVendor),
            'byCoupon' => $coupons,
            'topCustomers' => $topCustomers,
            'byHour' => $byHour,
            'byWeekday' => $byWeekday,
            'stock' => array_values($stock),
            'orders' => array_values($orderRows),
        ];
    }

    private static function itemCount(array $o): float|int
    {
        $n = 0;
        foreach (Json::list($o['itemsList'] ?? []) as $it) {
            $it = Json::arr($it);
            if (empty($it['isFreeGift'])) {
                $n += self::qtyOf($it);
            }
        }
        return $n;
    }

    /**
     * Compares several periods side by side.
     *  periods  [['from', 'to', 'label']] in the order they should be shown (oldest first)
     */
    public static function compare(array $periods, ?string $vendorId = null, bool $forVendor = false, ?string $scopeLabel = null): array
    {
        if (count($periods) < 2) {
            throw new RuntimeException('Choose at least two periods to compare');
        }
        if (count($periods) > self::MAX_COMPARE_PERIODS) {
            throw new RuntimeException('You can compare up to '.self::MAX_COMPARE_PERIODS.' periods');
        }
        foreach ($periods as $p) {
            $valid = is_numeric($p['from']) && is_numeric($p['to']) && is_finite((float) $p['from']) && is_finite((float) $p['to']);
            if (! ($valid && $p['to'] > $p['from'])) {
                throw new RuntimeException('Every period needs a valid start and end');
            }
        }

        $ctx = self::loadContext();
        $built = [];
        foreach ($periods as $p) {
            $r = self::build($p['from'], $p['to'], 'auto', $vendorId, $forVendor, $scopeLabel, $ctx);
            $label = mb_substr(trim((string) ($p['label'] ?? '')), 0, 40);
            $built[] = [
                'label' => $label !== '' ? $label : explode(',', $r['meta']['fromLabel'])[0].' – '.explode(',', $r['meta']['toLabel'])[0],
                'from' => $p['from'],
                'to' => $p['to'],
                'fromLabel' => $r['meta']['fromLabel'],
                'toLabel' => $r['meta']['toLabel'],
                'summary' => $r['summary'],
                'byCategory' => $r['byCategory'],
                'byState' => array_slice($r['byState'], 0, 40),
                'byPayment' => $r['byPayment'],
                'byStatus' => $r['byStatus'],
                'byVendor' => $r['byVendor'],
                'topProducts' => array_slice($r['topProducts'], 0, 100),
                'meta' => $r['meta'],
            ];
        }

        $first = $built[0]['meta'];
        $from = min(array_column($built, 'from'));
        $to = max(array_column($built, 'to'));
        $now = (int) floor(microtime(true) * 1000);
        return [
            'meta' => [
                'kind' => 'comparison',
                'from' => $from,
                'to' => $to,
                'fromLabel' => self::formatIst($from),
                'toLabel' => self::formatIst($to),
                'groupBy' => 'compare',
                'generatedAt' => $now,
                'generatedLabel' => self::formatIst($now),
                'scope' => $first['scope'],
                'forVendor' => $forVendor,
                'company' => $first['company'],
                'periodCount' => count($built),
            ],
            'periods' => array_map(function ($b) {
                unset($b['meta']);
                return $b;
            }, $built),
            'series' => array_map(fn ($b) => ['period' => $b['label'], 'revenue' => $b['summary']['grossSales'], 'orders' => $b['summary']['orders'], 'items' => $b['summary']['itemsSold']], $built),
        ];
    }

    // A JavaScript-style date (ISO string or ms number) in ms, or null when it isn't a valid date
    public static function toMs(mixed $v): ?int
    {
        if (is_int($v) || is_float($v)) {
            return is_finite((float) $v) ? (int) $v : null;
        }
        $s = trim((string) $v);
        if ($s === '') {
            return null;
        }
        if (is_numeric($s)) {
            return (int) $s;
        }
        // A real calendar date is required (PHP would otherwise read words like "x" as time zone names)
        if (! preg_match('/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[ \/-][A-Za-z]{3,}[ \/-]\d{4}|[A-Za-z]{3,} \d{1,2},? \d{4}/', $s)) {
            return null;
        }
        $parsed = date_parse($s);
        if ($parsed['error_count'] > 0) {
            return null;
        }
        try {
            $d = new \DateTimeImmutable($s, new \DateTimeZone('UTC'));
            return (int) $d->format('Uv');
        } catch (\Throwable) {
            return null;
        }
    }
}
