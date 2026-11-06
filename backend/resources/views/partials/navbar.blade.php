{{-- Storefront header (components/Navbar.jsx). Shopper-specific parts (account, cart count, notifications,
     search results) are filled in by public/js/navbar.js. --}}
@php
    $isProductPage = request()->is('product*');
    $isCheckout = request()->is('checkout');
    $path = '/'.ltrim(request()->path(), '/');
    $placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text fill="%2394a3b8" font-family="sans-serif" font-size="12" font-weight="bold" x="50%" y="54%" text-anchor="middle">DAIVIKA</text></svg>';
    $iconBtn = 'display:flex;align-items:center;justify-content:center;border-radius:6px;background-color:rgba(212, 175, 55, 0.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fde8b8;border:1.5px solid rgba(212, 175, 55, 0.45);transition:all 0.3s ease;cursor:pointer;outline:none';
    $deskBtn = 'position:relative;width:38px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(0, 0, 0, 0.1);outline:none';
    $badge = 'position:absolute;align-items:center;justify-content:center;font-weight:800;border-radius: 50%;width:18px;height:18px';
    $menuItem = 'display:flex;align-items:center;gap:0.75rem;width:100%;padding:0.65rem 0.85rem;border:none;border-radius:10px;cursor:pointer;color:#0f172a;font-size:0.85rem;font-weight:700;text-align:left;transition:all 0.2s';
    $drawerRow = 'display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1.25rem;border-bottom:1px solid #f1f5f9;cursor:pointer;text-decoration:none';
    $drawerIcon = 'width:36px;height:36px;border-radius:10px;background-color:#fef3c7;display:flex;align-items:center;justify-content:center;flex-shrink:0';
@endphp

