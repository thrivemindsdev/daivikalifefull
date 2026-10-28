<?php

namespace App\Support;

// Small string helpers ported from the Node backend
class Text
{
    public static function lc(mixed $v): string
    {
        return mb_strtolower(trim(self::s($v)));
    }

    // String form of a scalar ('' for null, arrays and objects)
    public static function s(mixed $v): string
    {
        if ($v === null || is_array($v) || is_object($v)) {
            return '';
        }
        if (is_bool($v)) {
            return $v ? 'true' : 'false';
        }
        if (is_float($v) && floor($v) === $v && abs($v) < 1e15) {
            return (string) (int) $v;
        }
        return (string) $v;
    }

    // JavaScript-style Number(v): finite number or 0
    public static function num(mixed $v): float|int
    {
        if (is_int($v) || is_float($v)) {
            return is_finite((float) $v) ? $v : 0;
        }
        if (is_bool($v)) {
            return $v ? 1 : 0;
        }
        $s = trim(self::s($v));
        if ($s === '') {
            return 0;
        }
        if (! is_numeric($s)) {
            return 0;
        }
        $n = $s + 0;
        return is_finite((float) $n) ? $n : 0;
    }

    // Number(v) or null when it is not a valid number (NaN in JavaScript)
    public static function numOrNull(mixed $v): float|int|null
    {
        if (is_int($v) || is_float($v)) {
            return is_finite((float) $v) ? $v : null;
        }
        if ($v === null) {
            return 0;
        }
        if (is_bool($v)) {
            return $v ? 1 : 0;
        }
        $s = trim(self::s($v));
        if ($s === '') {
            return 0;
        }
        return is_numeric($s) ? $s + 0 : null;
    }

    // parseInt(v, 10): leading integer or null
    public static function parseInt(mixed $v): ?int
    {
        if (is_int($v)) {
            return $v;
        }
        if (is_float($v)) {
            return is_finite($v) ? (int) $v : null;
        }
        if (preg_match('/^\s*([+-]?\d+)/', self::s($v), $m)) {
            return (int) $m[1];
        }
        return null;
    }

    // Removes control characters, trims and limits the length
    public static function clean(mixed $v, int $max = 200): string
    {
        $s = preg_replace('/[\x00-\x1f]/u', ' ', self::s($v)) ?? '';
        return mb_substr(trim($s), 0, $max);
    }

    // The 10-digit Indian mobile number, or null if invalid
    public static function indianMobile(mixed $input): ?string
    {
        $digits = preg_replace('/\D/', '', self::s($input));
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        return preg_match('/^[6-9]\d{9}$/', $digits) ? $digits : null;
    }

    // Last 10 digits of a phone number (used to match orders to customers)
    public static function phoneKey(mixed $phone): string
    {
        return substr(preg_replace('/\D/', '', self::s($phone)), -10);
    }

    public static function truncate(string $text, int $length, string $suffix = '...'): string
    {
        return mb_strlen($text) > $length ? mb_substr($text, 0, $length).$suffix : $text;
    }

    // Short random id like the Node backend's `${prefix}_${Date.now().toString(36)}...`
    public static function randomId(string $prefix): string
    {
        return $prefix.'_'.base_convert((string) (int) (microtime(true) * 1000), 10, 36).substr(bin2hex(random_bytes(4)), 0, 6);
    }

    public static function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s').'.'.str_pad((string) ((int) (microtime(true) * 1000) % 1000), 3, '0', STR_PAD_LEFT).'Z';
    }
}
