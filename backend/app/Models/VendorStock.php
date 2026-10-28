<?php

namespace App\Models;

use App\Casts\JsonValue;

class VendorStock extends BaseModel
{
    protected $table = 'VendorStock';

    public const COLUMNS = ['id', 'vendorId', 'productId', 'variant', 'color', 'stock', 'isActive', 'createdAt', 'updatedAt'];

    protected $casts = [
        'stock' => 'integer',
        'isActive' => 'boolean',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
