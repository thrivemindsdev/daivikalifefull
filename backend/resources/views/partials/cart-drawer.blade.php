{{-- Cart drawer (components/CartDrawer.jsx); items are drawn by public/js/cart-drawer.js --}}
<div data-cart hidden>
  <div data-cart-overlay style="position:fixed;inset:0;background-color:rgba(10, 2, 2, 0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:1000000"></div>

  <div data-cart-panel class="dv-cart-panel" style="position:fixed;max-width:100%;background:linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 40%, #fdf0d5 100%);border-radius:22px;border:2px solid rgba(197, 131, 26, 0.6);box-shadow:0 0 0 1px rgba(197,131,26,0.15), 0 30px 80px -20px rgba(54,9,16,0.5), inset 0 1px 0 rgba(255,255,255,0.7);z-index:1000001;display:flex;flex-direction:column;overflow:hidden;font-family:&quot;Poppins&quot;, Georgia, serif;box-sizing:border-box">
    <div style="flex-shrink:0;line-height:0">
      <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="lotusPatternT" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse"><path d="M20 13 Q10 7 0 13 Q10 1 20 4 Q30 1 40 13 Q30 7 20 13Z" fill="rgba(197,131,26,0.55)" /><circle cx="20" cy="5" r="2" fill="rgba(197,131,26,0.7)" /></pattern></defs>
        <rect width="100%" height="14" fill="url(#lotusPatternT)" />
      </svg>
    </div>

    <div style="padding:0.9rem 1.4rem;background:linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%);display:flex;justify-content:space-between;align-items:center;position:relative;flex-shrink:0">
      <span style="position:absolute;top:6px;left:10px;font-size:0.7rem;color:rgba(197,131,26,0.5);line-height:1">✦</span>
      <span style="position:absolute;top:6px;right:46px;font-size:0.7rem;color:rgba(197,131,26,0.5);line-height:1">✦</span>
      <span style="position:absolute;bottom:6px;left:10px;font-size:0.5rem;color:rgba(197,131,26,0.35);line-height:1">❖</span>
      <span style="position:absolute;bottom:6px;right:46px;font-size:0.5rem;color:rgba(197,131,26,0.35);line-height:1">❖</span>
      <div style="display:flex;align-items:center;gap:0.6rem">
        <div style="width:36px;height:36px;border-radius: 50%;background:radial-gradient(circle, #3d0b10 0%, #1a0306 100%);border:1.5px solid rgba(253,211,77,0.65);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(253,211,77,0.35);flex-shrink:0">
          <img src="/emblem.png" alt="Daivika Divine Eye" style="width:22px;height:22px;object-fit:contain;filter:brightness(1.15) drop-shadow(0 0 3px rgba(252,211,77,0.5))">
        </div>
        <div>
          <h2 style="margin:0;font-size:1.05rem;font-weight:800;color:#fde68a;letter-spacing:1.5px;text-transform:uppercase;line-height:1">Sacred Cart</h2>
          <div style="font-size:0.58rem;color:rgba(253,211,77,0.6);letter-spacing:0.8px;margin-top:2px;font-style:italic">── Divinely Curated ──</div>
        </div>
        <span data-cart-count hidden style="font-size:0.65rem;font-weight:900;background:linear-gradient(135deg, #fcd34d, #f59e0b);color:#360910;padding:0.2rem 0.6rem;border-radius:100px;border:1px solid rgba(253,211,77,0.5);box-shadow:0 2px 6px rgba(253,211,77,0.3);line-height:1;flex-shrink:0"></span>
      </div>
      <button type="button" class="dv-cart-close" data-cart-close aria-label="Close cart" style="width:32px;height:32px;min-width:32px;border-radius: 50%;border:1px solid rgba(197,131,26,0.5);cursor:pointer;color:#fde68a;display:flex;align-items:center;justify-content:center;outline:none;padding:0;transition:all 0.2s"><x-icon name="x" size="15" stroke="2.5" /></button>
    </div>

    @include('partials.cart-mandala')

    <div data-cart-items style="flex:1;overflow-y:auto;padding:1rem 1.1rem;display:flex;flex-direction:column;gap:0.85rem;scrollbar-width:thin;scrollbar-color:rgba(197,131,26,0.3) transparent"></div>

    <div data-cart-footer hidden style="flex-shrink:0">
      @include('partials.cart-mandala')
      <div style="padding:1.1rem 1.4rem 1.3rem;background:linear-gradient(180deg, #3d0b10 0%, #2a0508 100%);display:flex;flex-direction:column;gap:0.85rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:0.58rem;color:rgba(253,211,77,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px">✦ TOTAL OFFERING ✦</div>
            <div style="font-size:0.75rem;font-weight:600;color:rgba(253,211,77,0.65)">Consecrated Order</div>
          </div>
          <div data-cart-total style="font-size:1.5rem;font-weight:900;color:#fde68a;text-shadow:0 0 20px rgba(252,211,77,0.35);letter-spacing:-0.5px"></div>
        </div>
        <button type="button" class="dv-cart-checkout" data-cart-checkout style="width:100%;padding:0.95rem 1.5rem;background:linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%);color:#2a0508;border:none;border-radius:7px;font-size:0.88rem;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.6rem;outline:none;box-shadow:0 6px 24px rgba(197,131,26,0.4), inset 0 1px 0 rgba(255,255,255,0.3);position:relative;overflow:hidden">
          <div data-cart-shimmer style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);width:40%"></div>
          <span style="position:relative;z-index:1">🪔 Proceed to Checkout</span>
          <x-icon name="arrow-right" size="15" stroke="2.5" style="position:relative;z-index:1" />
        </button>
        <div style="text-align:center;font-size:0.6rem;color:rgba(253,211,77,0.4);letter-spacing:0.5px;font-style:italic">── शुभं भवतु · May your order be blessed ──</div>
      </div>
      <div style="line-height:0">
        <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="lotusPatternB" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse"><path d="M20 1 Q10 7 0 1 Q10 13 20 10 Q30 13 40 1 Q30 7 20 1Z" fill="rgba(197,131,26,0.55)" /><circle cx="20" cy="9" r="2" fill="rgba(197,131,26,0.7)" /></pattern></defs>
          <rect width="100%" height="14" fill="url(#lotusPatternB)" />
        </svg>
      </div>
    </div>
  </div>

  {{-- Empty state, copied into the items panel when the cart has nothing in it --}}
  <template data-cart-empty>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:2rem 1rem;text-align:center">
      <div style="width:128px;height:128px;border-radius: 50%;background:radial-gradient(circle, rgba(252,211,77,0.12) 0%, rgba(197,131,26,0.04) 70%);border:2px dashed rgba(197,131,26,0.4);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;position:relative;box-shadow:0 0 24px rgba(252,211,77,0.1)">
        @foreach ([0, 60, 120, 180, 240, 300] as $a)
          <div style="position:absolute;width:12px;height:20px;border-radius: 50%;background:rgba(197,131,26,0.18);top:50%;left:50%;transform:rotate({{ $a }}deg) translateY(-58px) translateX(-6px);transform-origin:6px 58px"></div>
        @endforeach
        <svg width="88" height="88" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="flameGrad" cx="50%" cy="80%" r="60%"><stop offset="0%" stop-color="#f97316" /><stop offset="100%" stop-color="#fbbf24" stop-opacity="0.4" /></radialGradient>
            <radialGradient id="flameInner" cx="50%" cy="80%" r="50%"><stop offset="0%" stop-color="#fde68a" /><stop offset="100%" stop-color="#f59e0b" stop-opacity="0.3" /></radialGradient>
            <radialGradient id="diyaBody" cx="50%" cy="30%" r="60%"><stop offset="0%" stop-color="#fcd34d" /><stop offset="100%" stop-color="#b45309" /></radialGradient>
          </defs>
          <ellipse cx="45" cy="18" rx="5" ry="10" fill="url(#flameGrad)" opacity="0.9"><animate attributeName="ry" values="10;13;10;8;10" dur="1.8s" repeatCount="indefinite" /><animate attributeName="cy" values="18;16;18;20;18" dur="1.8s" repeatCount="indefinite" /></ellipse>
          <ellipse cx="45" cy="22" rx="3" ry="5" fill="url(#flameInner)" opacity="0.9"><animate attributeName="ry" values="5;7;5;4;5" dur="1.8s" repeatCount="indefinite" /></ellipse>
          <line x1="45" y1="28" x2="45" y2="36" stroke="#78350f" stroke-width="1.5" />
          <path d="M25 50 Q30 36 45 35 Q60 36 65 50 Q62 62 45 65 Q28 62 25 50Z" fill="url(#diyaBody)" />
          <path d="M30 52 Q35 42 45 41 Q55 42 60 52 Q57 60 45 62 Q33 60 30 52Z" fill="rgba(251,191,36,0.4)" />
          <path d="M60 48 Q68 44 70 50 Q68 56 60 53Z" fill="#b45309" />
          <ellipse cx="45" cy="52" rx="9" ry="4" fill="rgba(251,191,36,0.35)" />
          <ellipse cx="45" cy="72" rx="22" ry="5" fill="rgba(180,83,9,0.25)" />
          <circle cx="45" cy="20" r="16" fill="rgba(251,191,36,0.08)"><animate attributeName="r" values="16;22;16" dur="1.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.08;0.2;0.08" dur="1.8s" repeatCount="indefinite" /></circle>
        </svg>
      </div>
      @include('partials.cart-divider')
      <h3 style="font-size:1.1rem;font-weight:800;color:#360910;margin:1rem 0 0.35rem;letter-spacing:0.5px">Your Sacred Space is Empty</h3>
      <p style="font-size:0.75rem;color:#7c4f2f;margin:0 0 0.4rem;line-height:1.6;font-style:italic;letter-spacing:0.3px">"आरंभे शुभं" — Begin with the auspicious</p>
      <p style="font-size:0.8rem;color:#7c4f2f;margin:0 0 1.5rem;max-width:240px;line-height:1.6">Fill your cart with divinely crafted offerings</p>
      @include('partials.cart-divider')
      <button type="button" class="dv-cart-begin" data-cart-close style="margin-top:1.5rem;padding:0.85rem 2rem;background:linear-gradient(135deg, #360910 0%, #5c1520 100%);color:#fde68a;border:1.5px solid rgba(197,131,26,0.6);border-radius:6px;font-size:0.82rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;outline:none;box-shadow:0 6px 20px rgba(54,9,16,0.25)">🪔 Begin Shopping</button>
    </div>
  </template>
</div>
@php
    $cartIcons = [];
    foreach (['sparkles', 'gift', 'minus', 'plus'] as $n) {
        $cartIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, @json($cartIcons));</script>
