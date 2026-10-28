<?php

namespace App\Http\Controllers\Api;

use App\Models\StoredImage;
use App\Services\ImageCache;
use App\Services\MediaStorage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// GET /api/images/:id?w=480 — an image stored in PostgreSQL. With ?w= it returns a resized WebP copy
// (cached on disk), so product cards and thumbnails don't download full-size photos.
class ImageController
{
    private const WIDTHS = [160, 320, 480, 640, 960, 1280];

    public function __invoke(Request $request, string $id): Response
    {
        try {
            // Image ids are cuid-style; anything else (e.g. "../") must not reach the file system
            if (! preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) {
                return response('Invalid image ID', 400);
            }
            $requested = (int) $request->query('w', 0);
            $width = in_array($requested, self::WIDTHS, true) ? $requested : 0;

            if ($width && ($resized = ImageCache::read("{$id}_w$width"))) {
                return $this->send($resized['data'], $resized['contentType'], "$id-$width");
            }

            $original = ImageCache::read($id);
            if (! $original) {
                $original = StoredImage::find($id);
                if ($original) {
                    ImageCache::write($id, $original['data'], $original['contentType']);
                }
            }
            if (! $original) {
                return response('Image not found', 404, ['Cache-Control' => 'public, max-age=300']);
            }

            if ($width && ! preg_match('/gif|svg/', $original['contentType'])) {
                $data = MediaStorage::toWebp($original['data'], $width, 78);
                if ($data !== null) {
                    ImageCache::write("{$id}_w$width", $data, 'image/webp');
                    return $this->send($data, 'image/webp', "$id-$width");
                }
            }
            return $this->send($original['data'], $original['contentType'], $id);
        } catch (\Throwable $e) {
            report($e);
            return response('Internal Server Error', 500);
        }
    }

    private function send(string $data, string $contentType, string $etag): Response
    {
        return response($data, 200, [
            'Content-Type' => $contentType,
            'Content-Length' => (string) strlen($data),
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => "\"$etag\"",
        ]);
    }
}
