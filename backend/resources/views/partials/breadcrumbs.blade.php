@php
    $trail = array_merge([['name' => 'Home', 'url' => '/']], $items);
    $schema = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => array_map(fn ($item, $i) => [
            '@type' => 'ListItem',
            'position' => $i + 1,
            'name' => $item['name'],
            'item' => 'https://daivika.com'.($item['url'] === '/' ? '/' : $item['url']),
        ], $trail, array_keys($trail)),
    ];
@endphp
<script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
<nav aria-label="Breadcrumb" style="margin:0.1rem 0 0.35rem;display:flex;align-items:center">
  <ol style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;list-style:none;padding:0;margin:0;font-size:0.85rem;color:#64748b;font-weight:500">
    @foreach ($trail as $i => $item)
      <li style="display:flex;align-items:center;gap:0.4rem">
        @if ($i > 0)
          <x-icon name="chevron-right" size="14" color="#94a3b8" style="flex-shrink:0" />
        @endif
        @if ($loop->last)
          <span style="color:#0f172a;font-weight:700" aria-current="page">{{ $item['name'] }}</span>
        @else
          <a href="{{ $item['url'] }}" class="breadcrumb-link" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.25rem;transition:color 0.2s">
            @if ($i === 0)
              <x-icon name="home" size="14" style="margin-bottom:1px" />
            @endif
            {{ $item['name'] }}
          </a>
        @endif
      </li>
    @endforeach
  </ol>
</nav>
