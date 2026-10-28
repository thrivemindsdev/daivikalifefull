<?php

namespace App\Models;

use App\Casts\JsonValue;

class User extends BaseModel
{
    protected $table = 'User';

    public const COLUMNS = ['id', 'name', 'email', 'phone', 'password', 'role', 'avatar', 'googleId', 'pushSubscriptions', 'createdAt', 'updatedAt'];

    protected $casts = [
        'pushSubscriptions' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    // Never sent to the browser
    protected $hidden = ['password', 'pushSubscriptions'];

    public static function isHash(?string $value): bool
    {
        return is_string($value) && preg_match('/^\$2[aby]\$/', $value) === 1;
    }

    // Plain passwords are hashed when saved (hashes are stored as they are)
    public function setPasswordAttribute(?string $value): void
    {
        $this->attributes['password'] = ($value === null || $value === '' || self::isHash($value))
            ? (string) $value
            : password_hash($value, PASSWORD_BCRYPT, ['cost' => 10]);
    }

    public function matchPassword(?string $entered): bool
    {
        $stored = $this->attributes['password'] ?? '';
        if ($entered === null || $entered === '' || $stored === '') {
            return false;
        }
        if (self::isHash($stored)) {
            return password_verify($entered, $stored);
        }
        // Very old accounts were saved without hashing
        return hash_equals($stored, $entered);
    }

    // Accounts are found by their 10-digit mobile number however it was stored (98..., 9198..., +9198...)
    public static function findByMobile(string $mobile): ?self
    {
        return static::query()->whereIn('phone', [$mobile, "91$mobile", "+91$mobile"])->first();
    }
}
