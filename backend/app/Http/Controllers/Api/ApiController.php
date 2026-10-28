<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\AuthService;
use App\Support\Api;
use App\Support\MultipartParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Base for the catch-all API modules: splits the path, caches the signed-in user and the JSON body
abstract class ApiController
{
    protected Request $request;
    protected array $path = [];
    private ?array $bodyCache = null;
    private bool $userLoaded = false;
    private ?User $userCache = null;

    public function __invoke(Request $request, ?string $path = null): Response
    {
        MultipartParser::apply($request);
        $this->request = $request;
        $this->path = Api::segments($path);
        return $this->handle(strtoupper($request->method()));
    }

    abstract protected function handle(string $method): Response;

    protected function user(): ?User
    {
        if (! $this->userLoaded) {
            $this->userLoaded = true;
            $this->userCache = AuthService::user($this->request);
        }
        return $this->userCache;
    }

    protected function admin(): ?User
    {
        $u = $this->user();
        return $u && $u->role === 'admin' ? $u : null;
    }

    protected function notAdmin(): JsonResponse
    {
        return Api::error('Not authorized as an admin', 401);
    }

    protected function body(): array
    {
        return $this->bodyCache ??= Api::body($this->request);
    }

    // A multipart / form field as the browser sent it: null when missing (like FormData.get)
    protected function field(string $name): ?string
    {
        $all = $this->request->request->all();
        if (! array_key_exists($name, $all)) {
            return null;
        }
        $v = $all[$name];
        return is_array($v) ? null : (string) $v;
    }

    protected function seg(int $i): ?string
    {
        return $this->path[$i] ?? null;
    }

    protected function ok(mixed $data = null, int $status = 200, array $extra = []): JsonResponse
    {
        return Api::ok($data, $status, $extra);
    }

    protected function error(string $message, int $status = 500, array $extra = []): JsonResponse
    {
        return Api::error($message, $status, $extra);
    }

    protected function notFound(): JsonResponse
    {
        return Api::error('API endpoint not found', 404);
    }

    protected function ip(): string
    {
        return Api::clientIp($this->request);
    }
}
