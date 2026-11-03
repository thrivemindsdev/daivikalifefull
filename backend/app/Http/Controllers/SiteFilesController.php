<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

// robots.txt, sitemap.xml, /uploads/* and the 404 page (app/robots.js, app/sitemap.js, app/uploads, Next's not-found)
class SiteFilesController
{
    private function baseUrl(): string
    {
        return rtrim((string) config('daivika.frontend_url'), '/');
    }

    public function robots(): Response
    {
        $rules = '';
        foreach (['*', 'Googlebot', 'Bingbot'] as $agent) {
            $rules .= "User-Agent: $agent\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\nDisallow: /profile\nDisallow: /checkout\n\n";
        }

        return response($rules.'Sitemap: '.$this->baseUrl()."/sitemap.xml\n", 200, ['Content-Type' => 'text/plain']);
    }

    // Static pages, every category and every product; the static part still works without the database
    public function sitemap(): Response
    {
        $base = $this->baseUrl();
        $now = now()->utc()->format('Y-m-d\TH:i:s.v\Z');
        $urls = [];
        foreach (['', '/products', '/about', '/order-tracking', '/contact', '/faq', '/shipping-policy', '/returns-exchanges', '/privacy-policy', '/terms-of-service', '/refund-policy'] as $route) {
            $urls[] = [$base.$route, $now, $route === '' || $route === '/products' ? 'daily' : 'weekly', $route === '' ? '1' : ($route === '/products' || $route === '/about' ? '0.9' : '0.7')];
        }
        try {
            foreach (Category::ordered()->get(['name']) as $cat) {
                $urls[] = [$base.'/products?category='.rawurlencode($cat->name), $now, 'daily', '0.85'];
            }
            foreach (Product::query()->get(['id', 'updatedAt']) as $p) {
                $urls[] = [$base.'/product/'.$p->id, $p->updatedAt ? $p->updatedAt->utc()->format('Y-m-d\TH:i:s.v\Z') : $now, 'weekly', '0.8'];
            }
        } catch (\Throwable $e) {
            report($e);
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($urls as [$loc, $mod, $freq, $prio]) {
            $xml .= "<url>\n<loc>".htmlspecialchars($loc, ENT_XML1)."</loc>\n<lastmod>$mod</lastmod>\n<changefreq>$freq</changefreq>\n<priority>$prio</priority>\n</url>\n";
        }

        return response($xml.'</urlset>', 200, ['Content-Type' => 'application/xml']);
    }

    // Images under /uploads: public/uploads first, then the public folder itself (as the Next.js route did)
    public function upload(string $path): BinaryFileResponse|Response
    {
        $segments = explode('/', $path);
        foreach ($segments as $s) {
            if ($s === '' || $s === '.' || $s === '..' || str_starts_with($s, '.') || preg_match('/[\\\\\0]/', $s)) {
                return response('Invalid path', 400);
            }
        }
        $types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml', 'avif' => 'image/avif', 'ico' => 'image/x-icon'];
        $type = $types[strtolower(pathinfo(end($segments), PATHINFO_EXTENSION))] ?? null;
        if (! $type) {
            return response('Unsupported file type', 400);
        }
        $root = realpath(public_path());
        foreach ([public_path('uploads/'.$path), public_path($path)] as $candidate) {
            $real = realpath($candidate);
            if ($real && str_starts_with($real, $root.DIRECTORY_SEPARATOR) && is_file($real)) {
                return response()->file($real, ['Content-Type' => $type, 'Cache-Control' => 'public, max-age=3600, stale-while-revalidate=86400']);
            }
        }

        return response('Image not found', 404);
    }

    public function notFound(): Response
    {
        return response()->view('pages.not-found', [], 404);
    }
}
