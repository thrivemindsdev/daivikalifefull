{{-- Icons and script for product cards (public/js/product-card.js); include once on pages that show cards --}}
@php
    $cardIcons = [];
    foreach (['heart', 'star', 'plus', 'minus', 'shopping-bag', 'tag'] as $n) {
        $cardIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, @json($cardIcons));</script>
<script src="/js/product-card.js"></script>
