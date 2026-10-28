<?php

namespace App\Models;

use App\Support\Cuid;
use Illuminate\Support\Facades\DB;
use PDO;

// Images kept in PostgreSQL (bytea) when Cloudinary isn't configured. Read and written with PDO directly
// because the image bytes are binary.
class StoredImage
{
    public static function create(string $data, string $mimeType, string $filename): string
    {
        $id = Cuid::make();
        $pdo = DB::connection()->getPdo();
        $stmt = $pdo->prepare('INSERT INTO "StoredImage" ("id", "data", "mimeType", "filename", "size", "createdAt") VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
        $stmt->bindValue(1, $id);
        $stmt->bindValue(2, $data, PDO::PARAM_LOB);
        $stmt->bindValue(3, $mimeType);
        $stmt->bindValue(4, mb_substr($filename, 0, 255));
        $stmt->bindValue(5, strlen($data), PDO::PARAM_INT);
        $stmt->execute();
        return $id;
    }

    // ['data' => bytes, 'contentType' => mime] or null
    public static function find(string $id): ?array
    {
        $pdo = DB::connection()->getPdo();
        $stmt = $pdo->prepare('SELECT "data", "mimeType" FROM "StoredImage" WHERE "id" = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (! $row || $row['data'] === null) {
            return null;
        }
        $data = is_resource($row['data']) ? stream_get_contents($row['data']) : (string) $row['data'];
        return ['data' => $data, 'contentType' => $row['mimeType'] ?: 'image/jpeg'];
    }

    public static function delete(string $id): void
    {
        DB::table('StoredImage')->where('id', $id)->delete();
    }
}
