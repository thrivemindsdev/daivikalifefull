<?php

namespace App\Services;

// Disk cache for images stored in PostgreSQL (originals and resized copies)
class ImageCache
{
    private static function dir(): string
    {
        return rtrim((string) config('daivika.image_cache_dir'), '/\\');
    }

    public static function read(string $key): ?array
    {
        $file = self::dir().DIRECTORY_SEPARATOR.$key;
        if (! is_file($file)) {
            return null;
        }
        $data = @file_get_contents($file);
        if ($data === false) {
            return null;
        }
        $meta = json_decode((string) @file_get_contents("$file.meta.json"), true);
        return ['data' => $data, 'contentType' => $meta['contentType'] ?? 'image/jpeg'];
    }

    public static function write(string $key, string $data, string $contentType): void
    {
        try {
            $dir = self::dir();
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            file_put_contents($dir.DIRECTORY_SEPARATOR.$key, $data);
            file_put_contents($dir.DIRECTORY_SEPARATOR."$key.meta.json", json_encode(['contentType' => $contentType]));
        } catch (\Throwable $e) {
            logger()->warning('[image-cache] could not write cache: '.$e->getMessage());
        }
    }
}
