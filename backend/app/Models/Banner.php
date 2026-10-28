<?php

namespace App\Models;

use App\Casts\JsonValue;

class Banner extends BaseModel
{
    protected $table = 'Banner';

    public const COLUMNS = ['id', 'image', 'mobileImage', 'title', 'subtitle', 'description', 'link', 'buttonText', 'createdAt', 'updatedAt'];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
