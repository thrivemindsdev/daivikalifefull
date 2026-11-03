{{-- First-visit coupon popup (components/WelcomeCouponPopup.jsx); opened by public/js/welcome-popup.js --}}
@php
    $popup = array_merge(
        ['enabled' => true, 'imageUrl' => '', 'redirectUrl' => '', 'delaySeconds' => 10, 'title' => 'WELCOME OFFER', 'couponCode' => 'DAIVIKA10', 'discountText' => '10% OFF'],
        \App\Support\Json::obj(\App\Services\Settings::get('offer_popup_settings', []))
    );
    $couponCode = ($popup['couponCode'] ?? '') ?: 'DAIVIKA10';
    $hasImage = trim((string) ($popup['imageUrl'] ?? '')) !== '';
@endphp
<div data-popup data-enabled="{{ ($popup['enabled'] ?? true) === false ? 'false' : 'true' }}" data-delay="{{ (float) ($popup['delaySeconds'] ?? 10) ?: 10 }}" data-code="{{ $couponCode }}" hidden style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:&quot;Poppins&quot;, Georgia, serif;box-sizing:border-box">
  <div data-popup-backdrop style="position:absolute;inset:0;background-color:rgba(10, 2, 2, 0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)"></div>
  <div data-popup-fit style="position:relative;z-index:1;width:100%;max-width:360px;transform-origin:center center;flex-shrink:0">
    <div data-popup-card style="position:relative;width:100%;max-width:360px;background:linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 50%, #fdf0d5 100%);border-radius:22px;border:2px solid rgba(197,131,26,0.6);box-shadow:0 0 0 1px rgba(197,131,26,0.15), 0 30px 70px -15px rgba(54,9,16,0.55);overflow:hidden;z-index:1;display:flex;flex-direction:column;box-sizing:border-box">
      <div style="line-height:0;flex-shrink:0">
        <svg width="100%" height="13" viewBox="0 0 400 13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="ltpW" x="0" y="0" width="40" height="13" patternUnits="userSpaceOnUse"><path d="M20 12 Q10 6 0 12 Q10 1 20 4 Q30 1 40 12 Q30 6 20 12Z" fill="rgba(197,131,26,0.55)" /><circle cx="20" cy="4.5" r="1.8" fill="rgba(197,131,26,0.7)" /></pattern></defs>
          <rect width="100%" height="13" fill="url(#ltpW)" />
        </svg>
      </div>

      <div style="background:linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%);padding:0.7rem 1.2rem;display:flex;align-items:center;justify-content:space-between;position:relative;flex-shrink:0">
        <span style="position:absolute;top:5px;left:8px;font-size:0.6rem;color:rgba(197,131,26,0.5);line-height:1">✦</span>
        <span style="position:absolute;top:5px;right:40px;font-size:0.6rem;color:rgba(197,131,26,0.5);line-height:1">✦</span>
        <span style="position:absolute;bottom:5px;left:8px;font-size:0.44rem;color:rgba(197,131,26,0.35);line-height:1">❖</span>
        <span style="position:absolute;bottom:5px;right:40px;font-size:0.44rem;color:rgba(197,131,26,0.35);line-height:1">❖</span>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <div style="width:32px;height:32px;border-radius: 50%;background:radial-gradient(circle, #3d0b10 0%, #1a0306 100%);border:1.5px solid rgba(253,211,77,0.65);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(253,211,77,0.35);flex-shrink:0">
            <img src="/emblem.png" alt="Daivika Divine Eye" style="width:20px;height:20px;object-fit:contain;filter:brightness(1.15) drop-shadow(0 0 3px rgba(252,211,77,0.5))">
          </div>
          <div>
            <div style="font-size:0.68rem;font-weight:800;color:#fde68a;letter-spacing:1.5px;text-transform:uppercase;line-height:1">{{ ($popup['title'] ?? '') ?: 'WELCOME OFFER' }}</div>
            <div style="font-size:0.48rem;color:rgba(253,211,77,0.6);letter-spacing:0.6px;font-style:italic;margin-top:2px">── Divinely Blessed ──</div>
          </div>
        </div>
        <button type="button" data-popup-close class="dv-popup-close" aria-label="Close popup" style="width:28px;height:28px;border-radius: 50%;border:1px solid rgba(197,131,26,0.5);cursor:pointer;color:#fde68a;display:flex;align-items:center;justify-content:center;outline:none;padding:0;transition:all 0.2s;z-index:30"><x-icon name="x" size="13" /></button>
      </div>

      <div style="line-height:0;flex-shrink:0">
        <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="18" fill="#2a0508" />
          <defs><pattern id="msW" x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse"><circle cx="10" cy="9" r="3.5" fill="none" stroke="rgba(197,131,26,0.4)" stroke-width="0.7" /><circle cx="10" cy="9" r="1.2" fill="rgba(197,131,26,0.55)" /><line x1="10" y1="1" x2="10" y2="17" stroke="rgba(197,131,26,0.18)" stroke-width="0.5" /><line x1="3" y1="9" x2="17" y2="9" stroke="rgba(197,131,26,0.18)" stroke-width="0.5" /></pattern></defs>
          <rect width="100%" height="18" fill="url(#msW)" />
        </svg>
      </div>

      @if ($hasImage)
        <div @if ($popup['redirectUrl']) data-popup-redirect="{{ $popup['redirectUrl'] }}" @endif style="width:100%;aspect-ratio:1 / 1;overflow:hidden;position:relative;cursor:{{ $popup['redirectUrl'] ? 'pointer' : 'default' }};border-bottom:1px solid rgba(197,131,26,0.2)">
          <img src="{{ $popup['imageUrl'] }}" alt="{{ ($popup['title'] ?? '') ?: 'Welcome Offer' }}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block" onerror="this.style.display='none'">
        </div>
      @endif

      <div style="padding:1.1rem 1.25rem 1.25rem;flex-shrink:0;display:flex;flex-direction:column;gap:0.85rem;text-align:center">
        <div>
          <h2 style="font-size:1.55rem;font-weight:900;margin:0 0 0.3rem 0;color:#360910;letter-spacing:-0.3px;line-height:1.2">Flat {{ ($popup['discountText'] ?? '') ?: '10% OFF' }}</h2>
          <div style="display:flex;align-items:center;gap:5px;width:100%">
            <div style="flex:1;height:1px;background:linear-gradient(to right, transparent, rgba(197,131,26,0.45))"></div>
            <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
            <svg width="5" height="5" viewBox="0 0 5 5"><polygon points="2.5,0 5,2.5 2.5,5 0,2.5" fill="#c5831a" opacity="0.5" /></svg>
            <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
            <div style="flex:1;height:1px;background:linear-gradient(to left, transparent, rgba(197,131,26,0.45))"></div>
          </div>
          <p data-popup-hint style="font-size:0.72rem;color:#7c4f2f;margin:0.4rem 0 0;line-height:1.5;font-style:italic">Copy this sacred code &amp; login to apply at checkout</p>
        </div>

        <div style="background:linear-gradient(135deg, #fdf3d8 0%, #fce7a0 100%);border:1.5px dashed rgba(197,131,26,0.7);border-radius:10px;padding:0.7rem 0.9rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;box-shadow:inset 0 1px 3px rgba(54,9,16,0.06)">
          <div style="text-align:left">
            <span style="font-size:0.48rem;text-transform:uppercase;letter-spacing:1px;color:#7c4f2f;display:block;font-weight:700;margin-bottom:1px">✦ PROMO CODE ✦</span>
            <span style="font-size:1.2rem;font-weight:900;letter-spacing:2px;color:#360910;font-family:monospace;text-shadow:0 1px 2px rgba(54,9,16,0.1)">{{ $couponCode }}</span>
          </div>
          <button type="button" data-popup-copy style="background:linear-gradient(135deg, #3d0b10, #5c1520);border:none;color:#fde68a;padding:0.45rem 0.8rem;border-radius:7px;font-size:0.65rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:0.3rem;transition:all 0.2s;white-space:nowrap;letter-spacing:0.5px;box-shadow:0 3px 10px rgba(54,9,16,0.3);outline:none">
            <span data-popup-copy-icon><x-icon name="copy" size="11" /></span>
            <span data-popup-copied-icon hidden><x-icon name="check" size="11" stroke="3" /></span>
            <span data-popup-copy-label>COPY</span>
          </button>
        </div>

        @if ($popup['redirectUrl'])
          <a href="{{ $popup['redirectUrl'] }}" data-popup-shop style="display:flex;align-items:center;justify-content:center;gap:0.4rem;background:linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%);color:#2a0508;padding:0.75rem 1rem;border-radius:6px;font-weight:900;font-size:0.8rem;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase;box-shadow:0 5px 18px rgba(197,131,26,0.4);position:relative;overflow:hidden">
            <div data-popup-shimmer style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);width:40%"></div>
            <span style="position:relative;z-index:1">🪔 Shop Now</span>
            <x-icon name="chevron-right" size="14" style="position:relative;z-index:1" />
          </a>
        @endif

        <div style="font-size:0.56rem;color:rgba(120,70,30,0.55);letter-spacing:0.4px;font-style:italic;margin-top:-0.2rem">── शुभं भवतु · Blessings await you ──</div>
      </div>
    </div>
  </div>
</div>
