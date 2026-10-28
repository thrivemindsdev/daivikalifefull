<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Response shapes shared by every endpoint: { success: true, data, ...extra } / { success: false, message, ...extra }
class Api
{
    public static function ok(mixed $data = null, int $status = 200, array $extra = []): JsonResponse
    {
        return self::json(['success' => true, 'data' => $data] + $extra, $status);
    }

    public static function error(string $message, int $status = 500, array $extra = []): JsonResponse
    {
        return self::json(['success' => false, 'message' => $message] + $extra, $status);
    }

    public static function json(mixed $body, int $status = 200, array $headers = []): JsonResponse
    {
        return new JsonResponse($body, $status, $headers, Json::FLAGS);
    }

    // JSON request body (empty objects kept as {}); [] when the body is missing or not JSON
    public static function body(Request $request): array
    {
        $decoded = Json::decode($request->getContent());
        return is_array($decoded) ? $decoded : [];
    }

    // Path segments after the route prefix, e.g. "users/12/role" -> ['users', '12', 'role']
    public static function segments(?string $path): array
    {
        if ($path === null || $path === '') {
            return [];
        }
        return array_values(array_map('rawurldecode', array_filter(explode('/', $path), fn ($s) => $s !== '')));
    }

    // First address in X-Forwarded-For (set by the storefront proxy), like the old backend
    public static function clientIp(Request $request): string
    {
        $fwd = $request->header('x-forwarded-for');
        if ($fwd) {
            return trim(explode(',', $fwd)[0]);
        }
        return trim($request->header('x-real-ip') ?: ($request->ip() ?: 'unknown'));
    }
}
