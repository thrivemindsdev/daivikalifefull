<?php

namespace App\Services;

use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorReport;
use App\Models\VendorStock;
use App\Support\Json;
use App\Support\Text;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// Vendors, the stock they hold, vendor system settings and the reports vendors submit
class VendorStore
{
    public const SETTINGS_KEY = 'vendor_system';

    public static function stockKey(mixed $variant, mixed $color): string
    {
        return Text::lc($variant).'|'.Text::lc($color);
    }

    public static function publicVendor(?Vendor $v): ?array
    {
        return $v?->toArray();
    }

    // ── Vendors ────────────────────────────────────────────

    public static function listVendors(): array
    {
        return Vendor::query()->orderByDesc('createdAt')->get()->map->toArray()->all();
    }

    public static function getVendor(?string $id): ?array
    {
        if (! $id) {
            return null;
        }
        return Vendor::query()->find($id)?->toArray();
    }

    public static function getVendorByUserId(?string $userId): ?array
    {
        if (! $userId) {
            return null;
        }
        return Vendor::query()->where('userId', $userId)->first()?->toArray();
    }

    private static function findLoginConflict(string $email, string $phone, ?string $ignoreUserId = null): ?User
    {
        // Mobile numbers can be stored as 9876543210, 919876543210 or +919876543210
        $mobile = Text::indianMobile($phone);
        $phones = $mobile ? [$mobile, "91$mobile", "+91$mobile"] : ($phone !== '' ? [$phone] : []);
        if ($email === '' && ! $phones) {
            return null;
        }
        $hit = User::query()->where(function ($q) use ($email, $phones) {
            if ($email !== '') {
                $q->orWhere('email', $email);
            }
            if ($phones) {
                $q->orWhereIn('phone', $phones);
            }
        })->first();
        return $hit && $hit->id !== $ignoreUserId ? $hit : null;
    }

    // Vendors log in with their mobile number, stored as the 10-digit number
    private static function cleanInput(array $data): array
    {
        $phoneRaw = Text::s($data['phone'] ?? '');
        return [
            'name' => trim(Text::s($data['name'] ?? '')),
            'businessName' => trim(Text::s($data['businessName'] ?? '')),
            'email' => strtolower(trim(Text::s($data['email'] ?? ''))),
            'phone' => Text::indianMobile($phoneRaw) ?? preg_replace('/[^\d+]/', '', $phoneRaw),
            'state' => trim(Text::s($data['state'] ?? '')),
            'district' => trim(Text::s($data['district'] ?? '')),
            'address' => trim(Text::s($data['address'] ?? '')),
            'pincode' => preg_replace('/\D/', '', Text::s($data['pincode'] ?? '')),
            'notes' => trim(Text::s($data['notes'] ?? '')),
        ];
    }

    public static function createVendor(array $data, mixed $password): array
    {
        $v = self::cleanInput($data);
        $password = Text::s($password);
        if ($v['name'] === '' || $v['state'] === '' || $v['district'] === '') {
            throw new RuntimeException('Name, state and district are required');
        }
        if (! Text::indianMobile($v['phone'])) {
            throw new RuntimeException('A valid 10-digit mobile number is required — the vendor logs in with it');
        }
        if (strlen($password) < 6) {
            throw new RuntimeException('Password must be at least 6 characters');
        }
        if (self::findLoginConflict($v['email'], $v['phone'])) {
            throw new RuntimeException('An account with this email or phone already exists');
        }

        return DB::transaction(function () use ($v, $data, $password) {
            $user = User::query()->create([
                'name' => $v['name'],
                'email' => $v['email'] !== '' ? $v['email'] : null,
                'phone' => $v['phone'] !== '' ? $v['phone'] : null,
                'password' => $password,
                'role' => 'vendor',
            ]);
            $vendor = Vendor::query()->create($v + ['userId' => $user->id, 'isActive' => ($data['isActive'] ?? true) !== false]);
            return $vendor->fresh()->toArray();
        });
    }

