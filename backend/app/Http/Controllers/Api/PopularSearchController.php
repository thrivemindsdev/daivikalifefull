<?php

namespace App\Http\Controllers\Api;

use App\Models\PopularSearch;
use App\Support\Text;
use Symfony\Component\HttpFoundation\Response;

// GET /api/popular-searches, POST { query }, PUT|DELETE /api/popular-searches/:id (admin)
class PopularSearchController extends ApiController
{
    protected function handle(string $method): Response
    {
        if ($method === 'GET') {
            return $this->ok(PopularSearch::query()->orderByDesc('createdAt')->get()->map->toArray()->all());
        }
        if (! $this->admin()) {
            return $this->notAdmin();
        }
        try {
            if ($method === 'POST') {
                $query = Text::s($this->body()['query'] ?? '');
                if ($query === '') {
                    return $this->error('Search tag query is required.', 400);
                }
                if ($this->taken($query)) {
                    return $this->error('Search tag already exists.', 400);
                }
                return $this->ok(PopularSearch::query()->create(['query' => $query])->fresh()->toArray(), 201);
            }

            $id = $this->seg(0);
            if ($id === null) {
                return $this->error('Search tag ID is required', 400);
            }

            if ($method === 'PUT') {
                $query = Text::s($this->body()['query'] ?? '');
                if ($query === '') {
                    return $this->error('Search tag query is required.', 400);
                }
                if ($this->taken($query, $id)) {
                    return $this->error('Another search tag with this name already exists.', 400);
                }
                $tag = PopularSearch::query()->find($id);
                if (! $tag) {
                    return $this->error('Search tag not found', 404);
                }
                $tag->query = $query;
                $tag->save();
                return $this->ok($tag->fresh()->toArray());
            }

            if ($method === 'DELETE') {
                $tag = PopularSearch::query()->find($id);
                if (! $tag) {
                    return $this->error('Search tag not found', 404);
                }
                $tag->delete();
                return $this->ok(null, 200, ['message' => 'Search tag removed successfully']);
            }
            return $this->notFound();
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    private function taken(string $query, ?string $exceptId = null): bool
    {
        $q = PopularSearch::query()->whereRaw('LOWER("query") = ?', [mb_strtolower($query)]);
        if ($exceptId) {
            $q->where('id', '!=', $exceptId);
        }
        return $q->exists();
    }
}
