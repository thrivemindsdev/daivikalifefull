<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

// PHP only reads multipart/form-data for POST. The admin forms send product, category and collection
// edits as PUT with files, so those bodies are parsed here into the request's fields and files.
class MultipartParser
{
    public static function apply(Request $request): void
    {
        $method = strtoupper($request->getRealMethod());
        if (! in_array($method, ['PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }
        $type = (string) $request->headers->get('content-type', '');
        if (! preg_match('/^multipart\/form-data;.*boundary=(?:"([^"]+)"|([^;]+))/i', $type, $m)) {
            return;
        }
        $boundary = $m[1] !== '' ? $m[1] : trim($m[2]);
        $body = $request->getContent();
        if ($body === '') {
            return;
        }

        $fields = [];
        $files = [];
        $parts = explode("--$boundary", $body);
        array_shift($parts); // preamble
        foreach ($parts as $part) {
            if (str_starts_with($part, '--')) {
                break; // closing boundary
            }
            $part = preg_replace('/^\r?\n/', '', $part, 1);
            $split = strpos($part, "\r\n\r\n");
            if ($split === false) {
                continue;
            }
            $rawHeaders = substr($part, 0, $split);
            $content = substr($part, $split + 4);
            if (str_ends_with($content, "\r\n")) {
                $content = substr($content, 0, -2);
            }

            $headers = [];
            foreach (explode("\r\n", $rawHeaders) as $line) {
                if (str_contains($line, ':')) {
                    [$k, $v] = explode(':', $line, 2);
                    $headers[strtolower(trim($k))] = trim($v);
                }
            }
            $disposition = $headers['content-disposition'] ?? '';
            if (! preg_match('/\bname="([^"]*)"/i', $disposition, $nm)) {
                continue;
            }
            $name = $nm[1];

            if (preg_match('/\bfilename="([^"]*)"/i', $disposition, $fm)) {
                if ($fm[1] === '' && $content === '') {
                    continue; // empty file input
                }
                $tmp = tempnam(sys_get_temp_dir(), 'upl');
                file_put_contents($tmp, $content);
                register_shutdown_function(fn () => @unlink($tmp));
                $files[$name] = new UploadedFile($tmp, $fm[1] ?: 'upload', $headers['content-type'] ?? 'application/octet-stream', UPLOAD_ERR_OK, true);
            } else {
                $fields[$name] = $content;
            }
        }

        $request->request->replace($fields);
        $request->files->replace($files);
    }
}
