<?php

namespace App\Models;

use App\Casts\JsonValue;

class VendorReport extends BaseModel
{
    protected $table = 'VendorReport';

    public const COLUMNS = ['id', 'vendorId', 'vendorName', 'title', 'rangeFrom', 'rangeTo', 'groupBy', 'note', 'summary', 'data', 'status', 'adminNote', 'reviewedAt', 'createdAt', 'updatedAt'];

    protected $casts = [
        'rangeFrom' => 'datetime',
        'rangeTo' => 'datetime',
        'summary' => JsonValue::class,
        'data' => JsonValue::class,
        'reviewedAt' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
