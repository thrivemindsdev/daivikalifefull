<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Services\MediaStorage;
use App\Services\ProductCatalog;
use App\Services\VendorStore;
use App\Support\Api;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

// GET    /api/products, /api/products/:id, /api/products/groups, /api/products/stock, /api/products/events
// POST   /api/products (admin, multipart), /api/products/stock { action: 'update', ... } (admin)
// PUT    /api/products/:id (admin, multipart)
// DELETE /api/products/:id (admin)
class ProductController extends ApiController
{
    // Long-form product content fields, sent as plain text by the admin product form
    private const DETAIL_FIELDS = ['shortDescription', 'benefits', 'astrologySignificance', 'howToWear'];

    protected function handle(string $method): Response
    {
        return match ($method) {
            'GET' => $this->get(),
            'POST' => $this->post(),
            'PUT' => $this->put(),
            'DELETE' => $this->delete(),
            default => $this->notFound(),
        };
    }

    // ── GET ────────────────────────────────────────────────

    private function get(): Response
    {
        $first = $this->seg(0);
        if ($first === 'groups') {
            return $this->ok(ProductCatalog::populatedGroups());
        }
        if ($first === 'events') {
            return $this->events();
        }
        if ($first === 'stock') {
            return $this->stockList();
        }
        if (count($this->path) > 1) {
            return $this->notFound();
        }

        // Product lists and details are cached for a few seconds (the `t` cache-busting parameter is ignored)
        $query = $this->request->query();
        unset($query['t']);
        ksort($query);
        $key = 'products:'.ProductCatalog::cacheVersion().':'.implode('/', $this->path).'?'.http_build_query($query);
        $cached = Cache::get($key);
        if (is_array($cached)) {
            return Api::json($cached);
        }

        $res = $first === null ? $this->listProducts() : $this->showProduct($first);
        if ($res['status'] !== 200) {
            return Api::json($res['body'], $res['status']);
        }
        $body = $res['body'];
        try {
            $totals = VendorStore::stockTotals();
            if ($totals) {
                $body['data'] = $first === null
                    ? array_map(fn ($p) => VendorStore::withVendorStock($p, $totals), $body['data'])
                    : VendorStore::withVendorStock($body['data'], $totals);
            }
        } catch (\Throwable $e) {
            logger()->warning('Vendor stock merge failed: '.$e->getMessage());
        }
        Cache::put($key, $body, ProductCatalog::CACHE_SECONDS);
        return Api::json($body);
    }

    private function listProducts(): array
    {
        $products = Product::query()->orderByDesc('createdAt')->get();
        $ratings = ProductCatalog::ratings();
        $data = [];
        foreach ($products as $p) {
            $arr = $p->toArray();
            if (! Json::list($arr['inventory'] ?? null)) {
                ProductCatalog::ensureInventory($arr);
            }
            $arr['ratingInfo'] = $ratings[$p->id] ?? ['rating' => 0, 'count' => 0];
            $data[] = $arr;
        }
        return ['status' => 200, 'body' => ['success' => true, 'data' => $data]];
    }

