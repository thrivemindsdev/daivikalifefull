<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

// Cloudinary storage for uploaded images and videos (signed REST API, no SDK needed).
// Files go into CLOUDINARY_FOLDER (default "Clixdot/Daivika").
class Cloudinary
{
    public static function config(): array
    {
        $cloudName = (string) config('daivika.cloudinary.cloud_name');
        $apiKey = (string) config('daivika.cloudinary.api_key');
        $apiSecret = (string) config('daivika.cloudinary.api_secret');
        return [
            'configured' => $cloudName !== '' && $apiKey !== '' && $apiSecret !== '',
            'cloudName' => $cloudName,
            'apiKey' => $apiKey,
            'apiSecret' => $apiSecret,
            'folder' => trim((string) (config('daivika.cloudinary.folder') ?: 'Clixdot/Daivika'), '/'),
        ];
    }

    // sha1 of the sorted "key=value" pairs joined with "&", followed by the API secret
    public static function sign(array $params, string $apiSecret): string
    {
        $pairs = [];
        $keys = array_keys($params);
        sort($keys, SORT_STRING);
        foreach ($keys as $k) {
            $v = $params[$k];
            if ($v === null || $v === '' || in_array($k, ['file', 'api_key', 'resource_type', 'cloud_name'], true)) {
                continue;
            }
            $pairs[] = "$k=$v";
        }
        return sha1(implode('&', $pairs).$apiSecret);
    }

    // Uploads bytes and returns the secure URL. resourceType: image | video | auto
    public static function upload(string $bytes, string $filename, string $mime, string $resourceType = 'auto'): string
    {
        $c = self::config();
        if (! $c['configured']) {
            throw new RuntimeException('Cloudinary is not configured');
        }
        $params = ['folder' => $c['folder'], 'timestamp' => (string) time(), 'unique_filename' => 'true', 'use_filename' => 'true'];
        $name = substr(preg_replace('/[^\w.-]/', '_', $filename), 0, 80) ?: 'upload';

        $res = Http::timeout(180)
            ->attach('file', $bytes, $name, ['Content-Type' => $mime])
            ->post("https://api.cloudinary.com/v1_1/{$c['cloudName']}/$resourceType/upload", $params + [
                'api_key' => $c['apiKey'],
                'signature' => self::sign($params, $c['apiSecret']),
            ]);
        $json = $res->json() ?? [];
        if (! $res->successful() || empty($json['secure_url'])) {
            throw new RuntimeException($json['error']['message'] ?? 'Cloudinary upload failed ('.$res->status().')');
        }
        return $json['secure_url'];
    }

    public static function isOurUrl(mixed $url): bool
    {
        $cloud = self::config()['cloudName'];
        return is_string($url) && $cloud !== '' && str_contains($url, "res.cloudinary.com/$cloud/");
    }

    // ['resourceType', 'publicId'] from a delivery URL like
    // https://res.cloudinary.com/<cloud>/image/upload/v123/Clixdot/Daivika/name.webp
    public static function parseUrl(string $url): ?array
    {
        if (! preg_match('~res\.cloudinary\.com/[^/]+/(image|video|raw)/upload/(?:[^/]+/)*?(?:v\d+/)?(.+?)(?:\.[a-z0-9]+)?$~i', $url, $m)) {
            return null;
        }
        return ['resourceType' => $m[1], 'publicId' => rawurldecode($m[2])];
    }

    public static function delete(string $url): bool
    {
        $c = self::config();
        if (! $c['configured'] || ! self::isOurUrl($url)) {
            return false;
        }
        $parsed = self::parseUrl($url);
        if (! $parsed) {
            return false;
        }
        $params = ['public_id' => $parsed['publicId'], 'timestamp' => (string) time(), 'invalidate' => 'true'];
        $res = Http::asForm()->timeout(30)->post("https://api.cloudinary.com/v1_1/{$c['cloudName']}/{$parsed['resourceType']}/destroy", $params + [
            'api_key' => $c['apiKey'],
            'signature' => self::sign($params, $c['apiSecret']),
        ]);
        return ($res->json('result') ?? '') === 'ok';
    }

    // Signature for a browser-side upload straight to Cloudinary (used for large videos)
    public static function signedUploadParams(): ?array
    {
        $c = self::config();
        if (! $c['configured']) {
            return null;
        }
        $params = ['folder' => $c['folder'], 'timestamp' => time(), 'unique_filename' => 'true', 'use_filename' => 'true'];
        return ['cloudName' => $c['cloudName'], 'apiKey' => $c['apiKey']] + $params + ['signature' => self::sign($params, $c['apiSecret'])];
    }
}
