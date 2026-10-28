<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductGroup;
use App\Models\Review;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// Product helpers shared by the products, admin, categories and vendors endpoints
class ProductCatalog
{
    // ── Short-lived response cache ─────────────────────────
    // Every visitor's browser asks for the catalogue; one database query answers all of them for a few
    // seconds. Product edits clear it at once (by bumping the version); stock changes from orders show up
    // within CACHE_SECONDS.
    public const CACHE_SECONDS = 15;

    public static function cacheVersion(): int
    {
        return (int) Cache::get('products:version', 1);
    }

    public static function clearCache(): void
    {
        Cache::forever('products:version', self::cacheVersion() + 1);
    }

    // ── Inventory ──────────────────────────────────────────

    // Fills in a stock row for every variant/colour combination the product offers.
    // Returns true when the inventory was changed.
    public static function ensureInventory(array &$product, int $defaultStock = 50): bool
    {
        $inventory = Json::list($product['inventory'] ?? null);
        $modified = ! is_array($product['inventory'] ?? null) || ! array_is_list($product['inventory']);
        $variants = Json::list($product['variants'] ?? []);
        $colors = Json::list($product['colors'] ?? []);
        $textures = Json::list($product['textures'] ?? []);
        $name = fn ($x) => is_array($x) ? Text::s($x['name'] ?? '') : Text::s($x);

        if (! $inventory) {
            if ($variants) {
                foreach ($variants as $v) {
                    $v = Json::arr($v);
                    foreach (Json::list($v['colors'] ?? []) as $c) {
                        $inventory[] = ['variant' => $v['name'] ?? '', 'color' => $c, 'stock' => $defaultStock];
                    }
                }
            } elseif ($colors) {
                foreach ($colors as $c) {
                    $inventory[] = ['variant' => '', 'color' => $name($c), 'stock' => $defaultStock];
                }
            } elseif ($textures) {
                foreach ($textures as $t) {
                    $inventory[] = ['variant' => '', 'color' => $name($t), 'stock' => $defaultStock];
                }
            } else {
                $inventory[] = ['variant' => '', 'color' => '', 'stock' => $defaultStock];
            }
            $modified = true;
        } else {
            // Add missing combinations
            $has = function (callable $match) use (&$inventory) {
                foreach ($inventory as $inv) {
                    if ($match(Json::arr($inv))) {
                        return true;
                    }
                }
                return false;
            };
            if ($variants) {
                foreach ($variants as $v) {
                    $v = Json::arr($v);
                    $vName = Text::s($v['name'] ?? '');
                    foreach (Json::list($v['colors'] ?? []) as $c) {
                        $cName = Text::s($c);
                        if (! $has(fn ($inv) => Text::s($inv['variant'] ?? '') === $vName && Text::s($inv['color'] ?? '') === $cName)) {
                            $inventory[] = ['variant' => $v['name'] ?? '', 'color' => $c, 'stock' => 50];
                            $modified = true;
                        }
                    }
                }
            } elseif ($colors) {
                foreach ($colors as $c) {
                    $cName = $name($c);
                    if (! $has(fn ($inv) => Text::s($inv['variant'] ?? '') === '' && Text::s($inv['color'] ?? '') === $cName)) {
                        $inventory[] = ['variant' => '', 'color' => $cName, 'stock' => 50];
                        $modified = true;
                    }
                }
            } elseif ($textures) {
                foreach ($textures as $t) {
                    $tName = $name($t);
                    if (! $has(fn ($inv) => Text::s($inv['variant'] ?? '') === '' && mb_strtolower(Text::s($inv['color'] ?? '')) === mb_strtolower($tName))) {
                        $inventory[] = ['variant' => '', 'color' => $tName, 'stock' => 50];
                        $modified = true;
                    }
                }
            }
        }
        $product['inventory'] = $inventory;
        return $modified;
    }

    // Same as ensureInventory on a model, saved when it changed
    public static function ensureInventorySaved(Product $product, int $defaultStock = 50): void
    {
        $data = ['inventory' => $product->inventory, 'variants' => $product->variants, 'colors' => $product->colors, 'textures' => $product->textures];
        if (self::ensureInventory($data, $defaultStock)) {
            $product->inventory = $data['inventory'];
            $product->save();
        }
    }

