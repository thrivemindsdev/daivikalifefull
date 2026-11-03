@extends('layouts.store')

@section('title', 'Track Your Sacred Order | DAIVIKA by Zodimithra')
@section('description', 'Track the consecrated journey of your DAIVIKA order. Follow the real-time shipment of your Karungali mala, Rudraksha, and spiritual wearables.')

@push('head')
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'WebPage',
      'name' => 'Track Your Sacred Order - DAIVIKA',
      'description' => 'Real-time parcel tracking and consecrated shipping status for DAIVIKA spiritual orders.',
  ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
@endpush

@php
    // Nothing in the store saves its own tracking text, so the page always shows these
    $t = [
        'heroTitle' => 'Track Your Sacred Shipment',
        'heroSubtitle' => 'Follow the consecrated journey of your authentic spiritual wearables from our sanctum to your home.',
        'step1Title' => 'Sanctified & Packed with Care',
        'step1Desc' => 'Your order is consecrated, energized, and safely packed in protective devotional packaging.',
        'step2Title' => 'Dispatched via Express Courier',
        'step2Desc' => 'Shipped swiftly via trusted express courier partners across India.',
        'step3Title' => 'Out for Sacred Delivery',
        'step3Desc' => 'Our courier partner is en route to deliver divine blessings directly to your doorstep.',
        'faqQuestion' => 'How are spiritual products energized before shipping?',
        'faqAnswer' => 'All sacred malas and wearables undergo authentic Vedic Prana Pratishtha rituals by our priests prior to careful devotional packaging and dispatch.',
    ];
    $box = 'background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(0, 0, 0, 0.05);margin-bottom:2.5rem;width:100%;box-sizing:border-box';
@endphp

@section('content')
<div style="background-color:#fafaf9;min-height:100vh;width:100%;overflow-x:hidden">
  <main class="dv-track-main" style="padding-bottom:6rem">
    <div class="container" style="padding-left:1rem;padding-right:1rem;box-sizing:border-box">
      <div style="max-width:850px;margin:0 auto;width:100%">
        @include('partials.breadcrumbs', ['items' => [['name' => 'Order Tracking', 'url' => '/order-tracking']]])

        <div style="margin-bottom:2.5rem;text-align:center;width:100%">
          <div data-enter='{"opacity":0,"y":20}' data-enter-duration="0.6" style="opacity:0;transform:translateY(20px)">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#360910;margin-bottom:0.75rem">📦 CONCIERGE &amp; ORDER STATUS</div>
            <x-animated-title :text="$t['heroTitle']" style="font-size:clamp(1.6rem, 5.5vw, 2.6rem);font-weight:800;letter-spacing:-0.5px;margin-bottom:1rem;align-items:center;justify-content:center;line-height:1.25;word-break:break-word" />
            <p style="color:#64748b;font-size:0.95rem;line-height:1.6;max-width:620px;margin:0 auto;padding:0 0.5rem">{{ $t['heroSubtitle'] }}</p>
          </div>
        </div>

        <div data-enter='{"opacity":0,"y":20}' data-enter-duration="0.6" data-enter-delay="0.1" style="opacity:0;transform:translateY(20px);{{ $box }};padding:1.25rem 1rem">
          <form data-track-form style="display:flex;gap:0.75rem;flex-wrap:wrap;width:100%">
            <div style="position:relative;flex:1 1 220px;width:100%;min-width:0">
              <x-icon name="search" size="18" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#64748b" />
              <input type="text" name="ref" required placeholder="Order ID or invoice number" aria-label="Order ID or invoice number" class="dv-track-input" style="width:100%;padding:0.85rem 0.85rem 0.85rem 2.8rem;border-radius:14px;font-size:0.88rem;font-weight:600;outline:none;box-sizing:border-box;transition:all 0.2s;background-color:#fff;text-overflow:ellipsis">
            </div>
            <input type="tel" name="phone" inputmode="numeric" placeholder="Mobile number used for the order" aria-label="Mobile number used for the order" class="dv-track-input" style="flex:1 1 200px;width:100%;min-width:0;padding:0.85rem 1rem;border-radius:14px;font-size:0.88rem;font-weight:600;outline:none;box-sizing:border-box;background-color:#fff">
            <button type="submit" data-track-submit style="flex:1 1 auto;width:100%;padding:0.85rem 1.5rem;background:linear-gradient(135deg, #360910 0%, #54111c 100%);color:#fff;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:0.5rem;box-shadow:0 4px 16px rgba(54, 9, 16, 0.35)">Track Package</button>
          </form>
          <div data-track-error role="alert" hidden style="margin-top:0.85rem;padding:0.75rem 1rem;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:0.85rem;font-weight:600"></div>
        </div>

        <div data-track-result hidden style="{{ $box }};padding:clamp(1.25rem, 4vw, 2.5rem)"></div>
        <div data-track-recent hidden style="{{ $box }};padding:clamp(1.25rem, 4vw, 2rem)"></div>

        <div data-enter='{"opacity":0}' data-enter-transition="default" data-enter-delay="0.4" style="opacity:0;border-top:1px solid #e2e8f0;padding-top:3rem">
          <h4 style="font-size:1.15rem;font-weight:800;color:#0f172a;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem"><x-icon name="help-circle" size="18" color="#360910" /> {{ $t['faqQuestion'] }}</h4>
          <p style="font-size:0.95rem;color:#64748b;line-height:1.7;margin:0">{{ $t['faqAnswer'] }}</p>
        </div>
      </div>
    </div>
  </main>
</div>
@php
    $trackIcons = [];
    foreach (['shopping-bag', 'clock', 'arrow-right'] as $n) {
        $trackIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>
  window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, @json($trackIcons));
  window.DaivikaTracking = @json($t);
</script>
@endsection

@push('scripts')
  <script src="/js/enter.js"></script>
  <script src="/js/order-tracking.js"></script>
@endpush
