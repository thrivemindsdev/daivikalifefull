<?php

namespace App\Services;

use App\Models\User;
use App\Support\Jwt;
use Illuminate\Http\Request;

class AuthService
{
    // The signed-in account for a "Bearer <token>" request, or null. The role always comes from the
    // stored account, never from the token.
    public static function user(Request $request): ?User
    {
        $header = (string) $request->header('authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            return null;
        }
        $token = trim(substr($header, 7));
        if ($token === '' || $token === 'undefined' || $token === 'null') {
            return null;
        }
        try {
            $payload = Jwt::verify($token);
        } catch (\Throwable $e) {
            logger()->error('Auth verification failed: '.$e->getMessage());
            return null;
        }
        $id = $payload['id'] ?? null;
        if (! is_string($id) || $id === '') {
            return null;
        }
        return User::query()->find($id);
    }

    public static function token(string $userId): string
    {
        return Jwt::sign(['id' => $userId]);
    }

    // The admin account defined by ADMIN_EMAIL / ADMIN_PASSWORD. Development falls back to a local default;
    // production only enables it when both variables are set.
    public static function envAdmin(): array
    {
        $prod = app()->environment('production');
        $email = strtolower(trim((string) (config('daivika.admin.email') ?: ($prod ? '' : 'admin@daivika.in'))));
        $password = (string) (config('daivika.admin.password') ?: ($prod ? '' : 'admin@123'));
        return [
            'configured' => $email !== '' && $password !== '',
            'email' => $email,
            'password' => $password,
            'name' => (string) (config('daivika.admin.name') ?: 'Daivika Administrator'),
            'phone' => trim((string) config('daivika.admin.phone', '')),
        ];
    }

    // Account fields that are safe to send to the browser
    public static function publicUser(?User $user): ?array
    {
        return $user?->toArray();
    }
}
