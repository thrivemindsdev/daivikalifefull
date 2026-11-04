<?php

namespace App\Support;

// The shop's public address for links in pages, the sitemap and robots.txt: FRONTEND_URL when it is set,
// otherwise the address the visitor used (so a missing FRONTEND_URL never leaks "localhost:3000").
class SiteUrl
{
    public static function base(): string
    {
        $configured = rtrim((string) config('daivika.frontend_url'), '/');
        $host = request()->getHost();
        $configuredIsLocal = $configured === '' || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $configured);
        if ($configuredIsLocal && ! in_array($host, ['localhost', '127.0.0.1'], true)) {
            return rtrim(request()->getSchemeAndHttpHost(), '/');
        }

        return $configured !== '' ? $configured : rtrim(request()->getSchemeAndHttpHost(), '/');
    }
}
