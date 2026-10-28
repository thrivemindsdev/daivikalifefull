<?php

namespace App\Services;

use App\Models\StoredImage;
use Illuminate\Http\UploadedFile;
use RuntimeException;

// Uploaded images and videos: Cloudinary when it is configured, otherwise PostgreSQL (StoredImage).
class MediaStorage
{
    private const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
    private const MAX_DIMENSION = 2048;

    // MP4 / MOV (ISO media "ftyp" box, but not AVIF images) and WebM, recognised by their first bytes
    private static function isVideo(string $buf): bool
    {
        if (strlen($buf) < 12) {
            return false;
        }
        $brand = substr($buf, 4, 8);
        if (str_starts_with($brand, 'ftyp') && ! preg_match('/^ftypavi[fs]/', $brand)) {
            return true;
        }
        return bin2hex(substr($buf, 0, 4)) === '1a45dfa3';
    }

    private static function videoMime(string $buf): string
    {
        if (bin2hex(substr($buf, 0, 4)) === '1a45dfa3') {
            return 'video/webm';
        }
        return substr($buf, 8, 4) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
    }

    // Accepts only real JPEG / PNG / WebP / GIF / AVIF files (checked by content, not by name).
    // SVG is refused because it can carry scripts that would run on the site's origin.
    public static function assertImage(string $buf): void
    {
        if ($buf === '') {
            throw new RuntimeException('The uploaded file is empty');
        }
        if (strlen($buf) > self::MAX_UPLOAD_BYTES) {
            throw new RuntimeException('Images must be 15 MB or smaller');
        }
        $hex = bin2hex(substr($buf, 0, 12));
        $ascii = substr($buf, 0, 12);
        $ok = str_starts_with($hex, 'ffd8ff')
            || str_starts_with($hex, '89504e470d0a1a0a')
            || str_starts_with($ascii, 'GIF87a') || str_starts_with($ascii, 'GIF89a')
            || (str_starts_with($ascii, 'RIFF') && substr($ascii, 8, 4) === 'WEBP')
            || substr($ascii, 4, 8) === 'ftypavif' || substr($ascii, 4, 8) === 'ftypavis';
        if (! $ok) {
            throw new RuntimeException('Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded');
        }
    }

    // Fixes phone-camera rotation, limits the image to 2048px and saves it as WebP. GIFs are kept as they are.
    // Returns ['bytes', 'mime', 'extension'].
    public static function optimize(string $bytes, string $originalName = ''): array
    {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $ext = $ext !== '' ? ".$ext" : '';
        if (str_starts_with($bytes, 'GIF8')) {
            return ['bytes' => $bytes, 'mime' => 'image/gif', 'extension' => '.gif'];
        }
        $sourceMime = match ($ext) {
            '.png' => 'image/png',
            '.webp' => 'image/webp',
            default => 'image/jpeg',
        };

        try {
            $out = self::toWebp($bytes, self::MAX_DIMENSION, 82, true);
            if ($out !== null && (strlen($out) < strlen($bytes) || $sourceMime !== 'image/webp')) {
                return ['bytes' => $out, 'mime' => 'image/webp', 'extension' => '.webp'];
            }
        } catch (\Throwable $e) {
            logger()->warning('[optimize] image conversion failed: '.$e->getMessage());
        }
        return ['bytes' => $bytes, 'mime' => $sourceMime, 'extension' => $ext ?: '.jpg'];
    }

