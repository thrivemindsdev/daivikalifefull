<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use App\Services\MediaStorage;
use App\Services\ProductCatalog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

// GET /api/collections, POST /api/collections, PUT|DELETE /api/collections/:id (admin, multipart).
// Categories and products refer to a collection by name in their `gender` field.
class CollectionController extends ApiController
{
    protected function handle(string $method): Response
    {
        if ($method === 'GET') {
            return $this->ok(Collection::query()->orderBy('createdAt')->get()->map->toArray()->all());
        }
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        try {
            return match ($method) {
                'POST' => $this->create(),
                'PUT' => $this->update(),
                'DELETE' => $this->destroy(),
                default => $this->notFound(),
            };
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    private function create(): Response
    {
        $name = $this->field('name');
        if (! $name) {
            return $this->error('Collection name is required', 400);
        }
        $nameLc = mb_strtolower(trim($name));
        if (Collection::query()->where('name', $nameLc)->exists()) {
            return $this->error('Collection already exists', 400);
        }
        $file = MediaStorage::file($this->request, 'image');
        $collection = Collection::query()->create(['name' => $nameLc, 'image' => $file ? MediaStorage::store($file) : '']);
        return $this->ok($collection->fresh()->toArray(), 201, ['message' => 'Collection created']);
    }

    private function update(): Response
    {
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Collection ID is required', 400);
        }
        $name = $this->field('name');
        if (! $name) {
            return $this->error('Collection name is required', 400);
        }
        $nameLc = mb_strtolower(trim($name));
        $collection = Collection::query()->find($id);
        if (! $collection) {
            return $this->error('Collection not found', 404);
        }
        if (Collection::query()->where('name', $nameLc)->where('id', '!=', $id)->exists()) {
            return $this->error('Collection name already exists', 400);
        }
        $file = MediaStorage::file($this->request, 'image');
        $imageUrl = $file ? MediaStorage::store($file) : '';

        $oldName = $collection->name;
        DB::transaction(function () use ($collection, $nameLc, $imageUrl, $oldName) {
            $collection->name = $nameLc;
            if ($imageUrl !== '') {
                if ($collection->image) {
                    MediaStorage::delete($collection->image);
                }
                $collection->image = $imageUrl;
            }
            $collection->save();
            Category::query()->where('gender', $oldName)->update(['gender' => $nameLc, 'updatedAt' => now()]);
            Product::query()->where('gender', $oldName)->update(['gender' => $nameLc, 'updatedAt' => now()]);
        });
        ProductCatalog::clearCache();
        return $this->ok($collection->fresh()->toArray(), 200, ['message' => 'Collection updated & cascaded']);
    }

    private function destroy(): Response
    {
        $id = $this->seg(0);
        if ($id === null) {
            return $this->error('Collection ID is required', 400);
        }
        $collection = Collection::query()->find($id);
        if (! $collection) {
            return $this->error('Collection not found', 404);
        }
        $oldName = $collection->name;
        if ($collection->image) {
            MediaStorage::delete($collection->image);
        }
        DB::transaction(function () use ($collection, $oldName) {
            $collection->delete();
            // Categories and products under this collection go with it
            Category::query()->where('gender', $oldName)->delete();
            Product::query()->where('gender', $oldName)->delete();
        });
        ProductCatalog::clearCache();
        return $this->ok(null, 200, ['message' => 'Collection deleted & cascaded']);
    }
}
