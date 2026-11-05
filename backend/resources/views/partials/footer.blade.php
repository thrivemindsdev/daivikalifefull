@php
    $socials = [
        ['name' => 'Instagram', 'icon' => 'fa-instagram', 'size' => 18, 'href' => 'https://www.instagram.com/daivikalife/'],
        ['name' => 'Facebook', 'icon' => 'fa-facebook-f', 'size' => 16, 'href' => 'https://www.facebook.com/profile.php?id=61595688804323'],
        ['name' => 'WhatsApp', 'icon' => 'fa-whatsapp', 'size' => 18, 'href' => 'https://wa.me/917510821228'],
    ];
    $columns = [
        'Shop Now' => array_map(fn ($name) => ['label' => mb_strtoupper(mb_substr($name, 0, 1)).mb_substr($name, 1), 'to' => '/products?category='.rawurlencode($name)], $footerCategories),
        'Support' => [
            ['label' => 'About DAIVIKA', 'to' => '/about'],
            ['label' => 'Contact Us', 'to' => '/contact'],
            ['label' => 'Help & FAQs', 'to' => '/faq'],
            ['label' => 'Shipping Policy', 'to' => '/shipping-policy'],
            ['label' => 'Returns & Exchanges', 'to' => '/returns-exchanges'],
        ],
        'Legal' => [
            ['label' => 'Privacy Policy', 'to' => '/privacy-policy'],
            ['label' => 'Terms of Service', 'to' => '/terms-of-service'],
            ['label' => 'Refund Policy', 'to' => '/refund-policy'],
        ],
    ];
    $badge = 'background-color:rgba(212, 175, 55, 0.08);border:1px solid rgba(212, 175, 55, 0.35);border-radius:6px;height:22px;display:flex;align-items:center';
@endphp
<footer class="footer-root newsletter-animated-bg" style="color:#ffffff;background:linear-gradient(180deg, #28060b 0%, #1a0306 45%, #100204 100%);padding-top:0;padding-bottom:2.5rem;position:relative;font-family:&quot;Poppins&quot;, sans-serif;box-sizing:border-box">
  <div style="width:100%;background:linear-gradient(180deg, rgba(61, 11, 16, 0.95) 0%, rgba(40, 6, 11, 0.98) 100%);border-top:2px solid rgba(212, 175, 55, 0.55);border-bottom:1px solid rgba(212, 175, 55, 0.25);box-shadow:0 2px 10px rgba(0, 0, 0, 0.35);line-height:0">
    <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <defs>
        <pattern id="footerLotusPattern" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse">
          <path d="M20 13 Q10 7 0 13 Q10 1 20 4 Q30 1 40 13 Q30 7 20 13Z" fill="rgba(212,175,55,0.55)" />
          <circle cx="20" cy="5" r="2" fill="rgba(252,211,77,0.75)" />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill="url(#footerLotusPattern)" />
    </svg>
  </div>

  <div class="container" style="max-width:1560px;margin:0 auto;box-sizing:border-box;padding-top:4rem">
    <div class="dv-footer-grid" style="display:grid;gap:clamp(2rem, 3.5vw, 4rem);padding-bottom:3rem;border-bottom:1px solid rgba(212, 175, 55, 0.2);width:100%;box-sizing:border-box">
      <div style="display:flex;flex-direction:column;gap:1.1rem;max-width:440px">
        <a href="/" style="text-decoration:none;display:inline-block">
          <img src="{{ $footerLogo }}" alt="{{ $footerBrand }} Logo" style="height:46px;width:auto;object-fit:contain;display:block;filter:drop-shadow(0 2px 10px rgba(252, 211, 77, 0.32))">
        </a>
        <p style="font-size:0.92rem;color:rgba(253, 244, 220, 0.82);line-height:1.7;margin:0;font-weight:400">A little touch of divinity, woven into the essence of everyday life. Inspired by the eternal wisdom of sacred traditions, we bring the grace of the divine closer to you, celebrating the beauty of faith, the warmth of devotion, and the timeless presence of the sacred in life’s every moment.</p>
        <div class="dv-footer-socials" style="display:flex;gap:0.75rem;margin-top:0.4rem">
          @foreach ($socials as $social)
            <a href="{{ $social['href'] }}" class="dv-footer-social" aria-label="Follow DAIVIKA on {{ $social['name'] }}" target="_blank" rel="noopener noreferrer" style="width:40px;height:40px;border-radius: 50%;display:flex;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);text-decoration:none">
              <i class="fa-brands {{ $social['icon'] }}" style="font-size:{{ $social['size'] }}px"></i>
            </a>
          @endforeach
        </div>
      </div>

      @foreach ($columns as $title => $links)
        <div>
          <h4 class="dv-footer-heading" style="font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:1.8px;color:#fde68a;margin-bottom:1.4rem;margin-top:0;display:flex;align-items:center;gap:0.4rem">
            <span style="color:#c5831a;font-size:0.75rem">✦</span>
            {{ $title }}
          </h4>
          <ul style="list-style:none;padding:0;margin:0">
            @foreach ($links as $link)
              <li style="margin-bottom:0.85rem">
                <a href="{{ $link['to'] }}" class="dv-footer-link" style="font-size:0.9rem;text-decoration:none;transition:all 0.25s ease;display:inline-flex;align-items:center">{{ $link['label'] }}</a>
              </li>
            @endforeach
          </ul>
        </div>
      @endforeach
    </div>

    <div style="padding-top:1.5rem;border-top:1px solid rgba(212, 175, 55, 0.16);display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1.5rem;font-size:0.85rem;color:rgba(253, 244, 220, 0.75)">
      <div style="font-size:0.78rem;color:rgba(253, 244, 220, 0.75);letter-spacing:0.6px;font-weight:500">
        &copy; 2026 Daivika | Powered by <a href="https://www.zodimithra.com" target="_blank" rel="noopener noreferrer" style="color:#fcd34d;font-weight:700;text-decoration:none">ZodiMithra</a>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
        <span style="font-size:0.78rem;color:#fde68a;font-weight:700;margin-right:0.25rem">Secure Payments:</span>
        <div style="padding:0.25rem 0.6rem;{{ $badge }};gap:0.35rem">
          <span style="font-size:0.65rem;font-weight:800;color:#fde68a;letter-spacing:0.5px">Razorpay</span>
          <div style="width:6px;height:6px;border-radius: 50%;background-color:#0284c7"></div>
        </div>
        <div style="padding:0.25rem 0.5rem;{{ $badge }};justify-content:center">
          <span style="font-size:0.65rem;font-weight:800;color:#fde68a;letter-spacing:0.5px;font-style:italic">UPI</span>
        </div>
        <div style="padding:0.25rem 0.5rem;{{ $badge }};justify-content:center">
          <span style="font-size:0.65rem;font-weight:900;color:#1a1f71;background-color:#ffffff;padding:0px 4px;border-radius:3px">VISA</span>
        </div>
        <div style="padding:0.25rem 0.5rem;{{ $badge }};gap:2px">
          <div style="width:8px;height:8px;border-radius: 50%;background-color:#eb001b"></div>
          <div style="width:8px;height:8px;border-radius: 50%;background-color:#ff5f00;margin-left:-4px"></div>
          <span style="font-size:0.6rem;color:#fde68a;font-weight:700">mc</span>
        </div>
        <div style="padding:0.25rem 0.5rem;{{ $badge }};justify-content:center">
          <span style="font-size:0.62rem;font-weight:800;color:#fde68a;letter-spacing:0.5px">RuPay</span>
        </div>
      </div>
    </div>
  </div>
</footer>