    // Resized WebP copy (null when GD can't read the image)
    public static function toWebp(string $bytes, int $maxWidth, int $quality, bool $limitHeight = false): ?string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagewebp')) {
            return null;
        }
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return null;
        }
        $img = self::applyExifOrientation($img, $bytes);
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min(1, $maxWidth / max(1, $w), $limitHeight ? $maxWidth / max(1, $h) : 1);
        if ($scale < 1) {
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $resized = imagecreatetruecolor($nw, $nh);
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $resized;
        } elseif (! imageistruecolor($img)) {
            imagepalettetotruecolor($img);
        }
        imagealphablending($img, false);
        imagesavealpha($img, true);
        ob_start();
        $ok = imagewebp($img, null, $quality);
        $out = ob_get_clean();
        imagedestroy($img);
        return $ok && $out !== '' ? $out : null;
    }

    private static function applyExifOrientation(\GdImage $img, string $bytes): \GdImage
    {
        if (! str_starts_with(bin2hex(substr($bytes, 0, 3)), 'ffd8ff') || ! function_exists('exif_read_data')) {
            return $img;
        }
        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($bytes));
        $orientation = (int) ($exif['Orientation'] ?? 1);
        $rotated = match ($orientation) {
            3 => imagerotate($img, 180, 0),
            6 => imagerotate($img, -90, 0),
            8 => imagerotate($img, 90, 0),
            default => null,
        };
        if ($rotated instanceof \GdImage) {
            imagedestroy($img);
            return $rotated;
        }
        return $img;
    }

    // Stores an uploaded file and returns its URL (Cloudinary URL or /api/images/<id>)
    public static function store(UploadedFile $file): string
    {
        $bytes = (string) file_get_contents($file->getRealPath());
        return self::storeBytes($bytes, $file->getClientOriginalName() ?: 'upload');
    }

    public static function storeBytes(string $bytes, string $originalName = 'upload'): string
    {
        // Videos go to Cloudinary as they are (too large for the database)
        if (self::isVideo($bytes)) {
            if (strlen($bytes) > self::MAX_VIDEO_BYTES) {
                throw new RuntimeException('Videos must be 100 MB or smaller');
            }
            if (! Cloudinary::config()['configured']) {
                throw new RuntimeException('Video uploads need Cloudinary to be configured');
            }
            return Cloudinary::upload($bytes, $originalName, self::videoMime($bytes), 'video');
        }

        self::assertImage($bytes);
        $opt = self::optimize($bytes, $originalName);
        $base = pathinfo($originalName, PATHINFO_FILENAME) ?: 'image';

        if (Cloudinary::config()['configured']) {
            try {
                return Cloudinary::upload($opt['bytes'], $base.$opt['extension'], $opt['mime'], 'image');
            } catch (\Throwable $e) {
                logger()->error('Cloudinary upload failed, storing the image in the database instead: '.$e->getMessage());
            }
        }

        $id = StoredImage::create($opt['bytes'], $opt['mime'], $originalName ?: 'upload');
        // Warm the disk cache so the first view doesn't have to read the image back from the database
        ImageCache::write($id, $opt['bytes'], $opt['mime']);
        return "/api/images/$id";
    }

    // Removes a stored file (Cloudinary file in this account, or a database image). Never throws.
    public static function delete(mixed $url): void
    {
        if (! is_string($url) || $url === '') {
            return;
        }
        try {
            if (Cloudinary::isOurUrl($url)) {
                Cloudinary::delete($url);
                return;
            }
            if (str_starts_with($url, '/api/images/')) {
                $id = substr($url, strlen('/api/images/'));
                $id = explode('?', $id)[0];
                if (preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) {
                    StoredImage::delete($id);
                }
            }
        } catch (\Throwable $e) {
            logger()->warning('Failed to delete stored file: '.$e->getMessage());
        }
    }

    // An uploaded file from a multipart form field, or null when the field is missing / not a file / empty
    public static function file(\Illuminate\Http\Request $request, string $field): ?UploadedFile
    {
        $file = $request->file($field);
        if ($file instanceof UploadedFile && $file->isValid() && $file->getSize() > 0) {
            return $file;
        }
        if ($file instanceof UploadedFile && ! $file->isValid() && $file->getError() === UPLOAD_ERR_INI_SIZE) {
            throw new RuntimeException('The file is too large to upload');
        }
        return null;
    }
}
