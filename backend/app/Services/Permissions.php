<?php

namespace App\Services;

use App\Models\User;

// Sub-users (role "staff") see only the dashboard sections the admin ticked. Each key is a dashboard tab id.
class Permissions
{
    public const ALL = [
        'overview', 'reports', 'meta-ads', 'orders', 'products', 'product-groups', 'stock', 'vendors', 'categories',
        'sizes', 'users', 'coupons', 'free-gift', 'product-reviews', 'leads-inbox', 'invoice-control',
        'shipping-control', 'site-control', 'broadcast', 'settings',
    ];

    // True for the admin, or for staff holding at least one of the given permissions
    public static function allows(?User $user, array $anyOf): bool
    {
        if ($user?->role === 'admin') {
            return true;
        }
        if ($user?->role !== 'staff') {
            return false;
        }
        return (bool) array_intersect($anyOf, self::clean($user->permissions));
    }

    public static function clean(mixed $permissions): array
    {
        return is_array($permissions) ? array_values(array_intersect(self::ALL, $permissions)) : [];
    }
}
