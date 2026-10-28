<?php

namespace App\Support;

// Collision-resistant ids in the same style as Prisma's cuid() ("c" + 24 lowercase letters/digits)
class Cuid
{
    private static int $counter = 0;

    public static function make(): string
    {
        $time = base_convert((string) (int) (microtime(true) * 1000), 10, 36);
        self::$counter = (self::$counter + 1) % 1679616;
        $count = str_pad(base_convert((string) self::$counter, 10, 36), 4, '0', STR_PAD_LEFT);
        $random = '';
        while (strlen($random) < 12) {
            $random .= base_convert((string) random_int(0, 2176782335), 10, 36);
        }
        return 'c'.substr(str_pad($time, 8, '0', STR_PAD_LEFT), -8).$count.substr($random, 0, 12);
    }
}