    // ── Ratings ────────────────────────────────────────────

    // [productId => ['rating' => avg, 'count' => n]]
    public static function ratings(?array $productIds = null): array
    {
        $q = Review::query()->select('productId', DB::raw('AVG("rating") AS avg_rating'), DB::raw('COUNT(*) AS review_count'))->groupBy('productId');
        if ($productIds !== null) {
            if (! $productIds) {
                return [];
            }
            $q->whereIn('productId', $productIds);
        }
        $map = [];
        foreach ($q->get() as $row) {
            $map[$row->productId] = ['rating' => (float) $row->avg_rating, 'count' => (int) $row->review_count];
        }
        return $map;
    }

    // ── Product groups ─────────────────────────────────────

    public static function groupProductIds(ProductGroup $g): array
    {
        $ids = [];
        foreach (Json::list($g->productIds) as $p) {
            $id = is_array($p) ? ($p['_id'] ?? ($p['id'] ?? null)) : $p;
            if ($id !== null && $id !== '') {
                $ids[] = (string) $id;
            }
        }
        return $ids;
    }

    // A group with its products filled in (`products`), as the admin dashboard and checkout expect
    public static function populateGroup(ProductGroup $g, ?array $productsById = null): array
    {
        $ids = self::groupProductIds($g);
        if ($productsById === null) {
            $productsById = Product::query()->whereIn('id', $ids)->get()->keyBy('id')->map->toArray()->all();
        }
        $data = $g->toArray();
        $data['products'] = array_values(array_filter(array_map(fn ($id) => $productsById[$id] ?? null, $ids)));
        return $data;
    }

    public static function populatedGroups(): array
    {
        $groups = ProductGroup::query()->get();
        $allIds = [];
        foreach ($groups as $g) {
            $allIds = array_merge($allIds, self::groupProductIds($g));
        }
        $products = Product::query()->whereIn('id', array_unique($allIds))->get()->keyBy('id')->map->toArray()->all();
        return $groups->map(fn ($g) => self::populateGroup($g, $products))->all();
    }

    // The product group (with a short card for each product) a product belongs to, or null
    public static function groupFor(string $productId): ?array
    {
        $group = ProductGroup::query()->whereRaw('"productIds" @> ?::jsonb', [Json::encode([$productId])])->first();
        if (! $group) {
            return null;
        }
        $ids = self::groupProductIds($group);
        $byId = Product::query()->whereIn('id', $ids)->get(['id', 'name', 'price', 'mrp', 'image', 'colors'])->keyBy('id');
        $products = [];
        foreach ($ids as $id) {
            if ($p = $byId->get($id)) {
                $products[] = ['_id' => $p->id, 'name' => $p->name, 'price' => $p->price, 'mrp' => $p->mrp, 'image' => $p->image, 'colors' => Json::list($p->colors)];
            }
        }
        return ['_id' => $group->id, 'name' => $group->name, 'products' => $products];
    }

    // ── Categories ─────────────────────────────────────────

    private static function catKey(mixed $v): string
    {
        $s = mb_strtolower(trim(Text::s($v)));
        $s = preg_replace('/[-_]/', ' ', $s);
        return preg_replace('/\s+/', ' ', $s);
    }

    // Cleans the extra-category list sent by the admin form: lowercase, no blanks, no duplicates,
    // nothing equal to the main placement (max 20)
    public static function cleanExtraCategories(mixed $list, mixed $mainCategory = '', mixed $mainSubcategory = ''): array
    {
        if (is_string($list)) {
            $list = Json::decode($list, []);
        }
        $seen = [self::catKey($mainCategory).'|'.self::catKey($mainSubcategory) => true];
        $out = [];
        foreach (Json::list($list) as $item) {
            $item = Json::arr($item);
            $category = mb_substr(mb_strtolower(trim(Text::s($item['category'] ?? ''))), 0, 80);
            $subcategory = mb_substr(mb_strtolower(trim(Text::s($item['subcategory'] ?? ''))), 0, 80);
            if ($category === '') {
                continue;
            }
            $id = self::catKey($category).'|'.self::catKey($subcategory);
            if (isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $out[] = ['category' => $category, 'subcategory' => $subcategory];
            if (count($out) >= 20) {
                break;
            }
        }
        return $out;
    }
}
