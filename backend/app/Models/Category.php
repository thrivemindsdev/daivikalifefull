<?php

namespace App\Models;

use App\Casts\JsonValue;

class Category extends BaseModel
{
    protected $table = 'Category';

    public const COLUMNS = ['id', 'name', 'image', 'gender', 'subcategories', 'position', 'createdAt', 'updatedAt'];

    protected $casts = [
        'subcategories' => JsonValue::class,
        'position' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    // The order the admin chose (position), newest first among categories that were never moved
    public static function ordered(): \Illuminate\Database\Eloquent\Builder
    {
        return static::query()->orderBy('position')->orderByDesc('createdAt')->orderBy('id');
    }
}
