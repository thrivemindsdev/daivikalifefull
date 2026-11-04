@extends('layouts.store')

@push('head')
  <style>
    input::placeholder, textarea::placeholder { color: #9ca3af !important; opacity: 0.7 !important; font-weight: 400 !important; }
    /* iPhones zoom the whole page into any field under 16px */
    @media (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dv-co-back:hover { background-color: #f1f5f9 !important; }
    .dv-co-addr-opt:not(.dv-on):hover { background-color: #f8fafc !important; }
    .dv-co-policy a:hover { color: #6b7280 !important; }
    .dv-co-pay:not(:disabled):hover { background-color: #1f1f1f !important; }
    .dv-co-trash { opacity: 0.6; }
    .dv-co-trash:hover { opacity: 1; background-color: #fee2e2 !important; }
    .dv-co-link:hover { color: #4b5563 !important; }
    .dv-co-apply:hover { background-color: #1f1f1f !important; }
    .dv-co-invoice:hover { background-color: #fdfbf9 !important; }
    .dv-co-cancel:hover { background-color: #f3f4f6 !important; color: #111827 !important; }
    .dv-co-dark:hover { background-color: #1f1f1f !important; }
    .dv-co-input:focus { border-color: #0a0a0a !important; }
    .dv-co-input.dv-err, .dv-co-input.dv-err:focus { border-color: #ef4444 !important; }
  </style>
@endpush

@section('content')
{{-- public/js/checkout.js replaces the "Securing checkout session" screen with the checkout --}}
<div data-checkout>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background-color:#f9fafb;color:#0a0a0a;font-family:&quot;Poppins&quot;, sans-serif">
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
      <div style="width:40px;height:40px;border-radius: 50%;border:3px solid rgba(10, 10, 10, 0.1);border-top-color:#0a0a0a;animation:spin 1s linear infinite"></div>
      <p style="font-size:0.9rem;font-weight:600">Securing checkout session...</p>
    </div>
  </div>
</div>
<div data-checkout-modal></div>

@php
    $coIcons = [];
    foreach (['shopping-bag', 'shield-check', 'check-circle-2', 'chevron-right', 'map-pin', 'mail', 'arrow-left', 'loader-2', 'sparkles', 'search', 'chevron-down', 'tag', 'alert-triangle', 'credit-card', 'truck', 'download', 'package', 'minus', 'plus', 'trash-2', 'lock', 'gift', 'clock'] as $n) {
        $coIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>
  window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, {!! json_encode($coIcons, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!});
  window.DaivikaCheckout = {!! json_encode(['razorpayKey' => config('daivika.razorpay.key_id')], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!};
</script>
@endsection

@push('scripts')
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script src="/js/india-districts.js"></script>
  <script src="/js/address-tools.js"></script>
  <script src="/js/vendor/jspdf.umd.min.js" defer></script>
  <script src="/js/vendor/jspdf.plugin.autotable.min.js" defer></script>
  <script src="/js/gst.js" defer></script>
  <script src="/js/checkout.js"></script>
@endpush
