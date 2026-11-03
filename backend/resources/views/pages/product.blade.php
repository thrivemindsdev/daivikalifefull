@extends('layouts.store')

@section('title', $pageTitle)

@push('head')
  <link rel="stylesheet" href="/css/product.css">
@endpush

@section('content')
{{-- public/js/product.js loads the product and draws the page here; the spinner shows until then --}}
<div data-pd-root data-product-id="{{ $productId }}">
  <div style="min-height:80vh;display:flex;align-items:center;justify-content:center">
    <div style="text-align:center">
      <div style="width:40px;height:40px;border-radius: 50%;border:3px solid #f1f5f9;border-top-color:#0a0a0a;animation:spin 0.7s linear infinite;margin:0 auto 1rem"></div>
      <p style="font-size:0.85rem;color:#94a3b8;font-weight:600">Loading product...</p>
    </div>
  </div>
</div>

@php
    $pdIcons = [];
    foreach (['link-2', 'share-2', 'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up', 'home', 'star', 'sparkles', 'clock', 'shopping-cart', 'heart', 'ruler', 'shield-check', 'truck', 'rotate-ccw', 'info', 'message-square', 'thumbs-up', 'bell', 'loader-2', 'check-circle-2'] as $n) {
        $pdIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, {!! json_encode($pdIcons, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!});</script>
@endsection

@push('scripts')
  @include('partials.product-card-assets')
  <script src="/js/product.js"></script>
@endpush
