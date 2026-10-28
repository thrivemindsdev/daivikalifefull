<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\VendorRouting;
use App\Services\VendorStore;
use App\Support\Json;
use App\Support\Text;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

// Admin   GET|POST /api/vendors, PUT|DELETE /api/vendors/:id
//         GET|PUT /api/vendors/:id/stock, GET|POST /api/vendors/:id/products, DELETE /api/vendors/:id/products/:productId
//         GET /api/vendors/orders, PUT /api/vendors/orders/:orderId/route
//         GET /api/vendors/stock-overview, /product-map, /preview-route, GET|PUT /api/vendors/settings
// Vendor  GET /api/vendors/me, GET /api/vendors/me/products, POST|DELETE /api/vendors/me/products[/:productId]
//         PUT /api/vendors/me/stock, GET /api/vendors/me/orders
//         PUT /api/vendors/me/orders/:orderId/status, POST /api/vendors/me/orders/:orderId/reject
//         PUT /api/vendors/me/password
class VendorController extends ApiController
{
    private const VENDOR_ORDER_STATUSES = ['Accepted', 'Packed', 'Shipped', 'Delivered'];

    protected function handle(string $method): Response
    {
        $user = $this->user();
        if (! $user) {
            return $this->error('Not authorized', 401);
        }
        try {
            if ($this->seg(0) === 'me') {
                if ($user->role !== 'vendor') {
                    return $this->error('Not a vendor account', 403);
                }
                return $this->vendor($method, array_slice($this->path, 1), $user);
            }
            if ($user->role !== 'admin') {
                return $this->notAdmin();
            }
            return $this->adminRoutes($method);
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage() ?: 'Server error', 400);
        }
    }

    // Catalog with the variant/colour combinations a vendor can stock
    private static function catalog(): array
    {
        return Product::query()->orderByDesc('createdAt')->get(['id', 'name', 'code', 'image', 'category', 'price', 'inventory'])->map(function ($p) {
            $inv = Json::list($p->inventory) ?: [['variant' => '', 'color' => '', 'stock' => 0]];
            return [
                '_id' => $p->id,
                'name' => $p->name,
                'code' => $p->code ?: '',
                'image' => $p->image,
                'category' => $p->category,
                'price' => $p->price,
                'combos' => array_map(fn ($i) => [
                    'variant' => Text::s(Json::arr($i)['variant'] ?? ''),
                    'color' => Text::s(Json::arr($i)['color'] ?? ''),
                    'mainStock' => Text::num(Json::arr($i)['stock'] ?? 0),
                ], $inv),
            ];
        })->all();
    }

    // Groups stock rows by product and attaches product details
    private static function groupStock(array $rows, array $catalog): array
    {
        $byId = [];
        foreach ($catalog as $p) {
            $byId[$p['_id']] = $p;
        }
        $groups = [];
        foreach ($rows as $r) {
            if (! isset($groups[$r['productId']])) {
                $p = $byId[$r['productId']] ?? null;
                $groups[$r['productId']] = [
                    'productId' => $r['productId'],
                    'name' => $p['name'] ?? '(deleted product)',
                    'code' => $p['code'] ?? '',
                    'image' => $p['image'] ?? '',
                    'category' => $p['category'] ?? '',
                    'price' => $p['price'] ?? 0,
                    'missing' => ! $p,
                    'rows' => [],
                ];
            }
            $groups[$r['productId']]['rows'][] = ['id' => $r['id'], 'variant' => $r['variant'], 'color' => $r['color'], 'stock' => $r['stock'], 'isActive' => $r['isActive'], 'vendorId' => $r['vendorId']];
        }
        return array_values(array_map(function ($g) {
            $g['totalStock'] = array_sum(array_map(fn ($r) => $r['isActive'] ? $r['stock'] : 0, $g['rows']));
            $g['isActive'] = (bool) array_filter($g['rows'], fn ($r) => $r['isActive']);
            return $g;
        }, $groups));
    }

    // The vendor's stocked products plus the catalog products they don't carry yet
    private static function productsPayload(string $vendorId): array
    {
        $catalog = self::catalog();
        $products = self::groupStock(VendorStore::listStock($vendorId), $catalog);
        $mine = array_flip(array_column($products, 'productId'));
        $rest = [];
        foreach ($catalog as $p) {
            if (! isset($mine[$p['_id']])) {
                $combos = $p['combos'];
                unset($p['combos']);
                $rest[] = $p + ['variants' => count($combos)];
            }
        }
        return ['products' => $products, 'catalog' => $rest];
    }

    // `initialStock` (admin only) is the starting quantity for each variant/colour the vendor didn't stock yet
    private static function addProduct(string $vendorId, string $productId, mixed $initialStock = 0): ?array
    {
        $catalog = self::catalog();
        $product = null;
        foreach ($catalog as $p) {
            if ($p['_id'] === $productId) {
                $product = $p;
                break;
            }
        }
        if (! $product) {
            throw new RuntimeException('Product not found');
        }
        $stock = max(0, Text::parseInt($initialStock) ?? 0);
        $existing = VendorStore::listStock($vendorId, $productId);
        foreach ($product['combos'] as $c) {
            $has = false;
            foreach ($existing as $r) {
                if ($r['variant'] === $c['variant'] && $r['color'] === $c['color']) {
                    $has = true;
                    break;
                }
            }
            if (! $has) {
                VendorStore::setStock($vendorId, $productId, $c['variant'], $c['color'], ['stock' => $stock]);
            }
        }
        return self::groupStock(VendorStore::listStock($vendorId, $productId), $catalog)[0] ?? null;
    }

    private static function applyStockUpdate(string $vendorId, array $body): mixed
    {
        $productId = Text::s($body['productId'] ?? '');
        if ($productId === '') {
            throw new RuntimeException('productId is required');
        }
        $isActive = $body['isActive'] ?? null;
        // Toggle a whole product on/off when no variant is given
        if ($isActive !== null && ! array_key_exists('variant', $body) && ! array_key_exists('color', $body)) {
            foreach (VendorStore::listStock($vendorId, $productId) as $r) {
                VendorStore::setStock($vendorId, $productId, $r['variant'], $r['color'], ['isActive' => $isActive]);
            }
            return true;
        }
        $stock = $body['stock'] ?? null;
        if ($stock !== null && Text::parseInt($stock) === null) {
            throw new RuntimeException('Stock must be a number');
        }
        return VendorStore::setStock($vendorId, $productId, $body['variant'] ?? '', $body['color'] ?? '', ['stock' => $stock, 'mode' => $body['mode'] ?? null, 'isActive' => $isActive]);
    }

    private static function orderSummary(array $x): array
    {
        return [
            '_id' => (string) $x['_id'],
            'invoiceNumber' => $x['invoiceNumber'] ?? '',
            'user' => $x['user'] ?? '',
            'phone' => $x['phone'] ?? '',
            'email' => $x['email'] ?? '',
            'total' => $x['total'] ?? 0,
            'status' => $x['status'] ?? '',
            'paymentStatus' => $x['paymentStatus'] ?? '',
            'paymentMethod' => $x['paymentMethod'] ?? '',
            'address' => $x['address'] ?? null,
            'itemsList' => $x['itemsList'] ?? [],
            'date' => $x['date'] ?? '',
            'time' => $x['time'] ?? '',
            'createdAt' => $x['createdAt'] ?? null,
            'vendorId' => ($x['vendorId'] ?? null) ?: null,
            'vendorName' => ($x['vendorName'] ?? '') ?: '',
            'vendorStatus' => ($x['vendorStatus'] ?? '') ?: '',
            'routingLog' => Json::list($x['routingLog'] ?? []),
        ];
    }

    private static function confirmedOrders(?string $vendorId = null): array
    {
        $q = Order::query()->where('status', '!=', 'Pending Payment')->where('status', '!=', 'Cancelled')->where('paymentStatus', '!=', 'Pending')->orderByDesc('createdAt');
        if ($vendorId) {
            $q->where('vendorId', $vendorId);
        }
        return $q->get()->map->toArray()->all();
    }

    private static function vendorStats(array $vendorIds): array
    {
        $stats = [];
        foreach ($vendorIds as $id) {
            $stats[$id] = ['products' => [], 'units' => 0, 'openOrders' => 0, 'deliveredOrders' => 0];
        }
        foreach (VendorStore::listStock() as $r) {
            if (! isset($stats[$r['vendorId']])) {
                continue;
            }
            $stats[$r['vendorId']]['products'][$r['productId']] = true;
            if ($r['isActive']) {
                $stats[$r['vendorId']]['units'] += $r['stock'] ?: 0;
            }
        }
        foreach (self::confirmedOrders() as $o) {
            $vid = $o['vendorId'] ?? null;
            if (! $vid || ! isset($stats[$vid])) {
                continue;
            }
            if ($o['status'] === 'Delivered') {
                $stats[$vid]['deliveredOrders']++;
            } else {
                $stats[$vid]['openOrders']++;
            }
        }
        foreach ($stats as $id => $s) {
            $stats[$id]['products'] = count($s['products']);
        }
        return $stats;
    }

    // ── Vendor (self-service) ──────────────────────────────

    private function vendor(string $method, array $rest, User $user): Response
    {
        $vendor = VendorStore::getVendorByUserId($user->id);
        if (! $vendor) {
            return $this->error('Vendor profile not found', 404);
        }
        if (! $vendor['isActive'] && ! ($method === 'GET' && ! $rest)) {
            return $this->error('Your vendor account is disabled. Please contact the admin.', 403);
        }
        [$section, $sub, $action] = $rest + [null, null, null];

        if ($method === 'GET' && ! $section) {
            return $this->ok(['vendor' => $vendor, 'stats' => self::vendorStats([$vendor['id']])[$vendor['id']]]);
        }

        if ($section === 'products') {
            if ($method === 'GET') {
                return $this->ok(self::productsPayload($vendor['id']));
            }
            if ($method === 'POST') {
                return $this->ok(self::addProduct($vendor['id'], Text::s($this->body()['productId'] ?? '')), 201);
            }
            if ($method === 'DELETE' && $sub) {
                VendorStore::removeProduct($vendor['id'], $sub);
                return $this->ok(['removed' => $sub]);
            }
        }

        if ($section === 'stock' && $method === 'PUT') {
            return $this->ok(self::applyStockUpdate($vendor['id'], $this->body()));
        }

        if ($section === 'orders') {
            if ($method === 'GET' && ! $sub) {
                VendorRouting::routeUnassigned();
                return $this->ok(array_map([self::class, 'orderSummary'], self::confirmedOrders($vendor['id'])));
            }
            $order = $sub ? Order::query()->find($sub) : null;
            if (! $order || $order->vendorId !== $vendor['id']) {
                return $this->error('Order not found', 404);
            }

            if ($method === 'PUT' && $action === 'status') {
                $status = Text::s($this->body()['status'] ?? '');
                if (! in_array($status, self::VENDOR_ORDER_STATUSES, true)) {
                    return $this->error('Invalid status', 400);
                }
                $patch = ['vendorStatus' => $status];
                if ($status !== 'Accepted') {
                    $patch['status'] = $status;
                }
                $log = Json::list($order->routingLog);
                $log[] = ['at' => Text::nowIso(), 'actor' => 'vendor', 'status' => $status, 'vendorName' => $vendor['businessName'] ?: $vendor['name']];
                $patch['routingLog'] = $log;
                return $this->ok(self::orderSummary(VendorRouting::saveOrderPatch($sub, $patch)));
            }

            if ($method === 'POST' && $action === 'reject') {
                if (in_array($order->status, ['Shipped', 'Delivered'], true)) {
                    return $this->error('Shipped orders cannot be rejected', 400);
                }
                $reason = Text::s($this->body()['reason'] ?? '');
                $patch = VendorRouting::route($order->toArray(), ['actor' => 'vendor', 'rejectedBy' => $vendor['id'], 'note' => $reason]);
                $patch['status'] = 'Processing';
                VendorRouting::saveOrderPatch($sub, $patch);
                return $this->ok(['rerouted' => true, 'to' => $patch['vendorName'] ?: VendorRouting::MAIN_STORE]);
            }
        }

        if ($section === 'password' && $method === 'PUT') {
            $body = $this->body();
            $new = Text::s($body['newPassword'] ?? '');
            if (strlen($new) < 6) {
                return $this->error('New password must be at least 6 characters', 400);
            }
            if (! $user->matchPassword(Text::s($body['currentPassword'] ?? ''))) {
                return $this->error('Current password is incorrect', 400);
            }
            VendorStore::updateVendor($vendor['id'], [], $new);
            return $this->ok(['updated' => true]);
        }

        return $this->notFound();
    }

    // ── Admin ──────────────────────────────────────────────

    private function adminRoutes(string $method): Response
    {
        [$first, $second, $third] = $this->path + [null, null, null];

        if ($first === 'settings') {
            if ($method === 'GET') {
                return $this->ok(VendorStore::settings());
            }
            if ($method === 'PUT') {
                $body = $this->body();
                $patch = [];
                if (array_key_exists('enabled', $body)) {
                    $patch['enabled'] = (bool) $body['enabled'];
                }
                if (array_key_exists('maxDistanceKm', $body)) {
                    $patch['maxDistanceKm'] = max(0, Text::parseInt($body['maxDistanceKm']) ?? 0);
                }
                return $this->ok(VendorStore::saveSettings($patch));
            }
        }

        if ($first === 'preview-route' && $method === 'GET') {
            $fake = ['address' => ['state' => (string) $this->request->query('state', ''), 'district' => (string) $this->request->query('district', '')]];
            return $this->ok(array_map(fn ($r) => [
                'vendorId' => $r['vendor']['id'],
                'name' => $r['vendor']['businessName'] ?: $r['vendor']['name'],
                'state' => $r['vendor']['state'],
                'district' => $r['vendor']['district'],
                'distanceKm' => $r['distanceKm'],
            ], VendorRouting::rankVendors($fake)));
        }

        // { productId: [vendorId, ...] } for every product a vendor carries (active or paused)
        if ($first === 'product-map' && $method === 'GET') {
            $map = [];
            foreach (VendorStore::listStock() as $r) {
                $map[$r['productId']] ??= [];
                if (! in_array($r['vendorId'], $map[$r['productId']], true)) {
                    $map[$r['productId']][] = $r['vendorId'];
                }
            }
            return $this->ok(Json::object($map));
        }

        if ($first === 'stock-overview' && $method === 'GET') {
            $rows = VendorStore::listStock();
            $products = array_map(function ($p) use ($rows) {
                $vendorStock = [];
                foreach ($rows as $r) {
                    if ($r['productId'] !== $p['_id'] || ! $r['isActive']) {
                        continue;
                    }
                    $vendorStock[$r['vendorId']] = ($vendorStock[$r['vendorId']] ?? 0) + ($r['stock'] ?: 0);
                }
                return [
                    '_id' => $p['_id'], 'name' => $p['name'], 'code' => $p['code'], 'image' => $p['image'], 'category' => $p['category'],
                    'mainStock' => array_sum(array_column($p['combos'], 'mainStock')),
                    'vendorStock' => Json::object($vendorStock),
                ];
            }, self::catalog());
            $vendors = array_map(fn ($v) => ['id' => $v['id'], 'name' => $v['businessName'] ?: $v['name'], 'isActive' => $v['isActive']], VendorStore::listVendors());
            return $this->ok(['vendors' => $vendors, 'products' => $products]);
        }

        if ($first === 'orders') {
            if ($method === 'GET' && ! $second) {
                VendorRouting::routeUnassigned();
                return $this->ok(array_map([self::class, 'orderSummary'], self::confirmedOrders()));
            }
            if ($method === 'PUT' && $second && $third === 'route') {
                $order = Order::query()->find($second);
                if (! $order) {
                    return $this->error('Order not found', 404);
                }
                $target = Text::s($this->body()['target'] ?? '');
                $patch = VendorRouting::route($order->toArray(), [
                    'target' => ($target === 'auto' || $target === '') ? null : $target,
                    'actor' => 'admin',
                    'note' => $target === 'auto' ? 'Auto re-route by admin' : 'Assigned by admin',
                ]);
                return $this->ok(self::orderSummary(VendorRouting::saveOrderPatch($second, $patch)));
            }
        }

        if (! $first) {
            if ($method === 'GET') {
                $vendors = VendorStore::listVendors();
                $stats = self::vendorStats(array_column($vendors, 'id'));
                return $this->ok(array_map(fn ($v) => $v + ['stats' => $stats[$v['id']]], $vendors));
            }
            if ($method === 'POST') {
                $body = $this->body();
                $vendor = VendorStore::createVendor($body, $body['password'] ?? '');
                // Switch routing on automatically when the first vendor is added
                if (empty(VendorStore::settings()['enabledAt'])) {
                    VendorStore::saveSettings(['enabled' => true]);
                }
                return $this->ok($vendor, 201);
            }
        }

        $vendor = $first ? VendorStore::getVendor($first) : null;
        if (! $vendor) {
            return $this->error('Vendor not found', 404);
        }

        if (! $second) {
            if ($method === 'PUT') {
                $body = $this->body();
                return $this->ok(VendorStore::updateVendor($vendor['id'], $body, $body['password'] ?? null));
            }
            if ($method === 'DELETE') {
                $open = array_filter(self::confirmedOrders($vendor['id']), fn ($o) => $o['status'] !== 'Delivered');
                if ($open) {
                    return $this->error('This vendor has '.count($open).' open order(s). Re-assign them first.', 400);
                }
                VendorStore::deleteVendor($vendor['id']);
                return $this->ok(['deleted' => $vendor['id']]);
            }
        }

        if ($second === 'stock') {
            if ($method === 'GET') {
                return $this->ok(self::groupStock(VendorStore::listStock($vendor['id']), self::catalog()));
            }
            if ($method === 'PUT') {
                return $this->ok(self::applyStockUpdate($vendor['id'], $this->body()));
            }
        }

        if ($second === 'products') {
            if ($method === 'GET') {
                return $this->ok(self::productsPayload($vendor['id']));
            }
            if ($method === 'POST') {
                $body = $this->body();
                return $this->ok(self::addProduct($vendor['id'], Text::s($body['productId'] ?? ''), $body['stock'] ?? 0), 201);
            }
            if ($method === 'DELETE' && $third) {
                VendorStore::removeProduct($vendor['id'], $third);
                return $this->ok(['removed' => $third]);
            }
        }

        return $this->notFound();
    }
}
