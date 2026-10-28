<?php

namespace App\Support;

use stdClass;

// JSON helpers that keep the difference between {} and [] (PHP arrays can't), so data saved by the
// storefront comes back exactly as it was sent.
class Json
{
    public const FLAGS = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE;

    // Objects become associative arrays, except empty objects which stay as stdClass (encoded as {})
    public static function decode(?string $json, mixed $default = null): mixed
    {
        if ($json === null || $json === '') {
            return $default;
        }
        $value = json_decode($json, false, 512, JSON_BIGINT_AS_STRING);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $default;
        }
        return self::normalize($value);
    }

    public static function normalize(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $vars = get_object_vars($value);
            if (! $vars) {
                return new stdClass;
            }
            return array_map([self::class, 'normalize'], $vars);
        }
        if (is_array($value)) {
            return array_map([self::class, 'normalize'], $value);
        }
        return $value;
    }

    public static function encode(mixed $value): string
    {
        return json_encode($value, self::FLAGS);
    }

    // Any value as a PHP array ({} and non-arrays become [])
    public static function arr(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if ($value instanceof stdClass) {
            return get_object_vars($value);
        }
        return [];
    }

    // A list (JSON array). Objects and scalars give []
    public static function list(mixed $value): array
    {
        return is_array($value) && array_is_list($value) ? $value : [];
    }

    // An associative array for a JSON object; anything else gives []
    public static function obj(mixed $value): array
    {
        if ($value instanceof stdClass) {
            return get_object_vars($value);
        }
        return is_array($value) && ($value === [] || ! array_is_list($value)) ? $value : [];
    }

    // Value for an object field that must be sent as {} when empty
    public static function object(array $value): array|stdClass
    {
        return $value === [] ? new stdClass : $value;
    }
}
