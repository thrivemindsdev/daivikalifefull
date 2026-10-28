<?php

namespace App\Models;

use App\Casts\JsonValue;

class Newsletter extends BaseModel
{
    protected $table = 'Newsletter';

    public const COLUMNS = ['id', 'email', 'createdAt', 'updatedAt'];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
