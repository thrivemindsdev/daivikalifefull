{{-- Shared <head> for the store and the stand-alone pages (login) --}}
@php
    $siteTitle = 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha';
    $siteDescription = 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, idols, and pure pooja essentials.';
    $siteUrl = rtrim(config('daivika.frontend_url') ?: request()->getSchemeAndHttpHost(), '/');
    $isCheckout = request()->is('checkout');
    $schemas = [
        ['@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => 'Daivika', 'url' => '/', 'potentialAction' => ['@type' => 'SearchAction', 'target' => '/products?search={search_term_string}', 'query-input' => 'required name=search_term_string']],
        ['@context' => 'https://schema.org', '@type' => 'Organization', 'name' => 'Daivika', 'url' => '/', 'logo' => '/logo.png', 'description' => 'Daivika - Premium quality products and essentials curated for you.'],
        ['@context' => 'https://schema.org', '@type' => 'LocalBusiness', 'name' => 'Daivika Store', 'image' => '/logo.png', 'url' => '/'],
        ['@context' => 'https://schema.org', '@type' => 'ItemList', 'itemListElement' => [
            ['@type' => 'SiteNavigationElement', 'position' => 1, 'name' => 'Products', 'description' => 'Browse all Daivika products', 'url' => '/products'],
            ['@type' => 'SiteNavigationElement', 'position' => 2, 'name' => 'Order Tracking', 'description' => 'Track your order status', 'url' => '/order-tracking'],
            ['@type' => 'SiteNavigationElement', 'position' => 3, 'name' => 'Contact', 'description' => 'Contact Daivika support', 'url' => '/contact'],
        ]],
    ];
@endphp
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#360910">
  <title>@yield('title', $siteTitle)</title>
  <meta name="description" content="@yield('description', $siteDescription)">
  <meta name="keywords" content="Karungali mala, 1 Mukhi Rudraksha, Tulasi mala, spiritual wearables, Zodimithra, Daivika, energized rudraksha, pooja essentials, panchaloha, brass diyas, gemstones">
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1">
  <meta property="og:title" content="@yield('title', $siteTitle)">
  <meta property="og:description" content="@yield('description', $siteDescription)">
  <meta property="og:url" content="{{ $siteUrl }}">
  <meta property="og:site_name" content="Daivika by Zodimithra">
  <meta property="og:image" content="{{ $siteUrl }}/og-image.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="@yield('title', $siteTitle)">
  <meta name="twitter:description" content="@yield('description', $siteDescription)">
  <meta name="twitter:image" content="{{ $siteUrl }}/og-image.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=daivika_v4">
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=daivika_v4">
  <link rel="apple-touch-icon" href="/favicon.png?v=daivika_v4">
  <link rel="shortcut icon" href="/favicon.ico?v=daivika_v4">
  <link rel="preload" as="image" href="/logo-light.png?v=daivika_v3" fetchpriority="high" type="image/png">
  <link rel="preload" as="image" href="/logo.png?v=daivika_v3" fetchpriority="high" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&amp;family=Outfit:wght@300;400;500;600;700;800;900&amp;family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&amp;family=Poppins:wght@300;400;500;600;700;800;900&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="/css/globals.css">
  <link rel="stylesheet" href="/css/App.css">
  {{-- The React dashboards bring their own styles on top of globals.css / App.css --}}
  @unless (!empty($reactApp))
    <link rel="stylesheet" href="/css/daivika-blade.css">
    <style>:root{--color-primary:#0a0a0a;--color-primary-rgb:6, 36, 30;--color-accent:#0a0a0a;--color-accent-hover:#0a0a0a}</style>
  @endunless
  <noscript><style>[data-fade-in],[data-enter],[data-inview]{opacity:1!important;transform:none!important}</style></noscript>
  @foreach ($schemas as $schema)
    <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
  @endforeach
  @stack('head')
