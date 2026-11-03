@props(['text', 'delay' => 0.1, 'tag' => 'div'])
{{-- components/AnimatedTitle.jsx: each line rises into view (y 100% → 0, 1.2 s) the first time it is seen.
     Pass the extra styles the React call gave as `style`. --}}
@php $lines = is_array($text) ? $text : [$text]; @endphp
<{{ $tag }} {{ $attributes->merge(['style' => 'display:flex;flex-direction:column;color:inherit;font-size:inherit;font-weight:inherit;line-height:1.1;margin:0']) }}>
  @foreach ($lines as $i => $line)
    <div style="overflow:hidden"><div data-inview='{"y":"100%"}' data-enter-duration="1.2" data-enter-ease="[0.16,1,0.3,1]" data-enter-delay="{{ $delay + $i * 0.15 }}" style="transform:translateY(100%)">{{ $line }}</div></div>
  @endforeach
</{{ $tag }}>
