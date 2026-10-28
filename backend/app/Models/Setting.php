<?php

namespace App\Models;

use App\Casts\JsonValue;

class Setting extends BaseModel
{
    protected $table = 'Setting';

    public const COLUMNS = ['id', 'key', 'value', 'createdAt', 'updatedAt'];

    protected $casts = [
        'value' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
