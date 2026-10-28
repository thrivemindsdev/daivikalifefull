<?php

namespace App\Http\Controllers\Api;

use App\Models\Size;
use App\Support\Text;
use Symfony\Component\HttpFoundation\Response;

// GET /api/sizes, POST /api/sizes { name }, PUT|DELETE /api/sizes/:id (admin)
class SizeController extends ApiController
{
    protected function handle(string $method): Response
    {
        if ($method === 'GET') {
            return $this->ok(Size::query()->orderBy('createdAt')->get()->map->toArray()->all());
        }
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        try {
            if ($method === 'POST') {
                $name = trim(Text::s($this->body()['name'] ?? ''));
                if ($name === '') {
                    return $this->error('Size name is required', 400);
                }
                if ($this->nameTaken($name)) {
                    return $this->error('Size already exists', 400);
                }
                return $this->ok(Size::query()->create(['name' => $name])->fresh()->toArray(), 201, ['message' => 'Size created']);
            }

            $id = $this->seg(0);
            if ($id === null) {
                return $this->error('Size ID is required', 400);
            }

            if ($method === 'PUT') {
                $name = trim(Text::s($this->body()['name'] ?? ''));
                if ($name === '') {
                    return $this->error('Size name is required', 400);
                }
                $size = Size::query()->find($id);
                if (! $size) {
                    return $this->error('Size not found', 404);
                }
                if ($this->nameTaken($name, $id)) {
                    return $this->error('Size name already exists', 400);
                }
                $size->name = $name;
                $size->save();
                return $this->ok($size->fresh()->toArray(), 200, ['message' => 'Size updated']);
            }

            if ($method === 'DELETE') {
                $size = Size::query()->find($id);
                if (! $size) {
                    return $this->error('Size not found', 404);
                }
                $size->delete();
                return $this->ok(null, 200, ['message' => 'Size deleted']);
            }
            return $this->notFound();
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    private function nameTaken(string $name, ?string $exceptId = null): bool
    {
        $q = Size::query()->whereRaw('LOWER("name") = ?', [mb_strtolower($name)]);
        if ($exceptId) {
            $q->where('id', '!=', $exceptId);
        }
        return $q->exists();
    }
}
