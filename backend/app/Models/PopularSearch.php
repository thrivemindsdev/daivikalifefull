<?php

namespace App\Models;

use App\Casts\JsonValue;

class PopularSearch extends BaseModel
{
    protected $table = 'PopularSearch';

    public const COLUMNS = ['id', 'query', 'count', 'createdAt', 'updatedAt'];

    protected $casts = [
        'count' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
