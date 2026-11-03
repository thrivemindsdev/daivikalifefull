@extends('layouts.store')

@section('title', $seoTitle)
@section('description', $page['seoDescription'])

@push('head')
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'WebPage',
      'name' => $page['schemaName'],
      'description' => $page['schemaDescription'],
      'publisher' => ['@type' => 'Organization', 'name' => 'Daivika', 'url' => $siteUrl],
  ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
@endpush

@section('content')
<div style="background-color:#fff;min-height:100vh">
  @include('partials.sub-page-header', ['title' => $content['heroTitle'] ?? '', 'subtitle' => $page['kicker']])
  <main style="padding-top:1rem;padding-bottom:10rem">
    <div class="container">
      <div style="max-width:800px;margin:0 auto">
        @if ($page['breadcrumbs'])
          @include('partials.breadcrumbs', ['items' => [['name' => $page['label'], 'url' => '/'.$slug]]])
        @endif

        @if ($page['layout'] === 'sections')
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:4rem">
            <p style="color:#666;font-size:1.1rem;line-height:1.8;max-width:650px;margin:0">{{ $content['heroSubtitle'] ?? '' }}</p>
          </div>

          <div data-fade-in="{{ $page['delay'] }}" style="color:#444;line-height:1.8;font-size:1.05rem;opacity:0">
            @foreach (range(1, 5) as $n)
              @if (! empty($content["section{$n}Title"]))
                <section style="margin-bottom:4rem">
                  <h2 style="font-size:1.5rem;font-weight:800;color:#111;margin-bottom:1.5rem">{{ $content["section{$n}Title"] }}</h2>
                  <p style="white-space:pre-line">{{ $content["section{$n}Body"] ?? '' }}</p>
                </section>
              @endif
            @endforeach
          </div>
        @else
          <div style="text-align:center;margin-bottom:4rem">
            <p style="color:#666;font-size:1.1rem;line-height:1.8;max-width:650px;margin:0 auto">{{ $content['heroSubtitle'] ?? '' }}</p>
          </div>

          <div data-fade-in="{{ $page['delay'] }}" style="display:flex;flex-direction:column;gap:4rem;opacity:0">
            @foreach ($page['cards'] as [$icon, $key])
              <section style="display:flex;gap:2rem;background-color:#fafafa;border-radius:20px;padding:2.5rem;border:1px solid #f0f0f0;flex-wrap:wrap">
                <div style="width:50px;height:50px;border-radius:12px;background-color:#faf5ff;border:1px solid rgba(10, 10, 10, 0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon :name="$icon" size="24" color="#0a0a0a" /></div>
                <div style="flex:1;min-width:260px">
                  <h2 style="font-size:1.4rem;font-weight:800;color:#111;margin-bottom:1rem;margin-top:0.2rem">{{ $content["{$key}Title"] ?? '' }}</h2>
                  <p style="color:#444;line-height:1.8;font-size:1.05rem;margin:0;white-space:pre-line">{{ $content["{$key}Body"] ?? '' }}</p>
                </div>
              </section>
            @endforeach
          </div>
        @endif
      </div>
    </div>
  </main>
</div>
@endsection

@push('scripts')
  <script src="/js/fade-in.js"></script>
@endpush
