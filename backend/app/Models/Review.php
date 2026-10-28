<?php

namespace App\Models;

use App\Casts\JsonValue;

class Review extends BaseModel
{
    protected $table = 'Review';

    public const COLUMNS = ['id', 'productId', 'user', 'email', 'productName', 'rating', 'comment', 'orderId', 'likes', 'replies', 'createdAt', 'updatedAt'];

    protected $casts = [
        'rating' => 'integer',
        'likes' => 'integer',
        'replies' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