<style>
  @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes marquee-scroll-nav { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes pulse-lightning { 0% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.18); } 100% { opacity: 0.7; transform: scale(1); } }
  .nav-drawer-link { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 0.5rem; text-decoration: none; transition: all 0.15s ease; border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #ffffff; }
  .nav-drawer-link:hover { color: #0a0a0a !important; }
  .search-bar-input::placeholder { color: rgba(255, 255, 255, 0.75) !important; }
  .marquee-content-nav { display: flex; width: max-content; animation: marquee-scroll-nav 35s linear infinite; }
  .marquee-text-nav { padding: 0 1.5rem; font-size: 0.68rem; font-weight: 700; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 1.5rem; white-space: nowrap; }
  .hide-nav-scrollbar::-webkit-scrollbar { display: none; }
  .hide-nav-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .category-tab-active { background-color: rgba(0, 0, 0, 0.16) !important; opacity: 1 !important; }
  .category-tab-active::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 20px; height: 3px; background-color: #ffffff; border-radius: 4px; }
  @keyframes pulse-glow { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(166, 124, 82, 0.4); } 70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(166, 124, 82, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(166, 124, 82, 0); } }
  @keyframes wiggle-bell { 0%, 100% { transform: rotate(0); } 15% { transform: rotate(-10deg); } 30% { transform: rotate(10deg); } 45% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 75% { transform: rotate(-2deg); } 90% { transform: rotate(2deg); } }
  .animate-wiggle { animation: wiggle-bell 2.5s infinite; }
  @keyframes gold-shimmer-sweep { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
</style>



<header id="dv-header" style="position:sticky;top:0;left:0;right:0;z-index:1000;font-family:&quot;Poppins&quot;, sans-serif;background:transparent;padding:0;transform:none">
  {{-- Phones and tablets --}}
  <div class="dv-nav-m" style="width:100%;background:linear-gradient(135deg, #260509 0%, #3d0b10 40%, #4a0d15 70%, #260509 100%);border-bottom:1.5px solid rgba(212, 175, 55, 0.45);box-shadow:0 4px 20px rgba(197, 131, 26, 0.18), 0 8px 25px rgba(36, 6, 11, 0.6);overflow:visible">
    <div class="dv-m-row" style="display:flex;align-items:center;justify-content:space-between;background-color:transparent;border-bottom:none">
      <button type="button" data-nav-open-menu style="border:1px solid rgba(212, 175, 55, 0.45);background-color:rgba(212, 175, 55, 0.12);border-radius: 50%;width:36px;height:36px;cursor:pointer;padding:0.3rem;display:flex;align-items:center;justify-content:center;color:#fde8b8"><x-icon name="menu" size="20" stroke="2.2" color="#fcd34d" /></button>

      <a href="/" style="display:flex;align-items:center;text-decoration:none"><img class="dv-m-logo" src="{{ $navLogo }}" alt="{{ $navBrand }}" style="width:auto;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(252, 211, 77, 0.25))"></a>

      <div style="display:flex;align-items:center;gap:0.65rem">
        <div style="position:relative" data-nav-notif-wrap>
          <button type="button" class="dv-m-btn" data-nav-notif-toggle style="{{ $iconBtn }};position:relative" title="Notifications" aria-label="Notifications">
            <x-icon name="bell" size="18" color="#fde8b8" />
            <span data-nav-unread style="{{ $badge }};display:none;top:-2px;right:-2px;background-color:#ef4444;color:#ffffff;font-size:0.62rem;border:2px solid #ffffff"></span>
          </button>
          <div data-nav-notif-popover data-mobile hidden></div>
        </div>

        <div style="position:relative" data-nav-user-wrap>
          <button type="button" class="dv-m-btn" data-nav-user-toggle style="{{ $iconBtn }}" title="Account Menu"><x-icon name="user" size="18" color="#fde8b8" /></button>
          <div data-nav-user-menu hidden style="position:absolute;top:calc(100% + 10px);right:-40px;width:260px;background-color:#ffffff;border-radius:18px;box-shadow:0 20px 45px rgba(0, 0, 0, 0.25);border:1px solid rgba(0, 0, 0, 0.08);z-index:999999;overflow:hidden;padding:0.65rem"></div>
        </div>

        <button type="button" class="dv-m-btn" data-nav-open-cart style="{{ $iconBtn }};position:relative">
          <x-icon name="shopping-bag" size="18" color="#fde8b8" />
          <span data-nav-cart-count style="{{ $badge }};display:none;top:-2px;right:-2px;background-color:#991b1b;color:#fef3c7;font-size:0.62rem;border:1.5px solid #fcd34d"></span>
        </button>
      </div>
    </div>

    <div style="padding:0.4rem 1rem 0.65rem 1rem;background-color:transparent;position:relative;overflow:visible" data-nav-search-wrap>
      <form action="/products" data-nav-search-form style="position:relative;width:100%">
        <input type="text" data-nav-search-input placeholder="Search for |" autocomplete="off" style="width:100%;height:40px;border-radius:10px;background-color:#fdfbf7;border:1.5px solid rgba(197, 131, 26, 0.55);padding:0 2.5rem 0 2.8rem;font-size:0.86rem;font-weight:600;color:#2a0508;outline:none;box-sizing:border-box;box-shadow:0 3px 12px rgba(0, 0, 0, 0.15), inset 0 1px 3px rgba(197, 131, 26, 0.08);font-family:&quot;Plus Jakarta Sans&quot;, sans-serif">
        <x-icon name="search" size="17" color="#c5831a" style="position:absolute;left:1.8rem;top:50%;transform:translateY(-50%)" />
      </form>
      <div data-nav-search-results data-mobile hidden style="position:absolute;top:100%;left:1rem;right:1rem;margin-top:0.4rem;background-color:#ffffff;border-radius:14px;box-shadow:0 15px 35px rgba(0,0,0,0.25);border:1px solid #cbd5e1;z-index:99999;overflow:hidden"></div>
    </div>
  </div>

  {{-- Desktop --}}
  <div class="dv-nav-d dv-d-bar" style="height:74px;width:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 2rem;border-radius:0px;border-bottom:1.5px solid rgba(212, 175, 55, 0.45);transition:background 0.35s ease, backdrop-filter 0.35s ease, box-shadow 0.35s ease;overflow:visible">
    <div style="width:100%;max-width:1560px;display:flex;align-items:center;justify-content:space-between;gap:1.5rem">
      <div style="display:flex;align-items:center;gap:1.25rem;flex-shrink:0">
        <a href="/" style="display:flex;align-items:center;text-decoration:none"><img src="{{ $navLogo }}" alt="{{ $navBrand }}" style="height:42px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(252, 211, 77, 0.3))"></a>
        <nav style="display:flex;align-items:center;gap:1.25rem">
          <a href="/products" class="dv-d-link" style="font-size:0.86rem;font-weight:700;text-decoration:none;transition:all 0.3s ease;font-family:&quot;Plus Jakarta Sans&quot;, sans-serif;letter-spacing:0.3px;display:inline-flex;align-items:center;gap:0.35rem"><span style="color:#fcd34d;font-size:0.75rem">✧</span> Products</a>
        </nav>
      </div>

      <div style="flex:1;display:flex;justify-content:center;max-width:580px;margin:0 2rem;position:relative" data-nav-search-wrap>
        <form action="/products" data-nav-search-form style="position:relative;width:100%">
          <input type="text" class="search-bar-input dv-search-d" data-nav-search-input placeholder="Search for |" autocomplete="off" style="width:100%;height:42px;border-radius:100px;padding:0 2.8rem 0 1.35rem;font-size:0.84rem;font-weight:600;outline:none;transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);font-family:&quot;Plus Jakarta Sans&quot;, sans-serif">
          <x-icon name="search" size="16" color="#fcd34d" style="position:absolute;right:1.2rem;top:50%;transform:translateY(-50%);opacity:0.95" />
        </form>
        <div data-nav-search-results hidden style="position:absolute;top:120%;left:50%;width:max(100%, 380px);min-width:360px;background-color:#ffffff;border:1px solid rgba(0, 0, 0, 0.08);border-radius:20px;box-shadow:0 20px 45px rgba(0, 0, 0, 0.16);z-index:99999;max-height:420px;overflow:hidden;flex-direction:column"></div>
      </div>

      <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0">
        <a href="/products" class="premium-header-btn" style="display:inline-flex;align-items:center;gap:0.65rem;background:linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%);background-size:200% auto;border:1.5px solid rgba(254, 243, 199, 0.85);padding:0.42rem 0.45rem 0.42rem 1.25rem;border-radius:6px;font-size:0.82rem;font-weight:800;color:#2a0508;text-decoration:none;transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);margin-left:0.25rem;box-shadow:0 4px 16px rgba(197, 131, 26, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6);font-family:&quot;Plus Jakarta Sans&quot;, sans-serif;letter-spacing:0.3px">
          <span style="display:inline-flex;align-items:center;gap:0.35rem"><span style="font-size:0.85rem">🪔</span> Shop Now</span>
          <span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius: 50%;background-color:#2a0508;color:#fcd34d;transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);box-shadow:0 2px 6px rgba(0,0,0,0.25)"><x-icon name="arrow-right" size="13" stroke="2.5" class="arrow-icon-flow" style="transform:rotate(-45deg)" /></span>
        </a>

        <button type="button" class="dv-d-btn" data-nav-open-cart style="{{ $deskBtn }};margin-left:0.4rem" title="Cart" aria-label="Cart">
          <x-icon name="shopping-cart" size="16" stroke="2.3" />
          <span data-nav-cart-count style="{{ $badge }};display:none;top:-4px;right:-4px;background-color:#991b1b;color:#fef3c7;font-size:0.65rem;box-shadow:0 2px 6px rgba(0, 0, 0, 0.4);border:1.5px solid #fcd34d"></span>
        </button>

        <div style="position:relative" data-nav-notif-wrap>
          <button type="button" class="dv-d-btn" data-nav-notif-toggle style="{{ $deskBtn }};margin-left:0.3rem" title="Notifications" aria-label="Notifications">
            <x-icon name="bell" size="16" stroke="2.3" />
            <span data-nav-unread style="{{ $badge }};display:none;top:-4px;right:-4px;background-color:#ef4444;color:#ffffff;font-size:0.62rem;box-shadow:0 2px 6px rgba(239, 68, 68, 0.5);border:1.5px solid #ffffff"></span>
          </button>
          <div data-nav-notif-popover hidden></div>
        </div>

        <div style="position:relative" data-nav-user-wrap>
          <button type="button" class="dv-d-btn" data-nav-user-toggle style="{{ $deskBtn }};margin-left:0.3rem" title="Account Menu"><x-icon name="user" size="16" stroke="2.3" /></button>
          <div data-nav-user-menu data-desktop hidden style="position:absolute;top:calc(100% + 12px);right:0;width:270px;background-color:#ffffff;border-radius:18px;box-shadow:0 20px 45px rgba(0, 0, 0, 0.2);border:1px solid rgba(0, 0, 0, 0.08);z-index:999999;overflow:hidden;padding:0.65rem"></div>
        </div>

        <button type="button" class="dv-d-btn" data-nav-open-menu style="height:38px;box-sizing:border-box;cursor:pointer;padding:0 0.95rem;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:0.45rem;font-size:0.82rem;font-weight:700;font-family:&quot;Plus Jakarta Sans&quot;, sans-serif;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(0, 0, 0, 0.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);margin-left:0.3rem;flex-shrink:0;outline:none" title="Open Navigation Menu" aria-label="Open Navigation Menu">
          <x-icon name="menu" size="16" stroke="2.3" color="#fcd34d" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  </div>

  <div style="width:100%;height:8px;line-height:0;overflow:hidden;background:#260509;border-bottom:1px solid rgba(197, 131, 26, 0.45)">
    <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:8px">
      <defs>
        <pattern id="hdrLotus" x="0" y="0" width="32" height="8" patternUnits="userSpaceOnUse">
          <path d="M16 1 Q8 5 0 1 Q8 8 16 5.5 Q24 8 32 1 Q24 5 16 1Z" fill="rgba(212,175,55,0.75)" />
          <circle cx="16" cy="5" r="1.1" fill="rgba(252,211,77,0.95)" />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill="url(#hdrLotus)" />
    </svg>
  </div>
</header>

@unless ($isProductPage)
  <div style="width:100%;background-color:#EDE8D0;border-bottom:1px solid rgba(210, 200, 175, 0.6);border-top:1px solid rgba(210, 200, 175, 0.6);position:relative;z-index:900;overflow:visible">
    @if ($navCategories)
      <div class="hide-nav-scrollbar dv-cats" style="display:flex;align-items:center;overflow-x:auto;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;-ms-overflow-style:none;scrollbar-width:none;background:#EDE8D0;max-width:1440px;margin:0 auto">
        @foreach ($navCategories as $cat)
          <a href="/products?category={{ rawurlencode($cat['name']) }}" class="dv-cat" style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;cursor:pointer;transition:transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);text-decoration:none">
            <div class="dv-cat-img" style="border-radius: 50%;overflow:hidden;border:2.5px solid #ffffff;box-shadow:0 4px 14px rgba(54, 9, 16, 0.2);background-color:#ffffff;display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease, box-shadow 0.2s ease">
              <img src="{{ $cat['image'] ?: $placeholderImg }}" alt="{{ $cat['name'] }}" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null;this.src={{ json_encode($placeholderImg) }}">
            </div>
            <span class="dv-cat-name" style="font-weight:700;color:#1e293b;margin-top:0.45rem;text-align:center;width:100%;white-space:normal;word-break:normal;overflow-wrap:break-word;line-height:1.2;min-height:2.4em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-transform:capitalize;font-family:'Plus Jakarta Sans', 'Inter', sans-serif;letter-spacing:-0.2px">{{ trim($cat['name']) }}</span>
          </a>
        @endforeach
      </div>
    @endif
  </div>
@endunless

{{-- Side menu --}}
<div data-nav-drawer hidden>
  <div data-nav-drawer-backdrop style="position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(15, 23, 42, 0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:10000"></div>
  <div data-nav-drawer-panel style="position:fixed;top:0;left:0;bottom:0;width:320px;max-width:85vw;background-color:#ffffff;box-shadow:20px 0 60px rgba(0, 0, 0, 0.18);display:flex;flex-direction:column;z-index:10001;box-sizing:border-box;overflow-y:auto;transform:translateX(-100%)">
    <div class="newsletter-animated-bg" style="padding:1.25rem 1.25rem 1.25rem 1.25rem;display:flex;align-items:center;justify-content:space-between;color:#ffffff;position:relative">
      <div style="display:flex;align-items:center;gap:0.85rem">
        <div style="width:44px;height:44px;border-radius: 50%;background-color:#1e293b;border:2px solid rgba(255, 255, 255, 0.2);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0">
          <x-icon name="user" size="22" color="#ffffff" />
          <span style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius: 50%;background-color:#360910;border:2px solid #0f172a"></span>
        </div>
        <div>
          <div style="font-size:0.95rem;font-weight:700;color:#ffffff">Hi, <span data-nav-drawer-name>Guest</span></div>
          <button type="button" data-nav-drawer-account style="background:none;border:none;padding:0;color:#eab308;font-size:0.8rem;font-weight:700;cursor:pointer;text-align:left">Log in</button>
        </div>
      </div>
      <button type="button" data-nav-close-menu style="border:none;background:rgba(255, 255, 255, 0.1);width:32px;height:32px;border-radius: 50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ffffff;transition:all 0.2s"><x-icon name="x" size="18" /></button>
    </div>

    <div style="flex:1;padding:0.5rem 0">
      @foreach ([['/products', 'award', '#b45309', 'Best Sellers'], ['/products', 'zap', '#d97706', 'New Launches'], ['/login', 'user', '#d97706', 'My Account'], [null, 'message-square', '#d97706', 'Chat with us'], ['/contact', 'store', '#d97706', 'Careers'], ['/about', 'shield-check', '#d97706', 'About us']] as [$href, $icon, $color, $label])
        <a @if ($href) href="{{ $href }}" @else href="#" data-nav-open-chat @endif @if ($label === 'My Account') data-nav-account-link @endif style="{{ $drawerRow }}">
          <div style="display:flex;align-items:center;gap:0.9rem">
            <div style="{{ $drawerIcon }}"><x-icon :name="$icon" size="18" :color="$color" /></div>
            <span style="font-size:0.92rem;font-weight:600;color:#1e293b">{{ $label }}</span>
          </div>
          <x-icon name="chevron-right" size="16" color="#94a3b8" />
        </a>
      @endforeach

      <a href="/admin/dashboard" data-nav-dashboard-link hidden style="margin:1rem 1.25rem 0.5rem 1.25rem;padding:0.85rem 1rem;border-radius:14px;background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#ffffff;align-items:center;justify-content:space-between;cursor:pointer;text-decoration:none">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <x-icon name="shield" size="18" color="#eab308" />
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#ffffff" data-nav-dashboard-label>Admin Dashboard</div>
            <div style="font-size:0.68rem;color:#94a3b8">Manage Products &amp; Orders</div>
          </div>
        </div>
        <x-icon name="chevron-right" size="16" color="#eab308" />
      </a>
    </div>

    <div style="padding:1rem;text-align:center;border-top:1px solid #f1f5f9;opacity:0.4;font-size:0.68rem;color:#64748b;letter-spacing:1px">DAIVIKA — CRAFTED WITH ELEGANCE</div>
  </div>
</div>

{{-- Push notification prompt --}}
<div data-nav-push-modal hidden style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:1.5rem;background-color:rgba(0, 0, 0, 0.45);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
  <div data-nav-push-card style="width:100%;max-width:420px;background:linear-gradient(180deg, #fffdf8 0%, #faf3e2 100%);border:1.5px solid rgba(212, 175, 55, 0.55);border-radius:24px;padding:2.5rem 2.25rem;box-shadow:0 25px 65px rgba(40, 6, 11, 0.35), 0 0 30px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9);color:#2a0508;font-family:&quot;Poppins&quot;, sans-serif;text-align:center;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%);box-shadow:0 1px 4px rgba(252, 211, 77, 0.4)"></div>
    <span style="position:absolute;top:12px;left:14px;color:rgba(197, 131, 26, 0.45);font-size:0.8rem;pointer-events:none">✦</span>
    <span style="position:absolute;top:12px;right:14px;color:rgba(197, 131, 26, 0.45);font-size:0.8rem;pointer-events:none">✦</span>
    <div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:240px;height:240px;background:radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(61, 11, 16, 0) 70%);pointer-events:none;z-index:0"></div>
    <div style="position:relative;display:inline-flex;margin-bottom:1.4rem;z-index:1">
      <div style="width:68px;height:68px;border-radius: 50%;background:radial-gradient(circle, #3d0b10 0%, #1f0407 100%);border:1.5px solid rgba(212, 175, 55, 0.55);display:flex;align-items:center;justify-content:center;color:#fcd34d;position:relative;box-shadow:0 4px 18px rgba(197, 131, 26, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)"><x-icon name="bell" size="28" color="#fcd34d" class="animate-wiggle" /></div>
      <span style="position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius: 50%;background-color:#c5831a;border:2px solid #fffdf8;box-shadow:0 0 8px rgba(252, 211, 77, 0.8)"></span>
    </div>
    <div style="position:relative;z-index:1;margin-bottom:1.75rem">
      <h3 style="margin:0 0 0.6rem 0;font-size:1.3rem;font-weight:800;letter-spacing:-0.2px;color:#2a0508;font-family:&quot;Poppins&quot;, sans-serif">Receive Sacred Updates</h3>
      <p style="margin:0;font-size:0.85rem;line-height:1.6;color:#78350f;font-weight:400">Never miss an auspicious update. Receive instant notifications about your energized orders, shipment dispatch, and divine collection alerts.</p>
      <div style="margin-top:0.8rem;display:flex;align-items:center;justify-content:center;gap:0.4rem">
        <span style="width:28px;height:1px;background:linear-gradient(to right, transparent, rgba(197, 131, 26, 0.4))"></span>
        <span style="color:#c5831a;font-size:0.7rem">✦ ॐ ✦</span>
        <span style="width:28px;height:1px;background:linear-gradient(to left, transparent, rgba(197, 131, 26, 0.4))"></span>
      </div>
    </div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:0.75rem">
      <button type="button" data-nav-push-allow class="dv-modal-allow" style="width:100%;padding:0.85rem;border-radius:999px;background:linear-gradient(135deg, #2b060b 0%, #3d0b10 50%, #200407 100%);border:1px solid rgba(212, 175, 55, 0.45);font-size:0.88rem;font-weight:800;cursor:pointer;transition:all 0.25s ease;outline:none;display:flex;align-items:center;justify-content:center;gap:0.5rem">
        <x-icon name="bell" size="15" color="#fcd34d" />
        <span>Enable Sacred Alerts</span>
        <span style="font-size:0.7rem;color:#c5831a">✦</span>
      </button>
      <button type="button" data-nav-push-later class="dv-modal-later" style="width:100%;padding:0.75rem;border-radius:999px;border:1px solid rgba(212, 175, 55, 0.35);font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.2s ease;outline:none">Maybe Later</button>
    </div>
  </div>
