<div class="subpage-header-wrapper" style="width:100%;box-sizing:border-box;background-color:transparent">
  <div class="subpage-hero" style="position:relative;width:100%;overflow:hidden;background-color:#0a0a0a;background-image:linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 100%);font-family:&quot;Poppins&quot;, sans-serif;border:1px solid rgba(189, 155, 59, 0.18);box-shadow:0 15px 35px rgba(6, 61, 51, 0.12);box-sizing:border-box">
    <div style="position:absolute;bottom:0;left:0;width:100%;height:100%;opacity:0.04;pointer-events:none;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M10 20c5 0 8 3 8 8s-3 8-8 8-8-3-8-8 3-8 8-8zm40 60c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zm30-40c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7zm-40-10c0-6 5-11 11-11s11 5 11 11-5 11-11 11-11-5-11-11zm80 40c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E&quot;);background-repeat:repeat"></div>
    <div class="subpage-hero-inner" style="position:absolute;inset:4px;border:1px solid rgba(255, 255, 255, 0.05);pointer-events:none"></div>
    <div style="position:absolute;top:0;bottom:0;left:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 1.5rem;z-index:2;box-sizing:border-box">
      @if (! empty($subtitle))
        <div class="subpage-hero-sub" style="font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#0a0a0a;margin-bottom:0.2rem">{{ $subtitle }}</div>
      @endif
      <h1 class="subpage-hero-title" style="font-weight:800;color:#ffffff;margin:0;letter-spacing:-0.5px;line-height:1.2">{{ $title }}</h1>
    </div>
  </div>
</div>
