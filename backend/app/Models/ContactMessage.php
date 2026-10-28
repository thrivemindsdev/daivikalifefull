<?php

namespace App\Models;

use App\Casts\JsonValue;

class ContactMessage extends BaseModel
{
    protected $table = 'ContactMessage';

    public const COLUMNS = ['id', 'name', 'email', 'phone', 'subject', 'message', 'status', 'notes', 'createdAt', 'updatedAt'];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
