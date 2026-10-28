<?php

namespace App\Casts;

use App\Support\Json;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

// JSON / JSONB columns. Empty objects stay {} instead of turning into [].
class JsonValue implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return null;
        }
        return Json::decode(is_string($value) ? $value : (string) $value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }
        return Json::encode($value);
    }
}
