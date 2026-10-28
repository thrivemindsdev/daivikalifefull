<?php

namespace App\Services;

use App\Support\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\RateLimiter;

// Fixed-window limits kept in the cache (one server; use a shared cache such as Redis for several servers)
class RateLimit
{
    // An error response once `key` has made more than `limit` calls in `windowMs`, otherwise null
    public static function hit(string $key, int $limit, int $windowMs): ?JsonResponse
    {
        $cacheKey = 'rl:'.sha1($key);
        $decay = max(1, (int) ceil($windowMs / 1000));
        RateLimiter::hit($cacheKey, $decay);
        if (RateLimiter::attempts($cacheKey) > $limit) {
            $retry = max(1, RateLimiter::availableIn($cacheKey));
            return Api::error('Too many attempts. Please wait a few minutes and try again.', 429)
                ->header('Retry-After', (string) $retry);
        }
        return null;
    }
}