</div>

{{-- WhatsApp assistant (opened from "Chat with us") --}}
<div class="wa-chat-window" data-wa-window hidden>
  <div class="wa-chat-header">
    <div class="wa-chat-header-profile">
      <div class="wa-chat-avatar-wrapper">
        <div class="wa-chat-avatar">
          <svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block">
            <circle cx="50" cy="50" r="48" fill="#f0fdf4" /><path d="M25 80c0-10 8-15 25-15s25 5 25 15v5H25v-5z" fill="#0f172a" /><rect x="43" y="58" width="14" height="10" fill="#64748b" /><rect x="30" y="26" width="40" height="32" rx="12" fill="#334155" /><rect x="35" y="32" width="30" height="20" rx="6" fill="#0f172a" /><circle cx="44" cy="42" r="3" fill="#25d366" /><circle cx="56" cy="42" r="3" fill="#25d366" /><path d="M47 47c1.5 2 4.5 2 6 0" stroke="#25d366" stroke-width="1.5" stroke-linecap="round" fill="none" /><rect x="48.5" y="16" width="3" height="10" fill="#64748b" /><circle cx="50" cy="14" r="4.5" fill="#25d366" /><rect x="25" y="36" width="5" height="12" rx="2" fill="#64748b" /><rect x="70" y="36" width="5" height="12" rx="2" fill="#64748b" />
          </svg>
        </div>
        <span class="wa-chat-avatar-status"></span>
      </div>
      <div class="wa-chat-info">
        <span class="wa-chat-name">Daivika Assistant</span>
        <span class="wa-chat-status"><span class="wa-chat-status-dot"></span>Active / Online</span>
      </div>
    </div>
    <button type="button" class="wa-chat-close-btn" data-wa-close aria-label="Close Chat"><x-icon name="x" size="16" /></button>
  </div>
  <div class="wa-chat-body" data-wa-body></div>
  <div class="wa-chat-footer">
    <form class="wa-input-form" data-wa-form>
      <input type="text" class="wa-input" data-wa-input placeholder="Type a custom message...">
      <button type="submit" class="wa-send-btn" data-wa-send disabled style="background-color:#e2e8f0;cursor:default" aria-label="Send message"><x-icon name="send" size="13" /></button>
    </form>
  </div>
