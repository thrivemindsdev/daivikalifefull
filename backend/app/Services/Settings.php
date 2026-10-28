<?php

namespace App\Services;

use App\Models\Setting;

// Key/value store settings (the "Setting" table): coupons, shipping zones, invoice details, Meta Pixel ...
class Settings
{
    public static function get(string $key, mixed $default = null): mixed
    {
        $row = Setting::query()->where('key', $key)->first();
        return $row ? $row->value : $default;
    }

    public static function has(string $key): bool
    {
        return Setting::query()->where('key', $key)->exists();
    }

    public static function put(string $key, mixed $value): void
    {
        $row = Setting::query()->where('key', $key)->first() ?? new Setting(['key' => $key]);
        $row->value = $value;
        $row->save();
    }

    // Every setting as [key => value]
    public static function all(): array
    {
        $result = [];
        foreach (Setting::query()->get() as $row) {
            $result[$row->key] = $row->value;
        }
        return $result;
    }
}
