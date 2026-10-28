<?php

namespace App\Models;

use App\Casts\JsonValue;

class Product extends BaseModel
{
    protected $table = 'Product';

    public const COLUMNS = ['id', 'name', 'code', 'price', 'mrp', 'category', 'subcategory', 'extraCategories', 'image', 'subImages', 'description', 'shortDescription', 'benefits', 'astrologySignificance', 'howToWear', 'specifications', 'highlights', 'featured', 'gender', 'badge', 'badgeBg', 'badgeColor', 'bulkMinQty', 'bulkPrice', 'colors', 'textures', 'variants', 'inventory', 'views', 'createdAt', 'updatedAt'];

    protected $casts = [
        'price' => 'float',
        'mrp' => 'float',
        'extraCategories' => JsonValue::class,
        'subImages' => JsonValue::class,
        'specifications' => JsonValue::class,
        'highlights' => JsonValue::class,
        'featured' => 'boolean',
        'bulkMinQty' => 'integer',
        'bulkPrice' => 'float',
        'colors' => JsonValue::class,
        'textures' => JsonValue::class,
        'variants' => JsonValue::class,
        'inventory' => JsonValue::class,
        'views' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