    public static function updateVendor(string $id, array $data, mixed $password = null): array
    {
        $existing = Vendor::query()->find($id);
        if (! $existing) {
            throw new RuntimeException('Vendor not found');
        }

        $clean = self::cleanInput(array_merge($existing->toArray(), $data));
        $patch = [];
        foreach ($clean as $k => $val) {
            if (array_key_exists($k, $data) && $data[$k] !== null) {
                $patch[$k] = $val;
            }
        }
        if (array_key_exists('isActive', $data) && $data['isActive'] !== null) {
            $patch['isActive'] = (bool) $data['isActive'];
        }
        foreach (['name', 'state', 'district'] as $k) {
            if (array_key_exists($k, $patch) && $patch[$k] === '') {
                throw new RuntimeException('Name, state and district cannot be empty');
            }
        }
        $password = $password === null ? null : Text::s($password);
        if ($password !== null && $password !== '' && strlen($password) < 6) {
            throw new RuntimeException('Password must be at least 6 characters');
        }

        $email = $patch['email'] ?? $existing->email;
        $phone = $patch['phone'] ?? $existing->phone;
        if ($email === '' && $phone === '') {
            throw new RuntimeException('Email or phone is required for the vendor login');
        }
        if (! empty($patch['phone']) && ! Text::indianMobile($patch['phone'])) {
            throw new RuntimeException('Please enter a valid 10-digit mobile number for the vendor login');
        }
        if (self::findLoginConflict($email, $phone, $existing->userId)) {
            throw new RuntimeException('An account with this email or phone already exists');
        }

        return DB::transaction(function () use ($existing, $patch, $email, $phone, $password) {
            $user = User::query()->find($existing->userId);
            if ($user) {
                $user->name = $patch['name'] ?? $existing->name;
                $user->email = $email !== '' ? $email : null;
                $user->phone = $phone !== '' ? $phone : null;
                if ($password) {
                    $user->password = $password;
                }
                $user->save();
            }
            $existing->fill($patch)->save();
            return $existing->fresh()->toArray();
        });
    }

    public static function deleteVendor(string $id): void
    {
        $v = Vendor::query()->find($id);
        if (! $v) {
            throw new RuntimeException('Vendor not found');
        }
        DB::transaction(function () use ($v, $id) {
            VendorStock::query()->where('vendorId', $id)->delete();
            $v->delete();
            User::query()->where('id', $v->userId)->delete();
        });
    }

    // ── Vendor stock ───────────────────────────────────────

    public static function listStock(?string $vendorId = null, ?string $productId = null): array
    {
        $q = VendorStock::query();
        if ($vendorId) {
            $q->where('vendorId', $vendorId);
        }
        if ($productId) {
            $q->where('productId', $productId);
        }
        return $q->get()->map->toArray()->all();
    }

    // Upserts one stock row. mode 'add' adds to the current stock, otherwise sets it.
    public static function setStock(string $vendorId, string $productId, mixed $variant, mixed $color, array $opts = []): array
    {
        $v = Text::s($variant);
        $c = Text::s($color);
        $row = VendorStock::query()->where(compact('vendorId', 'productId') + ['variant' => $v, 'color' => $c])->first();
        if (! $row) {
            $row = new VendorStock(['vendorId' => $vendorId, 'productId' => $productId, 'variant' => $v, 'color' => $c, 'stock' => 0, 'isActive' => true]);
        }
        if (array_key_exists('stock', $opts) && $opts['stock'] !== null) {
            $base = ($opts['mode'] ?? null) === 'add' ? (int) $row->stock : 0;
            $row->stock = max(0, $base + (Text::parseInt($opts['stock']) ?? 0));
        }
        if (array_key_exists('isActive', $opts) && $opts['isActive'] !== null) {
            $row->isActive = (bool) $opts['isActive'];
        }
        $row->save();
        return $row->fresh()->toArray();
    }

    public static function removeProduct(string $vendorId, string $productId): void
    {
        VendorStock::query()->where('vendorId', $vendorId)->where('productId', $productId)->delete();
    }

    private static function matchRow(array $productRows, array $item): ?array
    {
        $want = self::stockKey($item['size'] ?? '', $item['color'] ?? '');
        foreach ($productRows as $r) {
            if (self::stockKey($r['variant'], $r['color']) === $want) {
                return $r;
            }
        }
        return count($productRows) === 1 ? array_values($productRows)[0] : null;
    }

    public static function itemProductId(array $item): string
    {
        return Text::s($item['productId'] ?? ($item['_id'] ?? ''));
    }

    public static function itemQty(array $item): int
    {
        $q = Text::parseInt($item['qty'] ?? ($item['quantity'] ?? 1));
        return $q ?: 1;
    }

    // Applies a stock change for an order's items (sign -1 = take, +1 = give back)
    public static function adjustForItems(string $vendorId, array $items, int $sign): void
    {
        $rows = self::listStock($vendorId);
        foreach ($items as $item) {
            $item = Json::arr($item);
            $pId = self::itemProductId($item);
            $productRows = array_values(array_filter($rows, fn ($r) => $r['productId'] === $pId));
            $row = self::matchRow($productRows, $item);
            if (! $row) {
                continue;
            }
            self::setStock($vendorId, $pId, $row['variant'], $row['color'], ['stock' => $sign * self::itemQty($item), 'mode' => 'add']);
        }
    }

    // True when the vendor's stock rows cover every item in the order
    public static function canFulfil(array $rows, array $items): bool
    {
        $need = [];
        foreach ($items as $item) {
            $item = Json::arr($item);
            $pId = self::itemProductId($item);
            $productRows = array_values(array_filter($rows, fn ($r) => $r['productId'] === $pId && $r['isActive']));
            $row = self::matchRow($productRows, $item);
            if (! $row) {
                return false;
            }
            $need[$row['id']] = ($need[$row['id']] ?? 0) + self::itemQty($item);
            if ($need[$row['id']] > ($row['stock'] ?? 0)) {
                return false;
            }
        }
        return count($items) > 0;
    }