</div>

{{-- Floating bottom bar on phones and tablets --}}
@unless ($isCheckout)
  <div class="dv-bottom-nav" data-nav-bottom style="position:fixed;bottom:16px;left:0;right:0;margin-left:auto;margin-right:auto;width:calc(100% - 32px);max-width:420px;z-index:99999;box-sizing:border-box">
    <div style="display:flex;align-items:center;justify-content:center;padding:6px 8px;border-radius:100px;background-color:rgba(54, 9, 16, 0.92);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1.5px solid rgba(255, 255, 255, 0.22);box-shadow:0 12px 35px rgba(54, 9, 16, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.3);position:relative;overflow:hidden">
      @foreach ([['home', 'Home', 'house', $path === '/'], ['shop', 'Shop', 'store', str_starts_with($path, '/products')], ['cart', 'Cart', 'shopping-cart', $path === '/cart'], ['profile', 'Profile', 'user', str_starts_with($path, '/profile') || $path === '/login']] as [$id, $label, $icon, $active])
        <button type="button" data-nav-bottom-item="{{ $id }}" data-active="{{ $active ? 'true' : 'false' }}" style="width:72px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 0;border-radius:100px;border:none;background-color:transparent;color:{{ $active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)' }};cursor:pointer;outline:none;z-index:2;transition:color 0.2s ease;gap:2px">
          <div data-nav-bottom-pill @unless ($active) hidden @endunless style="position:absolute;inset:0;border-radius:100px;background:linear-gradient(135deg, #360910 0%, #54111c 100%);box-shadow:0 4px 15px rgba(0, 0, 0, 0.25);z-index:-1"></div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center">
            <x-icon :name="$icon === 'house' ? 'home' : $icon" size="20" :stroke="$active ? 2.5 : 2" :color="$active ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'" />
            @if ($id === 'cart')
              <span data-nav-cart-count data-bottom style="position:absolute;top:-5px;right:-8px;background-color:#ef4444;color:#ffffff;font-size:0.62rem;font-weight:900;border-radius:100px;min-width:16px;height:16px;padding:0 4px;display:none;align-items:center;justify-content:center;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></span>
            @endif
          </div>
          <span style="font-size:0.72rem;font-weight:{{ $active ? 800 : 600 }};font-family:'Plus Jakarta Sans', sans-serif;letter-spacing:-0.1px;line-height:1">{{ $label }}</span>
        </button>
      @endforeach
    </div>
  </div>
@endunless

@php
    $jsIcons = [];
    foreach (['user', 'heart', 'log-out', 'log-in', 'shield', 'bell', 'check-check', 'sparkles', 'tag', 'package', 'chevron-right'] as $n) {
        $jsIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, @json($jsIcons));</script>
