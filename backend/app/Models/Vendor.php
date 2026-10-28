<?php

namespace App\Models;

use App\Casts\JsonValue;

class Vendor extends BaseModel
{
    protected $table = 'Vendor';

    public const COLUMNS = ['id', 'userId', 'name', 'businessName', 'email', 'phone', 'state', 'district', 'address', 'pincode', 'isActive', 'notes', 'createdAt', 'updatedAt'];

    protected $casts = [
        'isActive' => 'boolean',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
