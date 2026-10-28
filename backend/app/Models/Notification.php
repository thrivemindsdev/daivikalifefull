<?php

namespace App\Models;

use App\Casts\JsonValue;

class Notification extends BaseModel
{
    protected $table = 'Notification';

    public const COLUMNS = ['id', 'title', 'message', 'type', 'recipientType', 'targetUserId', 'isRead', 'readBy', 'link', 'broadcastId', 'createdAt', 'updatedAt'];

    protected $casts = [
        'isRead' => 'boolean',
        'readBy' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    // The storefront reads `userId` and `read`
    public function toArray(): array
    {
        $data = parent::toArray();
        $data['userId'] = $data['targetUserId'] ?? null;
        $data['read'] = (bool) ($data['isRead'] ?? false);
        return $data;
    }
}