    private function showProduct(string $id): array
    {
        $product = Product::query()->find($id);
        if (! $product) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Product not found']];
        }
        Product::query()->where('id', $id)->increment('views', 1, ['updatedAt' => $product->updatedAt]);
        $product->views = (int) $product->views + 1;
        $arr = $product->toArray();
        ProductCatalog::ensureInventory($arr);
        $arr['ratingInfo'] = ProductCatalog::ratings([$id])[$id] ?? ['rating' => 0, 'count' => 0];
        try {
            if ($group = ProductCatalog::groupFor($id)) {
                $arr['productGroup'] = $group;
            }
        } catch (\Throwable $e) {
            logger()->warning('Failed to attach product group information: '.$e->getMessage());
        }
        return ['status' => 200, 'body' => ['success' => true, 'data' => $arr]];
    }

    private function stockList(): Response
    {
        $data = [];
        foreach (Product::query()->orderByDesc('createdAt')->get() as $p) {
            $arr = $p->toArray();
            if (! Json::list($arr['inventory'] ?? null)) {
                ProductCatalog::ensureInventory($arr);
            }
            $data[] = $arr;
        }
        return $this->ok($data);
    }

    // Live product updates. PHP workers can't hold a stream open per visitor, so this confirms the
    // connection and closes; the storefront then refreshes products by polling.
    private function events(): Response
    {
        return response("data: {\"type\":\"connected\"}\n\n", 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    // ── POST ───────────────────────────────────────────────

    private function post(): Response
    {
        if ($this->seg(0) === 'stock') {
            return $this->updateStock();
        }
        if ($this->path) {
            return $this->notFound();
        }
        if (! $this->admin()) {
            return $this->notAdmin();
        }

        try {
            $name = $this->field('name');
            $price = $this->field('price');
            $mrp = $this->field('mrp');
            $category = $this->field('category');
            $subcategory = $this->field('subcategory');
            $initialStockRaw = $this->field('initialStock');
            $initialStock = $initialStockRaw !== null ? Text::numOrNull($initialStockRaw) : 50;

            if (trim((string) $name) === '') {
                return $this->error('Product name is required', 400);
            }
            if (mb_strlen($name) > 200) {
                return $this->error('Product name must be 200 characters or fewer', 400);
            }
            $priceNum = Text::numOrNull($price);
            if (! ($priceNum > 0) || $priceNum > 10000000) {
                return $this->error('Price must be a positive amount', 400);
            }
            if ($mrp !== null && $mrp !== '' && ! (Text::numOrNull($mrp) >= 0 && Text::numOrNull($mrp) !== null)) {
                return $this->error('MRP cannot be negative', 400);
            }
            if ($initialStock === null || floor($initialStock) != $initialStock || $initialStock < 0) {
                return $this->error('Stock must be a whole number of 0 or more', 400);
            }
            if (trim((string) $category) === '') {
                return $this->error('Category is required', 400);
            }

            $colors = $this->jsonField('colors') ?? [];
            $textures = $this->jsonField('textures') ?? [];
            $mainFile = MediaStorage::file($this->request, 'image');
            $firstColorImage = $this->firstImage($colors);
            $firstTextureImage = $this->firstImage($textures);
            if (! $mainFile && ! $firstColorImage && ! $firstTextureImage) {
                return $this->error('Please upload a product image', 400);
            }

            $subImages = [];
            foreach ($this->subImageIndexes() as $i) {
                if ($file = MediaStorage::file($this->request, "subImage$i")) {
                    $subImages[] = MediaStorage::store($file);
                }
            }
            $image = $mainFile ? MediaStorage::store($mainFile) : ($firstColorImage ?: $firstTextureImage);

            $categoryLc = mb_strtolower($category);
            $subcategoryLc = $subcategory ? mb_strtolower($subcategory) : '';
            $product = new Product;
            $product->fill([
                'name' => $name,
                'code' => $this->field('code') ?: '',
                'price' => (float) $priceNum,
                'mrp' => (float) Text::num($mrp),
                'category' => $categoryLc,
                'subcategory' => $subcategoryLc,
                'extraCategories' => ProductCatalog::cleanExtraCategories($this->field('extraCategories'), $category, $subcategory),
                'image' => $image,
                'subImages' => array_slice($subImages, 0, 4),
                'description' => $this->field('description') ?? '',
                'specifications' => $this->jsonField('specifications') ?? [],
                'highlights' => $this->jsonField('highlights') ?? [],
                'featured' => $this->field('featured') === 'true',
                'gender' => $this->gender() ?: 'all',
                'badge' => $this->field('badge') ?: '',
                'badgeBg' => $this->field('badgeBg') ?: '',
                'badgeColor' => $this->field('badgeColor') ?: '',
                'bulkMinQty' => $this->field('bulkMinQty') ? (int) Text::num($this->field('bulkMinQty')) : null,
                'bulkPrice' => $this->field('bulkPrice') ? (float) Text::num($this->field('bulkPrice')) : null,
                'variants' => $this->jsonField('variants') ?? [],
                'colors' => $colors,
                'textures' => $textures,
            ] + $this->detailFields());
            $data = ['inventory' => [], 'variants' => $product->variants, 'colors' => $product->colors, 'textures' => $product->textures];
            ProductCatalog::ensureInventory($data, (int) $initialStock);
            $product->inventory = $data['inventory'];
            $product->save();

            ProductCatalog::clearCache();
            return $this->ok($product->fresh()->toArray(), 201);
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    // Admin edit / override / increment of one stock row (stock is taken when an order's payment is
    // confirmed, so there is no public "sell" action)
    private function updateStock(): Response
    {
        try {
            $body = $this->body();
            if (($body['action'] ?? null) !== 'update') {
                return $this->error('Invalid stock action', 400);
            }
            if (! $this->admin()) {
                return $this->notAdmin();
            }
            $productId = Text::s($body['productId'] ?? '');
            if ($productId === '') {
                return $this->error('Product ID is required', 400);
            }
            $product = Product::query()->find($productId);
            if (! $product) {
                return $this->error('Product not found', 404);
            }
            ProductCatalog::ensureInventorySaved($product);

            $variant = Text::s($body['variant'] ?? '');
            $color = Text::s($body['color'] ?? '');
            $inventory = Json::list($product->inventory);
            $idx = null;
            foreach ($inventory as $i => $inv) {
                $inv = Json::arr($inv);
                if (Text::s($inv['variant'] ?? '') === $variant && Text::s($inv['color'] ?? '') === $color) {
                    $idx = $i;
                    break;
                }
            }
            if ($idx === null) {
                $inventory[] = ['variant' => $variant, 'color' => $color, 'stock' => 0];
                $idx = count($inventory) - 1;
            }
            $row = Json::arr($inventory[$idx]);
            $amount = Text::num($body['stock'] ?? 0);
            $row['stock'] = ($body['mode'] ?? null) === 'add' ? Text::num($row['stock'] ?? 0) + $amount : $amount;
            if ($row['stock'] < 0) {
                $row['stock'] = 0;
            }
            $inventory[$idx] = $row;
            $product->inventory = $inventory;
            $product->save();

            ProductCatalog::clearCache();
            return $this->ok($product->fresh()->toArray(), 200, ['message' => 'Stock updated successfully!']);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    // ── PUT ────────────────────────────────────────────────

    private function put(): Response
    {
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Product ID is required', 400);
        }

        try {
            $name = $this->field('name');
            $price = $this->field('price');
            $mrp = $this->field('mrp');
            if ($price !== null && $price !== '' && (! (Text::numOrNull($price) > 0) || Text::numOrNull($price) > 10000000)) {
                return $this->error('Price must be a positive amount', 400);
            }
            if ($mrp !== null && $mrp !== '' && ! (Text::numOrNull($mrp) !== null && Text::numOrNull($mrp) >= 0)) {
                return $this->error('MRP cannot be negative', 400);
            }
            if ($name !== null && trim($name) === '') {
                return $this->error('Product name cannot be empty', 400);
            }

            $product = Product::query()->find($id);
            if (! $product) {
                return $this->error('Product not found', 404);
            }

            $colors = $this->jsonField('colors');
            $textures = $this->jsonField('textures');
            $mainFile = MediaStorage::file($this->request, 'image');
            $newImage = null;
            if ($mainFile) {
                $newImage = MediaStorage::store($mainFile);
            } elseif ($img = $this->firstImage($colors ?? [])) {
                $newImage = $img;
            } elseif ($img = $this->firstImage($textures ?? [])) {
                $newImage = $img;
            }
            $existingSubImages = $this->field('existingSubImages') ? $this->jsonField('existingSubImages') : null;
            if (! is_array($existingSubImages) || ! array_is_list($existingSubImages)) {
                $existingSubImages = null;
            }

            $set = fn (string $field, mixed $value) => $product->setAttribute($field, $value);
            if ($name !== null) {
                $set('name', $name);
            }
            if (($code = $this->field('code')) !== null) {
                $set('code', $code);
            }
            if ($price !== null) {
                $set('price', (float) Text::num($price));
            }
            if ($mrp !== null) {
                $set('mrp', (float) Text::num($mrp));
            }
            if (($category = $this->field('category')) !== null) {
                $set('category', mb_strtolower($category));
            }
            if (($subcategory = $this->field('subcategory')) !== null) {
                $set('subcategory', mb_strtolower($subcategory));
            }
            if (($description = $this->field('description')) !== null) {
                $set('description', $description);
            }
            foreach ($this->detailFields() as $k => $v) {
                $set($k, $v);
            }
            if (($extra = $this->field('extraCategories')) !== null) {
                $set('extraCategories', ProductCatalog::cleanExtraCategories($extra, $product->category, $product->subcategory));
            }
            foreach (['specifications', 'highlights', 'variants'] as $k) {
                if (($v = $this->jsonField($k)) !== null) {
                    $set($k, $v);
                }
            }
            if ($colors !== null) {
                $set('colors', $colors);
            }
            if ($textures !== null) {
                $set('textures', $textures);
            }
            if (($featured = $this->field('featured')) !== null) {
                $set('featured', $featured === 'true');
            }
            if (($gender = $this->gender()) !== null) {
                $set('gender', $gender);
            }
            foreach (['badge', 'badgeBg', 'badgeColor'] as $k) {
                if (($v = $this->field($k)) !== null) {
                    $set($k, $v);
                }
            }
            if (($v = $this->field('bulkMinQty')) !== null) {
                $set('bulkMinQty', $v ? (int) Text::num($v) : null);
            }
            if (($v = $this->field('bulkPrice')) !== null) {
                $set('bulkPrice', $v ? (float) Text::num($v) : null);
            }

            if ($newImage !== null) {
                $old = $product->getOriginal('image');
                if ($old && $old !== $newImage) {
                    $stillUsed = ($colors && $this->imageIn($colors, $old)) || (is_array($existingSubImages) && in_array($old, $existingSubImages, true));
                    if (! $stillUsed) {
                        MediaStorage::delete($old);
                    }
                }
                $set('image', $newImage);
            }

            if (is_array($existingSubImages)) {
                // Removed sub-images are deleted from storage
                foreach (Json::list($product->getOriginal('subImages')) as $oldUrl) {
                    if ($oldUrl && ! in_array($oldUrl, $existingSubImages, true)) {
                        MediaStorage::delete($oldUrl);
                    }
                }
                $final = [];
                foreach (array_values($existingSubImages) as $i => $slot) {
                    if ($file = MediaStorage::file($this->request, "subImage$i")) {
                        $final[] = MediaStorage::store($file);
                    } elseif (is_string($slot) && $slot !== '') {
                        $final[] = $slot;
                    }
                }
                $set('subImages', array_slice($final, 0, 4));
            }

            $product->save();
            ProductCatalog::ensureInventorySaved($product);

            ProductCatalog::clearCache();
            return $this->ok($product->fresh()->toArray(), 200, ['message' => 'Product updated successfully!']);
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    // ── DELETE ─────────────────────────────────────────────

    private function delete(): Response
    {
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Product ID is required', 400);
        }
        try {
            $product = Product::query()->find($id);
            if (! $product) {
                return $this->error('Product not found', 404);
            }
            MediaStorage::delete($product->image);
            foreach (Json::list($product->subImages) as $url) {
                MediaStorage::delete($url);
            }
            $product->delete();
            ProductCatalog::clearCache();
            return $this->ok(null, 200, ['message' => 'Product successfully removed']);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    // ── Form helpers ───────────────────────────────────────

    // A JSON form field (null when missing or empty; [] when it isn't valid JSON)
    private function jsonField(string $name): mixed
    {
        $raw = $this->field($name);
        if ($raw === null || $raw === '') {
            return null;
        }
        $decoded = Json::decode($raw, []);
        return $decoded ?? [];
    }

    private function detailFields(): array
    {
        $out = [];
        foreach (self::DETAIL_FIELDS as $k) {
            if (($v = $this->field($k)) !== null) {
                $out[$k] = trim($v);
            }
        }
        return $out;
    }

    // Daivika is the only store: the old 'jewels' store is saved as 'daivika'
    private function gender(): ?string
    {
        $raw = $this->field('gender');
        if ($raw !== null && preg_match('/^jewels?$/i', trim($raw))) {
            return 'daivika';
        }
        return $raw;
    }

    private function firstImage(mixed $list): ?string
    {
        foreach (Json::list($list) as $item) {
            $img = Json::arr($item)['image'] ?? null;
            if (is_string($img) && $img !== '') {
                return $img;
            }
        }
        return null;
    }

    private function imageIn(mixed $list, string $url): bool
    {
        foreach (Json::list($list) as $item) {
            if ((Json::arr($item)['image'] ?? null) === $url) {
                return true;
            }
        }
        return false;
    }

    // Indexes of the subImage<N> files sent with the form, in order
    private function subImageIndexes(): array
    {
        $max = -1;
        foreach (array_keys($this->request->files->all()) as $key) {
            if (preg_match('/^subImage(\d+)/', (string) $key, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }
        return $max < 0 ? [] : range(0, $max);
    }
}
