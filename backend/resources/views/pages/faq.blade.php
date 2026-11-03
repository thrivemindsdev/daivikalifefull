@extends('layouts.store')

@section('title', 'Help & FAQs | DAIVIKA by Zodimithra - Authentic Spiritual Wearables')
@section('description', 'Find answers to common questions about Daivika by Zodimithra Karungali malas, Rudraksha energisation, shipping, tracking, and devotee support.')

@push('head')
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'FAQPage',
      'mainEntity' => array_map(fn ($faq) => ['@type' => 'Question', 'name' => $faq['question'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq['answer']]], $faqs),
  ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
@endpush

@section('content')
<div style="background-color:#fff;min-height:100vh">
  @include('partials.sub-page-header', ['title' => 'FAQ', 'subtitle' => 'Frequently Asked Questions'])
  <main style="padding-top:1rem;padding-bottom:10rem">
    <div class="container">
      @include('partials.breadcrumbs', ['items' => [['name' => 'FAQ & Help', 'url' => '/faq']]])

      <div style="text-align:center;margin-bottom:4rem">
        <div id="faq-tabs" style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;opacity:0">
          @foreach ($categories as $category)
            <button type="button" data-faq-tab="{{ $category }}" style="padding:0.8rem 2rem;border-radius:100px;font-size:0.95rem;font-weight:600;background-color:{{ $loop->first ? 'var(--color-primary)' : 'transparent' }};color:{{ $loop->first ? '#fff' : '#666' }};border:{{ $loop->first ? 'none' : '1px solid #eee' }};transition:all 0.3s ease;cursor:pointer">{{ $category }}</button>
          @endforeach
        </div>
      </div>

      <div style="max-width:800px;margin:0 auto">
        <div id="faq-list">
          @foreach ($faqs as $faq)
            <div data-faq="{{ $faq['category'] }}" data-open="false" style="border-radius:24px;border:1px solid #f0f0f0;background-color:#fff;overflow:hidden;transition:all 0.4s ease;max-width:800px;margin:0 auto 1rem auto">
              <button type="button" aria-expanded="false" style="width:100%;padding:clamp(1.25rem, 5vw, 2.5rem);display:flex;justify-content:space-between;align-items:center;text-align:left;gap:1.5rem">
                <h3 style="font-size:clamp(1rem, 3.5vw, 1.25rem);font-weight:700;color:#111;transition:color 0.3s ease;line-height:1.4">{{ $faq['question'] }}</h3>
                <div data-faq-icon style="color:#999;background-color:transparent;width:clamp(36px, 10vw, 44px);height:clamp(36px, 10vw, 44px);border-radius: 50%;display:flex;align-items:center;justify-content:center;border:1px solid #eee;flex-shrink:0"><x-icon name="plus" size="18" /></div>
              </button>
              <div data-faq-panel hidden>
                <div style="padding:0 clamp(1.25rem, 5vw, 2.5rem) clamp(1.25rem, 5vw, 2.5rem) clamp(1.25rem, 5vw, 2.5rem);color:#666;line-height:1.8;font-size:clamp(0.9rem, 3vw, 1.05rem);max-width:100%">
                  <div style="width:40px;height:2px;background-color:var(--color-primary);margin-bottom:1.25rem;opacity:0.3"></div>
                  {{ $faq['answer'] }}
                </div>
              </div>
            </div>
          @endforeach
        </div>
      </div>
      <template id="faq-icon-plus"><x-icon name="plus" size="18" /></template>
      <template id="faq-icon-minus"><x-icon name="minus" size="18" /></template>

      <div id="faq-help" style="margin-top:clamp(5rem, 15vw, 10rem);padding:clamp(3rem, 10vw, 6rem) clamp(1.25rem, 5vw, 3rem);background-color:#0a0a0a;border-radius:40px;text-align:center;position:relative;overflow:hidden;color:#fff;border:1px solid rgba(189, 155, 59, 0.15);box-shadow:0 20px 40px rgba(10, 10, 10, 0.15);opacity:0;transform:translateY(40px)">
        <x-icon name="message-square" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(8);opacity:0.04;z-index:0" />
        <div style="position:relative;z-index:1;width:100%">
          <h2 style="font-size:clamp(1.8rem, 6vw, 3rem);font-weight:800;margin-bottom:1.25rem;letter-spacing:-1px">Still have questions?</h2>
          <p style="font-size:clamp(0.95rem, 3.5vw, 1.15rem);color:rgba(255, 255, 255, 0.85);max-width:600px;margin:0 auto 3rem;line-height:1.6">Our concierge team is available to assist you with a bespoke shopping experience. We are here 24/7.</p>
          <div style="display:flex;justify-content:center;gap:clamp(1.5rem, 6vw, 4rem);flex-wrap:wrap;width:100%">
            <a href="mailto:{{ $email }}" style="display:flex;align-items:center;gap:0.8rem;font-size:clamp(0.9rem, 3.2vw, 1.15rem);font-weight:600;color:#fff;transition:all 0.3s;word-break:break-all">
              <div style="width:clamp(44px, 12vw, 60px);height:clamp(44px, 12vw, 60px);border-radius: 50%;background-color:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon name="mail" size="20" /></div>
              {{ $email }}
            </a>
            @foreach ($phones as $phone)
              <a href="tel:{{ preg_replace('/\s+/', '', $phone) }}" style="display:flex;align-items:center;gap:0.8rem;font-size:clamp(0.9rem, 3.2vw, 1.15rem);font-weight:600;color:#fff;transition:all 0.3s;white-space:nowrap">
                <div style="width:clamp(44px, 12vw, 60px);height:clamp(44px, 12vw, 60px);border-radius: 50%;background-color:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon name="phone" size="20" /></div>
                {{ $phone }}
              </a>
            @endforeach
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
@endsection

@push('scripts')
  <script src="/js/faq.js"></script>
@endpush
