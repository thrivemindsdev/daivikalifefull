@extends('layouts.store')

@section('title', $pageTitle)
@section('description', $pageDescription)

@push('head')
  <link rel="stylesheet" href="/css/products.css">
@endpush

@php
    $chevron = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" aria-hidden="true" style="flex-shrink:0;transform:rotate(0);transition:0.3s;opacity:0.7">'.json_decode(file_get_contents(resource_path('icons/chevron-down.svg')), true)['inner'].'</svg>';
@endphp

@section('content')
<div style="background-color:var(--color-bg);min-height:100vh;font-family:&quot;Poppins&quot;, sans-serif">
  <div class="container dv-prod-container" style="max-width:1560px;margin:0 auto;box-sizing:border-box">
    <div class="dv-prod-crumbs" data-prod-crumbs>@include('partials.breadcrumbs', ['items' => $crumbs])</div>

    <h1 class="dv-prod-h1" data-prod-title style="font-weight:900;color:#0f172a;letter-spacing:-0.5px">{{ $categoryName }}</h1>
    <p class="dv-prod-intro" data-prod-intro @if (!$introText) hidden @endif style="max-width:760px;color:#5f5a55;line-height:1.65">{{ $introText }}</p>

    <div class="store-top-bar">
      <form data-prod-search style="position:relative;width:100%">
        <div class="store-search-input-wrapper">
          <div class="store-search-icon"><x-icon name="search" size="18" /></div>
          <input type="text" placeholder="Search for Karungali malas..." value="{{ $search }}" class="store-search-input">
        </div>
        <button type="submit" class="store-search-btn">FIND <x-icon name="sparkles" size="14" /></button>
      </form>

      <div class="store-dropdowns-container">
        {{-- Collection, category and size dropdowns: hidden by the page's CSS (the sidebar has these filters) --}}
        <div class="store-gender-wrapper" style="position:relative;flex:1">
          <button class="store-filter-btn"><span class="store-filter-label"><x-icon name="filter" size="14" color="var(--color-primary)" /> Collection:</span><span class="store-filter-value">All</span>{!! $chevron !!}</button>
        </div>
        <div class="store-category-wrapper" style="position:relative;flex:1">
          <button class="store-filter-btn"><span class="store-filter-label"><x-icon name="filter" size="14" color="var(--color-primary)" /> Category:</span><span class="store-filter-value">All Categories</span>{!! $chevron !!}</button>
        </div>
        <div class="store-size-wrapper" style="position:relative;flex:1">
          <button class="store-filter-btn"><span class="store-filter-label"><x-icon name="tag" size="14" color="var(--color-primary)" /> Size:</span><span class="store-filter-value" style="text-transform:uppercase">All Sizes</span>{!! $chevron !!}</button>
        </div>

        <button type="button" class="store-filter-btn dv-prod-mobile-only" data-prod-open-filters>
          <span class="store-filter-label"><x-icon name="sliders-horizontal" size="14" color="var(--color-primary)" /> Filters</span>
          <span class="store-filter-value" data-prod-applied hidden></span>
        </button>

        <div class="store-sort-wrapper" data-prod-sort style="position:relative;flex:1">
          <button class="store-filter-btn" data-prod-sort-btn>
            <span class="store-filter-label"><x-icon name="sliders-horizontal" size="14" color="var(--color-primary)" /> Sort:</span>
            <span class="store-filter-value" data-prod-sort-value>Featured</span>
            {!! $chevron !!}
          </button>
        </div>
      </div>
    </div>

    <div class="store-catalog-layout">
      <aside class="store-filter-sidebar dv-prod-desktop-only" data-prod-sidebar></aside>
      <div class="store-catalog-main">
        <div data-prod-chips></div>
        <div data-prod-main>
          <div class="dv-prod-grid" style="display:grid;margin-top:1.5rem">@for ($i = 0; $i < 8; $i++)@include('partials.home-card-skeleton')@endfor</div>
        </div>
      </div>
    </div>
  </div>
</div>

<div data-prod-drawer hidden style="position:fixed;inset:0;z-index:100000;display:flex" role="dialog" aria-modal="true" aria-label="Filters">
  <div data-prod-drawer-backdrop style="position:absolute;inset:0;background:rgba(15, 23, 42, 0.45)"></div>
  <div style="position:relative;width:min(360px, 88vw);height:100%;background:#f8fafc;display:flex;flex-direction:column;box-shadow:8px 0 30px rgba(0,0,0,0.15)">
    <div style="display:flex;align-items:center;justify-content:flex-end;padding:0.6rem 0.75rem 0">
      <button type="button" data-prod-drawer-close aria-label="Close filters" style="background:none;border:none;padding:0.4rem;cursor:pointer;color:#334155;display:flex"><x-icon name="x" size="20" /></button>
    </div>
    <div data-prod-drawer-body style="flex:1;overflow-y:auto;padding:0 0.75rem 1rem"></div>
    <div style="padding:0.75rem;border-top:1px solid #e2e8f0;background:#fff">
      <button type="button" data-prod-drawer-close data-prod-drawer-count style="width:100%;padding:0.85rem;border:none;border-radius:12px;background:var(--color-primary);color:#fff;font-weight:800;font-size:0.9rem;cursor:pointer;font-family:inherit">Show 0 products</button>
    </div>
  </div>
</div>

<template data-prod-skeleton>@include('partials.home-card-skeleton')</template>
@php
    $prodIcons = [];
    foreach (['chevron-down', 'chevron-right', 'home', 'star'] as $n) {
        $prodIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>
  window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, {!! json_encode($prodIcons, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!});
  window.DaivikaShop = {!! json_encode(['themes' => $themes, 'intro' => $shopIntro], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!};
</script>
@endsection

@push('scripts')
  @include('partials.product-card-assets')
  <script src="/js/products.js"></script>
@endpush
