<?php

namespace App\Support;

use RuntimeException;

// HS256 JSON Web Tokens, compatible with the tokens issued by the old Node backend (jsonwebtoken),
// so customers who were already signed in stay signed in.
class Jwt
{
    private static bool $warnedExample = false;

    public static function secret(): string
    {
        $secret = (string) config('daivika.jwt_secret');
        if ($secret !== '' && preg_match('/change_me/i', $secret) && ! self::$warnedExample) {
            self::$warnedExample = true;
            logger()->error('[security] JWT_SECRET is the published example value. Replace it with a long random secret (this logs everyone out once).');
        }
        if (strlen($secret) >= 16) {
            return $secret;
        }
        if (app()->environment('production')) {
            throw new RuntimeException('JWT_SECRET must be set (at least 16 characters) in production');
        }
        return 'dev-only-insecure-jwt-secret';
    }

    public static function sign(array $claims, int $ttlSeconds = 30 * 24 * 3600): string
    {
        $now = time();
        $payload = $claims + ['iat' => $now, 'exp' => $now + $ttlSeconds];
        $header = self::b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::b64(json_encode($payload, Json::FLAGS));
        $signature = self::b64(hash_hmac('sha256', "$header.$body", self::secret(), true));
        return "$header.$body.$signature";
    }

    // The payload of a valid, unexpired HS256 token, otherwise null
    public static function verify(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $body, $signature] = $parts;
        $head = json_decode(self::unb64($header), true);
        if (! is_array($head) || ($head['alg'] ?? '') !== 'HS256') {
            return null;
        }
        $expected = self::b64(hash_hmac('sha256', "$header.$body", self::secret(), true));
        if (! hash_equals($expected, $signature)) {
            return null;
        }
        $payload = json_decode(self::unb64($body), true);
        if (! is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && is_numeric($payload['exp']) && time() >= (int) $payload['exp']) {
            return null;
        }
        if (isset($payload['nbf']) && is_numeric($payload['nbf']) && time() < (int) $payload['nbf']) {
            return null;
        }
        return $payload;
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function unb64(string $data): string
    {
        return (string) base64_decode(strtr($data, '-_', '+/').str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
