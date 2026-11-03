@extends('layouts.store')

@section('title', 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha')
@section('description', 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, and pure pooja essentials.')

@php
    $origin = request()->getSchemeAndHttpHost();
    $loaderLogo = '/images/loader-logo.png';
    $mobileRule = 'max-width: 1023.98px';
@endphp

@push('head')
  <link rel="stylesheet" href="/css/home.css">
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'Store',
      'name' => 'Daivika by Zodimithra',
      'url' => $origin,
      'logo' => $origin.'/logo.png',
      'description' => 'Authentic Spiritual Wearables, Karungali Malas, Consecrated Rudraksha & Pooja Essentials',
      'telephone' => '+91 75108 21228',
      'priceRange' => '₹₹',
      'potentialAction' => ['@type' => 'SearchAction', 'target' => $origin.'/products?search={search_term_string}', 'query-input' => 'required name=search_term_string'],
  ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
@endpush

@section('content')
{{-- Splash (components/PageLoader.jsx): first page of a browser session only --}}
<div data-loader style="position:fixed;inset:0;background-color:#FAF8F5;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;pointer-events:all;overflow:hidden">
  <div data-loader-logo style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(0.95)">
    <img src="{{ $loaderLogo }}" alt="Logo" loading="eager" fetchpriority="high" decoding="sync" style="width:100%;height:100%;object-fit:contain;opacity:0.85" onerror="this.onerror=null;this.src='/images/loader-logo.png';this.nextElementSibling.style.maskImage=this.nextElementSibling.style.webkitMaskImage='url(/images/loader-logo.png)'">
    <div style="position:absolute;inset:0;mask-image:url({{ $loaderLogo }});-webkit-mask-image:url({{ $loaderLogo }});mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;pointer-events:none">
      <div data-loader-shine style="width:100%;height:100%;background:linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.85) 45%, rgba(166, 124, 82, 0.6) 50%, rgba(255, 255, 255, 0.85) 55%, transparent 70%);transform:translateX(-150%)"></div>
    </div>
  </div>
  <div style="position:absolute;bottom:5rem;width:80px;height:1px;background-color:rgba(166, 124, 82, 0.1);overflow:hidden">
    <div data-loader-bar style="width:100%;height:100%;background-color:#a67c52;transform-origin:left;transform:scaleX(0)"></div>
  </div>
</div>
<script>
  // The admin's company logo, when the browser has it (PageLoader reads it from localStorage)
  try {
    var s = JSON.parse(localStorage.getItem('vaugun_invoice_settings') || 'null'), l = s && s.companyLogo;
    if (l && l.indexOf('slaro') < 0 && l.indexOf('api/images') < 0) {
      var box = document.querySelector('[data-loader-logo]');
      box.querySelector('img').src = l;
      box.children[1].style.maskImage = box.children[1].style.webkitMaskImage = 'url(' + l + ')';
    }
  } catch (e) {}
  // Already shown in this browser session: remove it before the first paint, as React's layout effect did
  try { if (sessionStorage.getItem('daivika_initial_loaded')) document.querySelector('[data-loader]').remove(); else document.body.style.overflow = 'hidden'; } catch (e) {}
</script>

<div data-home hidden style="background-color:#FAF8F5">
  <style>
    .dv-home-tabs-sec { padding: 2.5rem 1.5rem 1.5rem 1.5rem; }
    .dv-home-h2 { font-size: 2rem; }
    .dv-home-intro { font-size: 0.95rem; }
    .dv-home-tabbar { gap: 2rem; padding-right: 0; }
    .dv-home-tab { font-size: 1rem; }
    .dv-home-themed { padding: 2.5rem 1.5rem; }
    .dv-home-heading { margin-bottom: 1.5rem; }
    .dv-home-collections { padding: 2.25rem 0 1.25rem 0; }
    .dv-home-latest { padding: 2.25rem 1.5rem; }
    .dv-home-features-sec { padding-top: 1.5rem; padding-bottom: 2rem; }
    .dv-home-features { display: grid; grid-template-columns: repeat(4, 1fr); overflow-x: visible; padding-bottom: 0; }
    .dv-home-features.dv-loading { grid-template-columns: repeat(5, 1fr); }
    .dv-home-feature { flex-grow: 1; flex-basis: 0%; width: auto; }
    .dv-home-feature-skel { width: auto; flex: 1; }
    .dv-home-stories { padding: 3rem 0; }
    .dv-home-stories-inner { padding: 0 1.5rem; }
    .stories-track { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 0 1.5rem 0.25rem; }
    .stories-track::-webkit-scrollbar { display: none; }
    .story-card { flex: 0 0 300px; scroll-snap-align: start; border-radius: 18px; overflow: hidden; position: relative; aspect-ratio: 4 / 5; background: #1a0306; text-decoration: none; color: #fff; box-shadow: 0 18px 40px -20px rgba(0,0,0,0.7); border: 1px solid rgba(197,131,26,0.3); }
    .story-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.6s ease; }
    .story-card:hover img { transform: scale(1.05); }
    .daivika-hero-aspect-container { width: 100%; position: relative; aspect-ratio: 3 / 1; min-height: 320px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .dv-hero-arrow { position: absolute; left: 1.5rem; top: 50%; transform: translateY(-50%); z-index: 10; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(15, 23, 42, 0.65); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25); transition: all 0.2s ease; outline: none; }
    .dv-hero-arrow.dv-next { left: auto; right: 1.5rem; }
    .dv-hero-arrow:hover { background-color: #0f172a; }
    .dv-hero-arrow .dv-s { display: none; }
    .dv-hero-dots { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 0.45rem; background-color: rgba(15, 23, 42, 0.65); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 0.35rem 0.8rem; border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2); }
    .dv-hero-dot { width: 8px; height: 8px; border-radius: 100px; background-color: rgba(255, 255, 255, 0.45); border: none; padding: 0; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); outline: none; }
    .dv-hero-dot.dv-on { width: 24px; background-color: #ffffff; }
    @media (max-width: 768px) {
      .daivika-hero-aspect-container { aspect-ratio: 16 / 9 !important; min-height: 180px !important; }
      .dv-hero-arrow { left: 0.75rem; width: 36px; height: 36px; }
      .dv-hero-arrow.dv-next { right: 0.75rem; }
      .dv-hero-arrow .dv-l { display: none; }
      .dv-hero-arrow .dv-s { display: block; }
      .dv-hero-dots { bottom: 0.75rem; }
      .dv-hero-dot { width: 6px; height: 6px; }
      .dv-hero-dot.dv-on { width: 18px; }
    }
    @media ({{ $mobileRule }}) {
      .dv-home-tabs-sec { padding: 1.5rem 0.5rem 1rem 0.5rem; }
      .dv-home-h2 { font-size: 1.4rem; }
      .dv-home-intro { font-size: 0.85rem; }
      .dv-home-tabbar { gap: 0.75rem; padding-right: 0.5rem; }
      .dv-home-tab { font-size: 0.85rem; }
      .dv-home-themed { padding: 1.5rem 0.5rem; }
      .dv-home-heading { margin-bottom: 1rem; }
      .dv-home-collections { padding: 1.5rem 0 1rem 0; }
      .dv-home-latest { padding: 1.25rem 0.5rem; }
      .dv-home-features-sec { padding-top: 0.75rem; padding-bottom: 1.5rem; }
      .dv-home-features, .dv-home-features.dv-loading { display: flex; grid-template-columns: none; overflow-x: auto; padding-bottom: 0.75rem; }
      .dv-home-feature { flex-grow: 0; flex-basis: auto; width: 230px; }
      .dv-home-feature-skel { width: 230px; flex: 0 0 auto; }
      .dv-home-stories { padding: 1.75rem 0; }
      .dv-home-stories-inner { padding: 0 0.75rem; }
      .stories-track { padding: 0 0.75rem 0.25rem; }
      .story-card { flex: 0 0 78%; }
    }
  </style>

  <div data-home-hero></div>

  <section data-home-tabs-section class="dv-home-tabs-sec" style="background-color:#ffffff;border-bottom:1px solid rgba(10, 10, 10, 0.05);width:100%;box-sizing:border-box">
    <div style="max-width:1560px;margin:0 auto;width:100%;box-sizing:border-box">
      <div style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;margin-bottom:1.5rem">
        <span style="color:#c5831a;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:2.2px;margin-bottom:0.3rem">✦ {{ $intro['eyebrow'] }}</span>
        <h2 class="dv-home-h2" style="font-weight:800;color:#0a0a0a;font-family:'Plus Jakarta Sans', 'Poppins', sans-serif;margin:0;letter-spacing:-0.3px;line-height:1.2">{{ $intro['title'] }}</h2>
        <p class="dv-home-intro" style="margin:0.5rem 0 0;max-width:760px;color:#5f5a55;line-height:1.65">{{ $intro['description'] }}</p>
        <div class="dv-home-tabbar" style="display:flex;align-items:center;margin-top:1.25rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.2rem;width:100%;justify-content:flex-start;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none">
          @foreach ([['new_arrivals', 'NEW ARRIVALS'], ['trending', 'TRENDING'], ['combos', 'COMBOS']] as [$id, $label])
            <button type="button" class="dv-home-tab" data-home-tab="{{ $id }}" style="position:relative;background:none;border:none;padding:0.6rem 0.5rem 0.85rem 0.5rem;font-weight:{{ $loop->first ? 800 : 700 }};color:{{ $loop->first ? '#360910' : '#64748b' }};cursor:pointer;font-family:'Plus Jakarta Sans', sans-serif;letter-spacing:1.2px;transition:all 0.25s ease;white-space:nowrap;outline:none">
              <span>{{ $label }}</span>
              @if ($loop->first)
                <div data-home-underline style="position:absolute;bottom:-2px;left:0;right:0;height:4px;background-color:#360910;border-radius:4px"></div>
              @endif
            </button>
          @endforeach
        </div>
      </div>
      <div data-home-tab-panel>
        <div class="home-product-grid">@for ($i = 0; $i < 4; $i++)@include('partials.home-card-skeleton')@endfor</div>
      </div>
    </div>
  </section>

  <div data-home-themed></div>

  <section data-home-collections class="dv-home-collections" style="background-color:#FAF8F5">
    <div class="collections-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <div class="shimmer-bg" style="width:100px;height:10px;border-radius:4px"></div>
          <div class="shimmer-bg" style="width:220px;height:24px;border-radius:6px"></div>
        </div>
      </div>
    </div>
    <div class="collections-slider-container">
      <div class="collections-slider-track hide-scrollbar" style="cursor:grab">
        @for ($i = 0; $i < 4; $i++)
          <div class="collections-slider-item"><div class="shimmer-bg" style="width:224px;height:224px;border-radius:20px"></div></div>
        @endfor
      </div>
    </div>
  </section>

  <section data-home-latest class="dv-home-latest" style="background-color:#FAF8F5;border-top:1px solid rgba(10, 10, 10, 0.03);width:100%;box-sizing:border-box">
    <div style="max-width:1560px;margin:0 auto;width:100%;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
        <div data-home-latest-head-skel style="display:flex;flex-direction:column;gap:0.5rem">
          <div class="shimmer-bg" style="width:100px;height:10px;border-radius:4px"></div>
          <div class="shimmer-bg" style="width:220px;height:24px;border-radius:6px"></div>
        </div>
        <div data-home-latest-head hidden style="display:flex;flex-direction:column;gap:0.2rem;text-align:left">
          <span style="color:#8c8c8c;font-size:0.68rem;font-weight:600;text-transform:uppercase;letter-spacing:2px">Freshly Added</span>
          <h2 class="dv-home-h2" style="font-weight:800;letter-spacing:-0.3px;color:#0a0a0a;font-family:'Plus Jakarta Sans', 'Poppins', sans-serif;margin:0">Latest Collection</h2>
        </div>
      </div>
      <div class="home-product-grid" data-home-latest-grid>@for ($i = 0; $i < 4; $i++)@include('partials.home-card-skeleton')@endfor</div>
    </div>
  </section>

  <section class="dv-home-features-sec" style="background-color:#FAF8F5">
    <div class="container" style="max-width:1560px;margin:0 auto">
      <div data-home-features class="hide-scrollbar dv-home-features dv-loading" style="gap:1.25rem;margin-top:0rem;width:100%;-webkit-overflow-scrolling:touch;box-sizing:border-box">
        @for ($i = 0; $i < 5; $i++)
          <div class="shimmer-bg dv-home-feature-skel" style="background-color:#ffffff;border-radius:20px;height:76px;opacity:0.6;box-sizing:border-box"></div>
        @endfor
      </div>
    </div>
  </section>
</div>

<template data-home-skeleton>@include('partials.home-card-skeleton')</template>
@php
    $homeIcons = [];
    foreach (['arrow-right', 'chevron-left', 'chevron-right', 'play', 'flame', 'truck', 'sparkles', 'sprout', 'star', 'activity', 'shield-check', 'gift', 'headphones', 'shopping-bag', 'percent'] as $n) {
        $homeIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>
  window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, @json($homeIcons));
  window.DaivikaHome = {!! json_encode(['themes' => $themes, 'bestsellers' => $bestsellers, 'stories' => $stories, 'featureCards' => $featureCards], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!};
</script>
@endsection

@push('scripts')
  @include('partials.product-card-assets')
  <script src="/js/home.js"></script>
@endpush
