@props(['name', 'size' => 24, 'color' => 'currentColor', 'stroke' => 2])
@php
    // Lucide icons, stored as the exact markup lucide-react renders
    static $cache = [];
    $icon = $cache[$name] ??= json_decode(file_get_contents(resource_path("icons/$name.svg")), true);
@endphp
<svg xmlns="http://www.w3.org/2000/svg" width="{{ $size }}" height="{{ $size }}" viewBox="0 0 24 24" fill="none" stroke="{{ $color }}" stroke-width="{{ $stroke }}" stroke-linecap="round" stroke-linejoin="round" {{ $attributes->merge(['class' => $icon['cls']]) }} aria-hidden="true">{!! $icon['inner'] !!}</svg>
