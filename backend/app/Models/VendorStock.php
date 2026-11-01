<?php

namespace App\Models;

use App\Casts\JsonValue;

class VendorStock extends BaseModel
{
    protected static function booted(): void
    {
        parent::booted();
        static::saved(function (VendorStock $s) {
            if ($s->wasRecentlyCreated || $s->wasChanged('stock') || $s->wasChanged('isActive')) {
                \App\Services\RestockAlerts::schedule();
            }
        });
    }

    protected $table = 'VendorStock';

    public const COLUMNS = ['id', 'vendorId', 'productId', 'variant', 'color', 'stock', 'isActive', 'createdAt', 'updatedAt'];

    protected $casts = [
        'stock' => 'integer',
        'isActive' => 'boolean',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