    // [productId => ['variant|color' => totalStock]] across active vendors, for storefront availability
    public static function stockTotals(): array
    {
        $active = Vendor::query()->where('isActive', true)->pluck('id')->flip();
        $totals = [];
        foreach (VendorStock::query()->where('isActive', true)->where('stock', '>', 0)->get() as $r) {
            if (! isset($active[$r->vendorId])) {
                continue;
            }
            $k = self::stockKey($r->variant, $r->color);
            $totals[$r->productId][$k] = ($totals[$r->productId][$k] ?? 0) + $r->stock;
        }
        return $totals;
    }

    // Product (array) with vendor stock added to each inventory entry; `mainStock` keeps the store's own stock
    public static function withVendorStock(array $product, array $totals): array
    {
        $t = $totals[Text::s($product['_id'] ?? ($product['id'] ?? ''))] ?? null;
        if (! $t || ! is_array($product['inventory'] ?? null) || ! array_is_list($product['inventory'])) {
            return $product;
        }
        $used = [];
        $inventory = [];
        foreach ($product['inventory'] as $inv) {
            $inv = Json::arr($inv);
            $k = self::stockKey($inv['variant'] ?? '', $inv['color'] ?? '');
            $used[$k] = true;
            $own = Text::num($inv['stock'] ?? 0);
            $inventory[] = array_merge($inv, ['mainStock' => $own, 'stock' => $own + ($t[$k] ?? 0)]);
        }
        // Vendor stock that doesn't match a variant of the store's inventory (e.g. single-variant product)
        $extra = 0;
        foreach ($t as $k => $n) {
            if (! isset($used[$k])) {
                $extra += $n;
            }
        }
        if ($extra > 0 && count($inventory) === 1) {
            $inventory[0]['stock'] += $extra;
        }
        $product['inventory'] = $inventory;
        return $product;
    }

    // ── Vendor system settings ─────────────────────────────
    // Orders are only auto-routed once the vendor system is switched on, so older orders stay with the main store.

    public static function settings(): array
    {
        $defaults = ['enabled' => false, 'enabledAt' => null, 'maxDistanceKm' => 0];
        return array_merge($defaults, Json::obj(Settings::get(self::SETTINGS_KEY, [])));
    }

    public static function saveSettings(array $patch): array
    {
        $current = self::settings();
        $value = array_merge($current, $patch);
        if (! empty($patch['enabled']) && empty($current['enabledAt'])) {
            $value['enabledAt'] = Text::nowIso();
        }
        Settings::put(self::SETTINGS_KEY, $value);
        return $value;
    }

    // ── Reports submitted by vendors to the admin ──────────

    private static function reportListItem(VendorReport $r): array
    {
        $a = $r->toArray();
        unset($a['data']);
        return $a;
    }

    public static function createReport(array $r): array
    {
        $report = VendorReport::query()->create([
            'vendorId' => $r['vendorId'],
            'vendorName' => $r['vendorName'] ?? '',
            'title' => $r['title'] ?? '',
            'groupBy' => $r['groupBy'] ?? 'day',
            'note' => $r['note'] ?? '',
            'rangeFrom' => Carbon::createFromTimestampMs($r['from'], 'UTC'),
            'rangeTo' => Carbon::createFromTimestampMs($r['to'], 'UTC'),
            'summary' => $r['summary'] ?? ($r['data']['summary'] ?? new \stdClass),
            'data' => $r['data'],
            'status' => 'submitted',
            'adminNote' => '',
        ]);
        return self::reportListItem($report->fresh());
    }

    public static function listReports(?string $vendorId = null, ?string $status = null): array
    {
        $q = VendorReport::query()->select(array_diff(VendorReport::COLUMNS, ['data']))->orderByDesc('createdAt');
        if ($vendorId) {
            $q->where('vendorId', $vendorId);
        }
        if ($status) {
            $q->where('status', $status);
        }
        return $q->get()->map(fn ($r) => self::reportListItem($r))->all();
    }

    public static function getReport(string $id): ?array
    {
        return VendorReport::query()->find($id)?->toArray();
    }

    public static function updateReport(string $id, ?string $status, ?string $adminNote): array
    {
        $report = VendorReport::query()->find($id);
        if (! $report) {
            throw new RuntimeException('Report not found');
        }
        if ($status) {
            $report->status = $status;
            $report->reviewedAt = $status === 'reviewed' ? now() : null;
        }
        if ($adminNote !== null) {
            $report->adminNote = $adminNote;
        }
        $report->save();
        return self::reportListItem($report->fresh());
    }
}
