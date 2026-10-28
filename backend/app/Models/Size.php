<?php

namespace App\Models;

use App\Casts\JsonValue;

class Size extends BaseModel
{
    protected $table = 'Size';

    public const COLUMNS = ['id', 'name', 'order', 'createdAt', 'updatedAt'];

    protected $casts = [
        'order' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
