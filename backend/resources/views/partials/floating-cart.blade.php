{{-- Floating "Sacred Order" bar (components/FloatingCart.jsx); shown by public/js/floating-cart.js --}}
<div data-fc-wrap class="dv-fc-wrap" hidden style="position:fixed;left:0;right:0;display:flex;justify-content:center;z-index:9998;pointer-events:none;transition:bottom 0.3s ease">
  <div data-fc class="dv-fc" style="pointer-events:auto;display:flex;align-items:center;background:linear-gradient(135deg, rgba(54, 9, 16, 0.96) 0%, rgba(36, 5, 10, 0.98) 100%);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#ffffff;border-radius:100px;border:1px solid rgba(212, 175, 55, 0.4);max-width:100%;width:auto">
    <div data-fc-open class="dv-fc-left" title="Open Cart Drawer" style="display:flex;align-items:center;cursor:pointer;user-select:none">
      <div data-fc-icon style="position:relative;display:flex;align-items:center">
        <x-icon name="shopping-cart" size="22" color="#facc15" class="dv-fc-cart-icon" />
        <div data-fc-count class="dv-fc-badge" style="position:absolute;top:-6px;right:-8px;background-color:#facc15;color:#360910;border-radius: 50%;display:flex;align-items:center;justify-content:center;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:1.5px solid #360910"></div>
      </div>
      <div class="dv-fc-div" style="width:1px;background-color:rgba(212, 175, 55, 0.3)"></div>
      <div class="dv-fc-total" style="display:flex;flex-direction:column">
        <span class="dv-fc-label" style="font-weight:600;color:#facc15;text-transform:uppercase;letter-spacing:0.5px">Sacred Order</span>
        <span data-fc-total class="dv-fc-amount" style="font-weight:800;color:#ffffff;letter-spacing:-0.3px"></span>
      </div>
    </div>
    <div data-fc-checkout class="dv-fc-btn" title="Proceed to Checkout" style="border-radius:100px;display:flex;align-items:center;font-weight:800;position:relative;overflow:hidden;cursor:pointer;background:linear-gradient(135deg, #c5a059 0%, #e0c27b 100%);color:#2a050c;box-shadow:0 3px 12px rgba(197, 160, 89, 0.4);user-select:none">
      <div data-fc-shimmer style="position:absolute;top:0;width:50%;height:100%;background:linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);transform:skewX(-25deg);pointer-events:none"></div>
      <span>Checkout</span>
      <div data-fc-arrow style="display:flex;align-items:center"><x-icon name="arrow-right" size="16" stroke="3" class="dv-fc-arrow" /></div>
    </div>
  </div>
</div>
