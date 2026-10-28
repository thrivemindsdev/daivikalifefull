<?php

namespace App\Models;

use App\Casts\JsonValue;

class Collection extends BaseModel
{
    protected $table = 'Collection';

    public const COLUMNS = ['id', 'name', 'image', 'createdAt', 'updatedAt'];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
