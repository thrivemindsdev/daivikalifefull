<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Product;
use App\Services\MediaStorage;
use App\Services\ProductCatalog;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

// GET /api/categories (in the admin's order), POST /api/categories, PUT|DELETE /api/categories/:id (admin, multipart)
// PUT /api/categories/order { ids: [...] } (admin) sets the display order
class CategoryController extends ApiController
{
    protected function handle(string $method): Response
    {
        if ($method === 'GET') {
            return $this->ok(Category::ordered()->get()->map->toArray()->all());
        }
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        try {
            return match ($method) {
                'POST' => $this->create(),
                'PUT' => $this->seg(0) === 'order' && count($this->path) === 1 ? $this->reorder() : $this->update(),
                'DELETE' => $this->destroy(),
                default => $this->notFound(),
            };
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    // Subcategory names as the admin typed them: trimmed, no blanks, no case-insensitive duplicates
    private static function cleanSubcategories(mixed $list): array
    {
        $seen = [];
        $out = [];
        foreach (Json::list($list) as $s) {
            $name = is_array($s) ? Text::s($s['name'] ?? '') : Text::s($s);
            $name = mb_substr(preg_replace('/\s+/', ' ', trim($name)), 0, 60);
            $key = mb_strtolower($name);
            if ($name === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $name;
            if (count($out) >= 100) {
                break;
            }
        }
        return $out;
    }

    // Products keep their subcategory as lowercase text; clear it when that subcategory is removed
    private static function removedSubcategories(mixed $before, array $after): array
    {
        $keep = array_flip(array_map('mb_strtolower', $after));
        return array_values(array_filter(array_map('mb_strtolower', self::cleanSubcategories($before)), fn ($s) => ! isset($keep[$s])));
    }

    // Keeps products' extra categories in step with a renamed, trimmed or deleted category
    private static function syncExtraPlacements(string $oldName, ?string $newName = null, array $removedSubs = [], bool $deleted = false): void
    {
        $old = mb_strtolower($oldName);
        $newName ??= $oldName;
        foreach (Product::query()->whereNotNull('extraCategories')->get(['id', 'category', 'subcategory', 'extraCategories']) as $p) {
            $list = Json::list($p->extraCategories);
            $hit = false;
            foreach ($list as $e) {
                if (mb_strtolower(Text::s(Json::arr($e)['category'] ?? '')) === $old) {
                    $hit = true;
                    break;
                }
            }
            if (! $hit) {
                continue;
            }
            $updated = [];
            foreach ($list as $e) {
                $e = Json::arr($e);
                if (mb_strtolower(Text::s($e['category'] ?? '')) !== $old) {
                    $updated[] = $e;
                    continue;
                }
                if ($deleted) {
                    continue;
                }
                $sub = mb_strtolower(Text::s($e['subcategory'] ?? ''));
                $updated[] = ['category' => mb_strtolower($newName), 'subcategory' => in_array($sub, $removedSubs, true) ? '' : $sub];
            }
            $cleaned = ProductCatalog::cleanExtraCategories($updated, $p->category, $p->subcategory);
            if (Json::encode($cleaned) !== Json::encode($list)) {
                Product::query()->whereKey($p->id)->update(['extraCategories' => Json::encode($cleaned), 'updatedAt' => now()]);
            }
        }
    }

    private function gender(): ?string
    {
        $raw = $this->field('gender');
        if ($raw !== null && preg_match('/^jewels?$/i', trim($raw))) {
            return 'daivika';
        }
        return $raw;
    }

    private function subcategoriesField(): ?array
    {
        $raw = $this->field('subcategories');
        if (! $raw) {
            return null;
        }
        $decoded = Json::decode($raw);
        return $decoded === null ? null : self::cleanSubcategories($decoded);
    }

    private function create(): Response
    {
        $name = $this->field('name');
        if (! $name) {
            return $this->error('Category name is required', 400);
        }
        $nameLc = mb_strtolower($name);
        if (Category::query()->where('name', $nameLc)->exists()) {
            return $this->error('Category already exists', 400);
        }
        $file = MediaStorage::file($this->request, 'image');
        $category = Category::query()->create([
            'name' => $nameLc,
            'image' => $file ? MediaStorage::store($file) : '',
            'gender' => $this->gender() ?: 'all',
            'subcategories' => $this->subcategoriesField() ?? [],
            // New categories go to the end of the list
            'position' => (int) Category::query()->max('position') + 1,
        ]);
        return $this->ok($category->fresh()->toArray(), 201, ['message' => 'Category created']);
    }

    // Saves the order of the whole list. `ids` is every category id in the new order; categories missing
    // from it (e.g. added by another admin meanwhile) keep their relative order after the listed ones.
    private function reorder(): Response
    {
        $ids = $this->body()['ids'] ?? null;
        if (! is_array($ids) || ! array_is_list($ids) || ! $ids) {
            return $this->error('A list of category ids is required', 400);
        }
        $ids = array_values(array_unique(array_map(fn ($id) => Text::s($id), $ids)));

        DB::transaction(function () use ($ids) {
            $current = Category::ordered()->lockForUpdate()->pluck('id')->all();
            $known = array_flip($current);
            $listed = array_values(array_filter($ids, fn ($id) => isset($known[$id])));
            $rest = array_values(array_diff($current, $listed));
            foreach (array_merge($listed, $rest) as $i => $id) {
                Category::query()->whereKey($id)->update(['position' => $i + 1]);
            }
        });

        return $this->ok(Category::ordered()->get()->map->toArray()->all(), 200, ['message' => 'Category order saved']);
    }

    private function update(): Response
    {
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Category ID is required', 400);
        }
        $name = $this->field('name');
        if (! $name) {
            return $this->error('Category name is required', 400);
        }
        $category = Category::query()->find($id);
        if (! $category) {
            return $this->error('Category not found', 404);
        }
        $nameLc = mb_strtolower($name);
        if (Category::query()->where('name', $nameLc)->where('id', '!=', $id)->exists()) {
            return $this->error('Category name already exists', 400);
        }

        $subcategories = $this->subcategoriesField();
        $file = MediaStorage::file($this->request, 'image');
        $imageUrl = $file ? MediaStorage::store($file) : '';

        $oldName = $category->name;
        $removed = $subcategories !== null ? self::removedSubcategories($category->subcategories, $subcategories) : [];

        DB::transaction(function () use ($category, $nameLc, $imageUrl, $subcategories, $oldName, $removed) {
            $category->name = $nameLc;
            if ($gender = $this->gender()) {
                $category->gender = $gender;
            }
            if ($imageUrl !== '') {
                if ($category->image) {
                    MediaStorage::delete($category->image);
                }
                $category->image = $imageUrl;
            }
            if ($subcategories !== null) {
                $category->subcategories = $subcategories;
            }
            $category->save();

            // Cascade to products
            Product::query()->where('category', $oldName)->update(['category' => $nameLc, 'updatedAt' => now()]);
            foreach ($removed as $sub) {
                Product::query()->where('category', $nameLc)->where('subcategory', $sub)->update(['subcategory' => '', 'updatedAt' => now()]);
            }
            self::syncExtraPlacements($oldName, $nameLc, $removed);
        });
        ProductCatalog::clearCache();

        return $this->ok($category->fresh()->toArray(), 200, ['message' => 'Category updated']);
    }

    private function destroy(): Response
    {
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Category ID is required', 400);
        }
        $category = Category::query()->find($id);
        if (! $category) {
            return $this->error('Category not found', 404);
        }
        $oldName = $category->name;
        if ($category->image) {
            MediaStorage::delete($category->image);
        }
        DB::transaction(function () use ($category, $oldName) {
            $category->delete();
            // Products in this category are removed; products only listed here as an extra category stay
            Product::query()->where('category', $oldName)->delete();
            self::syncExtraPlacements($oldName, null, [], true);
        });
        ProductCatalog::clearCache();
        return $this->ok(null, 200, ['message' => 'Category deleted']);
    }
}
