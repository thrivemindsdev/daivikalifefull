<?php

namespace App\Models;

use App\Casts\JsonValue;

class ProductGroup extends BaseModel
{
    protected $table = 'ProductGroup';

    public const COLUMNS = ['id', 'name', 'productIds', 'createdAt', 'updatedAt'];

    protected $casts = [
        'productIds' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
