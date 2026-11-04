<?php

namespace App\Models;

// A customer asking to be told when a sold-out product (variant / colour) is back
class StockNotification extends BaseModel
{
    protected $table = 'StockNotification';

    public const COLUMNS = ['id', 'productId', 'variant', 'color', 'phone', 'userId', 'status', 'notifiedAt', 'createdAt', 'updatedAt'];

    protected $casts = [
        'notifiedAt' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
