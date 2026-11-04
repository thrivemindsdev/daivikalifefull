// Checkout page (app/(store)/checkout/page.jsx): contact and shipping details, saved addresses, coupon,
// shipping zones, free-gift countdown, Razorpay payment (full or COD advance), Cashfree return check,
// success screen with invoice. Prices are checked again by the server when the order is created.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const G = window.DaivikaGeo;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const root = document.querySelector('[data-checkout]');
  const modalHost = document.querySelector('[data-checkout-modal]');
  const svg = (name, size, { color = 'currentColor', style = '', cls = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}${cls ? ' ' + cls : ''}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const inr = (n) => Number(n || 0).toLocaleString('en-IN');
  const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const INDIAN_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

  // Bulk prices per product / group and variant (same as the cart)
  function reprice(items, groups = []) {
    const groupOf = {};
    groups.forEach((g) => {
      const members = Array.isArray(g.products) ? g.products : g.productIds;
      if (Array.isArray(members)) members.forEach((p) => { const id = typeof p === 'object' ? (p._id || p.id) : p; if (id) groupOf[String(id)] = g; });
    });
    const keyOf = (item) => {
      const id = String(item.id || item._id || '');
      const v = item.selectedVariant ? String(item.selectedVariant.name || '').trim().toLowerCase() : '';
      const g = groupOf[id];
      return g ? `group_${g._id}_${v}` : `prod_${id}_${v}`;
    };
    const qty = {};
    items.forEach((i) => { if (!i.isFreeGift) qty[keyOf(i)] = (qty[keyOf(i)] || 0) + i.quantity; });
    return items.map((item) => {
      if (item.isFreeGift) return { ...item, price: 0 };
      const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
      let price = originalPrice;
      const total = qty[keyOf(item)] || 0;
      const src = item.selectedVariant || item;
      const min = Number(src.bulkMinQty), bulk = Number(src.bulkPrice);
      if (min > 0 && bulk > 0 && total >= min) price = bulk;
      return { ...item, originalPrice, price };
    });
  }

  // "Buy now" on a product page hands its items over here (React passed them as router state)
  let direct = null;
  try { const st = JSON.parse(sessionStorage.getItem('daivika_checkout_state') || 'null'); if (st && Array.isArray(st.checkoutItems)) direct = st.checkoutItems; } catch (e) {}
  sessionStorage.removeItem('daivika_checkout_state');

  const nameParts = (n) => String(n || '').trim().split(/\s+/);
  const userMobile = (u) => String((u && u.phone) || '').replace(/\D/g, '').slice(-10);
  const s = {
    items: reprice(direct || D.cart.items, []), groups: [],
    success: false, placedId: '', pendingCashfree: !!new URLSearchParams(location.search).get('order_id'),
    firstName: '', lastName: '', email: '', phone: '', phoneError: '', street: '', city: '', state: '', district: '', pincode: '',
    pin: { status: 'idle', message: '' }, autoCity: '',
    payment: 'Razorpay', checking: false, stockModal: null, alert: null,
    saved: [], savedId: '', addrOpen: false, saveToProfile: false, addrLabel: 'Home', customLabel: '',
    coupons: read('vaugun_coupons', null) || [
      { code: 'Daivika10', discountType: 'percentage', discountValue: 10, minPurchase: 500, usageLimit: 1 },
      { code: 'KERALA500', discountType: 'fixed', discountValue: 500, minPurchase: 2000, usageLimit: 2 },
      { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20, minPurchase: 1000, usageLimit: 3 },
    ],
    couponsEnabled: (() => { const v = localStorage.getItem('vaugun_coupons_enabled'); return v !== null ? JSON.parse(v) : true; })(),
    couponUsage: read('vaugun_coupon_usage', {}), applied: null, couponInput: '', couponError: '', couponSuccess: '', couponOpen: false,
    zones: (() => {
      const saved = read('vaugun_shipping_zones', null);
      if (saved && !saved.some((z) => z.states.some((st) => st.includes('United Arab Emirates') || st.includes('Saudi Arabia'))) && saved.length >= 3) return saved;
      return [
        { id: 'zone_1', name: 'South India Logistics', rate: 75, states: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Lakshadweep'], rules: [] },
        { id: 'zone_2', name: 'North India Express', rate: 150, states: ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Himachal Pradesh', 'Jammu and Kashmir', 'Uttarakhand', 'Ladakh', 'Chandigarh'], rules: [] },
        { id: 'zone_3', name: 'Middle India Cargo', rate: 120, states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Goa', 'Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Manipur', 'Nagaland', 'Tripura', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu'], rules: [] },
      ];
    })(),
    threshold: (() => { const v = localStorage.getItem('vaugun_free_shipping_threshold'); return v ? parseInt(v, 10) : 600; })(),
    logo: (() => { try { const p = JSON.parse(localStorage.getItem('vaugun_site_settings') || localStorage.getItem('vaugun_invoice_settings') || 'null'); if (p && (p.companyLogo || p.logo)) return p.companyLogo || p.logo; } catch (e) {} return '/logo.png?v=daivika_v3'; })(),
    cod: read('vaugun_cod_settings', null) || { enabled: true, advancePercent: 30 },
    gift: { enabled: true, timerMinutes: 10, giftProductId: 'prod_daivika_anti_fog_spray_001', minimumSpend: 0, eligibleProductIds: [], title: 'FREE GIFT UNLOCKED!', subtitle: 'Complete your checkout before the timer ends to receive your exclusive gift for FREE!', badgeText: 'LIMITED TIME FREE GIFT', ...(read('daivika_free_gift_settings', null) || read('vaugun_free_gift_settings', null) || {}) },
    giftProduct: null, timeLeft: 0, timerActive: false, timerExpired: false,
  };
  if (s.payment === 'Cash on Delivery' && s.cod.enabled === false) s.payment = 'Razorpay';

  /* ─── Totals ─── */
  const subtotal = () => s.items.reduce((n, i) => n + i.price * i.quantity, 0);
  const couponDiscount = () => {
    if (!s.couponsEnabled || !s.applied) return 0;
    const t = subtotal();
    return s.applied.discountType === 'percentage' ? Math.round((t * s.applied.discountValue) / 100) : Math.min(t, s.applied.discountValue);
  };
  function shipping() {
    if (!s.state) return 0;
    if (subtotal() >= s.threshold) return 0;
    const zone = s.zones.find((z) => z.states.some((st) => st.toLowerCase() === s.state.toLowerCase()));
    if (!zone) return 100;
    const base = Number(zone.rate) || 0;
    const rules = zone.rules || [];
    if (!s.items.length) return base;
    let extra = 0;
    s.items.forEach((item) => {
      const col = String(item.gender || '').toLowerCase().trim(), cat = String(item.category || '').toLowerCase().trim();
      const lc = (v) => String(v || '').toLowerCase().trim();
      const rule = rules.find((r) => lc(r.collection) === col && lc(r.category) === cat) || rules.find((r) => lc(r.collection) === 'all' && lc(r.category) === cat)
        || rules.find((r) => lc(r.collection) === col && lc(r.category) === 'all') || rules.find((r) => lc(r.collection) === 'all' && lc(r.category) === 'all');
      if (rule) extra += (Number(rule.rate) || 0) * (item.quantity || 1);
    });
    return base + extra;
  }
  const finalTotal = () => Math.max(0, subtotal() - couponDiscount()) + shipping();
  const advance = () => s.cod.advancePercent ?? 30;

  /* ─── Free gift ─── */
  function giftEligible() {
    const g = s.gift, gp = s.giftProduct;
    return Boolean(g && g.enabled && s.items.length > 0 && gp && subtotal() >= (Number(g.minimumSpend) || 0)
      && (!g.eligibleProductIds || g.eligibleProductIds.length === 0 || s.items.some((i) => g.eligibleProductIds.includes(String(i.id || i._id || ''))))
      && (!gp.inventory || gp.inventory.length === 0 || gp.inventory.some((inv) => (inv.stock || 0) > 0) || (gp.stock !== undefined && gp.stock > 0)));
  }
  let giftFor = null;
  function loadGift() {
    const id = s.gift && s.gift.giftProductId;
    if (!id || !s.gift.enabled) { s.giftProduct = null; return; }
    if (D.cart.latestProducts[id]) { s.giftProduct = D.cart.latestProducts[id]; return; }
    if (giftFor === id) return;
    giftFor = id;
    fetch(`/api/products/${id}?t=${Date.now()}`).then((r) => r.json()).then((json) => { if (json.success && json.data) { s.giftProduct = json.data; timer(); render(); } }).catch((e) => console.warn('Could not load gift product:', e));
  }
  let tick = null, timerFor = null;
  function timer() {
    const eligible = giftEligible();
    const key = `${eligible}|${s.gift.timerMinutes}`;
    if (key === timerFor) return;
    timerFor = key;
    clearInterval(tick);
    if (!eligible) { s.timerActive = false; return; }
    const seconds = Math.max(1, (Number(s.gift.timerMinutes) || 10) * 60);
    let expiry = parseInt(sessionStorage.getItem('daivika_gift_timer_expiry'), 10);
    if (!expiry || isNaN(expiry)) { expiry = Date.now() + seconds * 1000; sessionStorage.setItem('daivika_gift_timer_expiry', String(expiry)); }
    const update = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      const was = [s.timerActive, s.timeLeft <= 120];
      s.timeLeft = diff; s.timerActive = diff > 0; s.timerExpired = diff <= 0;
      if (was[0] !== s.timerActive || was[1] !== (s.timeLeft <= 120)) render(); else digits();
    };
    update();
    tick = setInterval(update, 1000);
  }
  const fmt = (t) => ({ minutes: String(Math.floor(t / 60)).padStart(2, '0'), seconds: String(t % 60).padStart(2, '0') });
  function digits() {
    const d = fmt(s.timeLeft);
    root.querySelectorAll('[data-timer]').forEach((el) => { el.textContent = el.dataset.timer === 'short' ? `${d.minutes}:${d.seconds}` : `${d.minutes} : ${d.seconds}`; });
  }

  /* ─── Markup ─── */
  const LABEL = 'display:block;font-size:0.78rem;font-weight:600;color:#4b5563;margin-bottom:0.4rem';
  const INPUT = 'width:100%;padding:0.65rem 0.85rem;border-radius:6px;border:1px solid #d1d5db;background-color:#fff;color:#111827;outline:none;font-size:0.9rem';
  const field = (label, attrs, key) => `<div><label style="${LABEL}">${label}</label><input ${attrs} data-f="${key}" value="${esc(s[key])}" class="dv-co-input" style="${INPUT}"></div>`;

  function giftBanner() {
    const g = s.gift, gp = s.giftProduct;
    if (!(g && g.enabled && gp)) return '';
    let inner = '';
    if (giftEligible() && s.timerActive) {
      const soon = s.timeLeft <= 120, d = fmt(s.timeLeft);
      inner = `<div data-gift-key="active" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #10b981;border-radius:14px;padding:1.1rem 1.25rem;box-shadow:0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);display:flex;align-items:center;justify-content:space-between;gap:1.25rem;flex-wrap:wrap;position:relative">
        <div style="display:flex;align-items:center;gap:1rem;flex:1;min-width:260px"><div style="position:relative;width:58px;height:58px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;background-color:#f8fafc;flex-shrink:0"><img src="${esc((gp.images && gp.images[0]) || gp.image || '/logo.png')}" alt="${esc(gp.name)}" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null;this.src='/logo.png'"><div style="position:absolute;bottom:0;left:0;right:0;background-color:#10b981;color:#ffffff;font-size:0.58rem;font-weight:800;text-align:center;padding:1px 0;letter-spacing:0.5px">FREE</div></div>
          <div><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.2rem;flex-wrap:wrap"><span style="background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:100px;letter-spacing:0.3px;display:inline-flex;align-items:center;gap:0.25rem">${svg('gift', 11)} ${esc(g.badgeText || 'FREE GIFT')}</span><span style="font-size:0.74rem;color:#64748b">Worth <span style="text-decoration:line-through;color:#94a3b8">₹${esc(gp.price || gp.mrp || 499)}</span> • <span style="color:#059669;font-weight:700">100% Free</span></span></div><h3 style="font-size:0.98rem;font-weight:700;margin:0 0 0.15rem 0;color:#0f172a;letter-spacing:-0.2px">${esc(g.title || 'Free Gift Unlocked!')}</h3><p style="font-size:0.78rem;color:#64748b;margin:0;line-height:1.4">${esc(gp.name)} will be added to your order for free if completed before the timer ends.</p></div></div>
        <div style="display:inline-flex;align-items:center;gap:0.65rem;background-color:${soon ? '#fef2f2' : '#f8fafc'};border:1px solid ${soon ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:0.5rem 0.85rem;flex-shrink:0"><div style="width:8px;height:8px;border-radius: 50%;background-color:${soon ? '#ef4444' : '#10b981'};box-shadow:${soon ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : '0 0 0 3px rgba(16, 185, 129, 0.15)'};flex-shrink:0"></div><div style="display:flex;flex-direction:column"><span style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${soon ? '#dc2626' : '#64748b'};line-height:1">${soon ? 'Ending soon' : 'Offer expires in'}</span><span data-timer="long" style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:1.08rem;font-weight:800;line-height:1.2;color:${soon ? '#dc2626' : '#0f172a'};letter-spacing:0.5px">${d.minutes} : ${d.seconds}</span></div></div>
      </div>`;
    } else if (s.timerExpired) {
      inner = `<div data-gift-key="expired" style="background-color:#fef2f2;border:1px solid #fee2e2;border-radius:12px;padding:0.85rem 1.1rem;display:flex;align-items:center;gap:0.75rem;color:#991b1b">${svg('alert-triangle', 17, { color: '#dc2626', style: 'flex-shrink:0' })}<div style="font-size:0.82rem;line-height:1.4"><strong style="font-weight:700">Offer Expired:</strong> The free gift countdown timer for this checkout session has ended. Your order will proceed with standard cart items.</div></div>`;
    } else if (!giftEligible() && g.minimumSpend > 0 && subtotal() < g.minimumSpend) {
      inner = `<div data-gift-key="spend" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #360910;border-radius:12px;padding:0.85rem 1.1rem;display:flex;align-items:center;gap:0.75rem;color:#1e293b">${svg('gift', 17, { color: '#360910', style: 'flex-shrink:0' })}<div style="font-size:0.82rem;line-height:1.4"><strong>Special Offer:</strong> Add <strong>₹${inr(g.minimumSpend - subtotal())}</strong> more to your cart to instantly unlock a <strong>FREE ${esc(gp.name)}</strong>!</div></div>`;
    }
    return `<div style="margin-bottom:1.75rem">${inner}</div>`;
  }

  function savedPicker() {
    const u = D.auth.user;
    if (!(u && s.saved.length)) return '';
    const sel = s.savedId && s.savedId !== 'new' ? s.saved.find((a) => a.id === s.savedId) : null;
    const current = s.savedId && s.savedId !== 'new'
      ? (sel ? `<span style="font-weight:700;font-size:0.85rem;color:#0c4a6e;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sel.label)} — ${esc(sel.firstName)} ${esc(sel.lastName)}</span><span style="font-size:0.72rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${esc(sel.street)}, ${esc(sel.city)}, ${esc(sel.state)} ${esc(sel.pincode)}</span>` : '<span style="color:#94a3b8;font-size:0.85rem">Select a saved address...</span>')
      : `<span style="font-size:0.85rem;color:${s.savedId === 'new' ? '#374151' : '#94a3b8'};font-weight:${s.savedId === 'new' ? 700 : 400}">${s.savedId === 'new' ? 'Entering new address manually' : 'Select a saved address...'}</span>`;
    const menu = s.addrOpen ? `<div data-act="addr-close" style="position:fixed;inset:0;z-index:9990"></div><div data-addr-menu style="position:absolute;top:100%;left:0;right:0;margin-top:6px;background-color:#fff;border:1px solid #e0f2fe;border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,0.12);z-index:9991;overflow:hidden">${s.saved.map((a) => `<div data-saved="${esc(a.id)}" class="dv-co-addr-opt${s.savedId === a.id ? ' dv-on' : ''}" style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.85rem 1rem;cursor:pointer;background-color:${s.savedId === a.id ? '#f0f9ff' : '#fff'};border-bottom:1px solid #f0f9ff;transition:background 0.1s"><div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;background-color:${a.isDefault ? '#fef3c7' : '#f1f5f9'};display:flex;align-items:center;justify-content:center">${svg('map-pin', 15, { color: a.isDefault ? '#d97706' : '#64748b' })}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem"><span style="font-weight:800;font-size:0.83rem;color:#1e293b">${esc(a.label)}</span>${a.isDefault ? '<span style="font-size:0.65rem;background-color:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;font-weight:700;border:1px solid #fde68a">Default</span>' : ''}</div><div style="font-size:0.78rem;color:#374151;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.firstName)} ${esc(a.lastName)}</div><div style="font-size:0.72rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} — ${esc(a.pincode)}</div></div>${s.savedId === a.id ? svg('check-circle-2', 16, { color: '#0ea5e9', style: 'flex-shrink:0;margin-top:2px' }) : ''}</div>`).join('')}<div data-saved="new" class="dv-co-addr-opt${s.savedId === 'new' ? ' dv-on' : ''}" style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem 1rem;cursor:pointer;background-color:${s.savedId === 'new' ? '#f0fdf4' : '#fff'};border-top:1px solid #f1f5f9;transition:background 0.1s"><div style="width:32px;height:32px;border-radius:8px;background-color:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0">${svg('plus', 15, { color: '#64748b' })}</div><span style="font-size:0.83rem;font-weight:700;color:#374151">Enter a new address</span>${s.savedId === 'new' ? svg('check-circle-2', 16, { color: '#360910', style: 'margin-left:auto' }) : ''}</div></div>` : '';
    return `<div style="background-color:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:1rem 1.1rem;margin-bottom:0.25rem"><div style="font-size:0.75rem;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.4rem">${svg('map-pin', 13)} Use a Saved Address</div><div style="position:relative"><div data-act="addr-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0.9rem;background-color:#fff;border:1.5px solid ${s.addrOpen ? '#0369a1' : '#bae6fd'};border-radius:10px;cursor:pointer;user-select:none;box-shadow:0 1px 4px rgba(0,0,0,0.05)"><div style="display:flex;align-items:center;gap:0.75rem;overflow:hidden">${svg('map-pin', 15, { color: '#0ea5e9', style: 'flex-shrink:0' })}<div style="overflow:hidden">${current}</div></div>${svg('chevron-down', 15, { color: '#0369a1', style: `transform:${s.addrOpen ? 'rotate(180deg)' : 'none'};transition:transform 0.15s;flex-shrink:0` })}</div>${menu}</div></div>`;
  }

  function saveOption() {
    const u = D.auth.user;
    if (!(u && (s.savedId === 'new' || s.saved.length === 0))) return '';
    return `<div style="margin-top:1.25rem;padding:1rem;background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:0.75rem"><label style="display:flex;align-items:center;gap:0.6rem;cursor:pointer;user-select:none"><input type="checkbox" data-act="save-toggle"${s.saveToProfile ? ' checked' : ''} style="width:16px;height:16px;accent-color:#0a0a0a;cursor:pointer"><span style="font-size:0.83rem;font-weight:600;color:#374151">Save this address to my profile for future orders</span></label>${s.saveToProfile ? `<div style="display:flex;flex-direction:column;gap:0.6rem;padding-left:1.6rem"><div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap"><span style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Address Label:</span>${['Home', 'Work', 'Other'].map((l) => `<button type="button" data-addr-label="${l}" style="padding:0.3rem 0.8rem;font-size:0.75rem;font-weight:600;border-radius:20px;border:1px solid ${s.addrLabel === l ? '#0a0a0a' : '#cbd5e1'};background-color:${s.addrLabel === l ? '#0a0a0a' : '#ffffff'};color:${s.addrLabel === l ? '#ffffff' : '#475569'};cursor:pointer;transition:all 0.15s ease">${l}</button>`).join('')}</div>${s.addrLabel === 'Other' ? `<div style="display:flex;flex-direction:column;gap:0.25rem;margin-top:0.25rem;max-width:240px"><input type="text" placeholder="Enter custom label (e.g. Friends, Parents)" data-f="customLabel" value="${esc(s.customLabel)}" class="dv-co-input" style="padding:0.45rem 0.65rem;border-radius:6px;border:1px solid #cbd5e1;font-size:0.8rem;color:#111827;background-color:#ffffff;outline:none;width:100%;box-sizing:border-box;transition:border-color 0.15s"></div>` : ''}</div>` : ''}</div>`;
  }

  function payOption(id, title, sub, badge, badgeColors) {
    const on = s.payment === id;
    return `<div data-pay="${id}" style="padding:1rem;border:${on ? '1.5px solid #0a0a0a' : '1.5px solid #e5e7eb'};background-color:${on ? '#fdfbf9' : '#ffffff'};border-radius:10px;display:flex;align-items:flex-start;justify-content:space-between;cursor:pointer;transition:all 0.15s;gap:0.5rem;flex-wrap:wrap"><div style="display:flex;align-items:flex-start;gap:0.75rem;flex:1;min-width:0"><div style="width:16px;height:16px;border-radius: 50%;border:2px solid ${on ? '#0a0a0a' : '#d1d5db'};background-color:#ffffff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${on ? '<div style="width:8px;height:8px;border-radius: 50%;background-color:#0a0a0a"></div>' : ''}</div><div style="min-width:0"><div style="font-size:0.875rem;font-weight:700;color:#111827;word-break:break-word;line-height:1.35">${title}</div>${sub}</div></div><div style="display:flex;align-items:center;gap:0.25rem;flex-shrink:0"><span style="font-size:0.62rem;font-weight:800;background-color:${badgeColors[0]};color:${badgeColors[1]};padding:0.2rem 0.5rem;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px">${badge}</span></div></div>`;
  }

  function formColumn() {
    const a = advance();
    return `<form data-form style="display:flex;flex-direction:column;gap:1.75rem">
      <div class="checkout-card"><h3 style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;color:#111827">${svg('mail', 18, { color: '#0a0a0a' })} Contact Coordinates</h3><div style="display:flex;flex-direction:column;gap:1rem">
        <div><label style="${LABEL}">Phone Number (Required for Delivery alerts)</label><input type="tel" required maxlength="10" placeholder="10-digit mobile number (e.g. 9876543210)" data-f="phone" value="${esc(s.phone)}" class="dv-co-input${s.phoneError ? ' dv-err' : ''}" style="width:100%;padding:0.65rem 0.85rem;border-radius:6px;border:${s.phoneError ? '1.5px solid #ef4444' : '1px solid #d1d5db'};background-color:#fff;color:#111827;outline:none;font-size:0.9rem">${s.phoneError ? `<span style="font-size:0.75rem;color:#ef4444;font-weight:600;margin-top:0.35rem;display:flex;align-items:center;gap:0.3rem">${svg('alert-triangle', 13)} ${esc(s.phoneError)}</span>` : ''}</div>
        ${field('Email Address (Optional)', 'type="email" placeholder="e.g. name@domain.com"', 'email')}
      </div></div>
      <div class="checkout-card"><h3 style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;color:#111827">${svg('map-pin', 18, { color: '#0a0a0a' })} Shipping Destination</h3><div style="display:flex;flex-direction:column;gap:1rem">
        ${savedPicker()}
        <div class="responsive-grid-2" style="gap:1rem">${field('First Name', 'type="text" required placeholder="First name"', 'firstName')}${field('Last Name', 'type="text" required placeholder="Last name"', 'lastName')}</div>
        ${field('Street Address', 'type="text" required placeholder="Flat/House number, building name, street..."', 'street')}
        <div class="responsive-grid-2" style="gap:1rem;margin-bottom:1rem"><div><label style="${LABEL}">PIN Code</label><input type="text" required placeholder="682030" inputmode="numeric" maxlength="6" data-f="pincode" value="${esc(s.pincode)}" class="dv-co-input" style="${INPUT}">${s.pin.message ? `<div style="display:flex;align-items:center;gap:0.35rem;margin-top:0.35rem;font-size:0.75rem;color:${s.pin.status === 'error' ? '#dc2626' : '#6b7280'}">${s.pin.status === 'loading' ? svg('loader-2', 12, { cls: 'animate-spin' }) : ''}${esc(s.pin.message)}</div>` : ''}</div>${field('City', 'type="text" required placeholder="Kochi"', 'city')}</div>
        <div class="responsive-grid-2" style="gap:1rem"><div><label style="${LABEL}">State</label><div data-select="state"></div></div><div><label style="${LABEL}">District</label><div data-select="district"></div></div></div>
        ${saveOption()}
      </div></div>
      <div class="checkout-card"><h3 style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;color:#111827">${svg('credit-card', 18, { color: '#0a0a0a' })} Payment Method</h3><div style="display:flex;flex-direction:column;gap:0.75rem">
        ${payOption('Razorpay', 'Full Online Payment (UPI / Card / NetBanking)', '<div style="font-size:0.75rem;color:#6b7280;margin-top:0.2rem">Pay 100% online for instant order confirmation</div>', '100% ONLINE', ['#fce7eb', '#360910'])}
        ${s.cod && s.cod.enabled !== false ? payOption('Cash on Delivery', `Cash on Delivery (${a}% Advance Deposit Online)`, `<div style="font-size:0.75rem;color:#4b5563;margin-top:0.2rem;line-height:1.4">Pay ${a}% advance (₹${inr(Math.round(finalTotal() * (a / 100)))}) online, and remaining ${100 - a}% in cash upon delivery.</div>`, `${a}% ADVANCE`, ['#fef3c7', '#92400e']) : ''}
      </div></div>
      <p class="dv-co-policy" style="font-size:0.78rem;color:#4b5563;line-height:1.4;text-align:center;margin:0.5rem 0 0 0">All items are final sale. Read our <a href="/refund-policy" style="color:#0a0a0a;text-decoration:underline;font-weight:600;transition:color 0.15s">Refund Policy</a> &amp; <a href="/returns-exchanges" style="color:#0a0a0a;text-decoration:underline;font-weight:600;transition:color 0.15s">Return Policy</a>.</p>
      <button type="submit"${s.checking ? ' disabled' : ''} class="dv-co-pay" style="background-color:${s.checking ? '#6b7280' : '#0a0a0a'};color:#ffffff;border:none;border-radius:100px;width:100%;height:56px;font-size:1.05rem;font-weight:700;cursor:${s.checking ? 'not-allowed' : 'pointer'};display:flex;align-items:center;justify-content:center;gap:0.5rem;box-shadow:0 10px 15px -3px rgba(10, 10, 10, 0.2);transition:all 0.15s"><span>${s.checking ? 'Checking inventory...' : `Pay &amp; Place Order • ₹${inr(finalTotal())}`}</span>${svg('chevron-right', 18)}</button>
    </form>`;
  }

  function summaryColumn() {
    const sub = subtotal(), free = sub >= s.threshold, ship = shipping();
    const items = s.items.map((item) => {
      const key = item.cartId || item.id || item._id;
      if (item.isFreeGift) {
        return `<div style="display:flex;flex-direction:column;gap:0.5rem;padding:0.65rem 0.75rem;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:0.5rem"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;min-width:0"><div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0"><div style="position:relative;width:44px;height:44px;flex-shrink:0"><img src="${esc(D.optimizedImage(item.image || '/logo.png', 100))}" alt="${esc(item.name)}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;border:1px solid #bbf7d0" onerror="this.onerror=null;this.src='/logo.png'"><div style="position:absolute;bottom:-3px;right:-3px;background-color:#10b981;color:#fff;border-radius: 50%;width:15px;height:15px;display:flex;align-items:center;justify-content:center;font-size:9px">🎁</div></div><div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap"><span style="background-color:#10b981;color:#ffffff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:3px;letter-spacing:0.3px">FREE GIFT</span><span style="font-size:0.82rem;font-weight:700;color:#065f46;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.name.replace(/\(Free Gift.*?\)/i, '').trim())}</span></div><div style="font-size:0.68rem;color:#047857;margin-top:0.15rem">Unlocked with: ${esc(item.parentProductName || 'Selected Product')}</div></div></div><div style="display:flex;align-items:center;gap:0.4rem"><span style="font-size:0.72rem;color:#94a3b8;text-decoration:line-through">₹${inr(item.originalPrice || 399)}</span><span style="font-size:0.82rem;font-weight:800;color:#059669">FREE</span></div></div></div>`;
      }
      const opts = item.selectedColor || item.selectedTexture || item.selectedVariant
        ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.2rem;flex-wrap:wrap">${item.selectedColor ? `<div title="Color: ${esc(item.selectedColor.name)}" style="width:12px;height:12px;border-radius: 50%;background-color:${esc(item.selectedColor.code || '#cccccc')};border:1px solid rgba(0, 0, 0, 0.15);flex-shrink:0"></div>` : ''}${item.selectedTexture ? `<div title="Texture: ${esc(item.selectedTexture.name)}" style="width:12px;height:12px;border-radius: 50%;background-image:url(${esc(item.selectedTexture.image)});background-size:cover;background-position:center;border:1px solid rgba(0, 0, 0, 0.15);flex-shrink:0"></div>` : ''}${item.selectedVariant ? `<span style="font-size:0.65rem;font-weight:700;color:#4b5563;background-color:#f3f4f6;padding:0.05rem 0.35rem;border-radius:4px;border:1px solid #e5e7eb;line-height:1">${esc(item.selectedVariant.name)}</span>` : ''}${item.selectedColor || item.selectedTexture ? `<span style="font-size:0.68rem;color:#6b7280;font-weight:500">${esc(item.selectedColor ? item.selectedColor.name : item.selectedTexture.name)}</span>` : ''}</div>` : '';
      return `<div style="display:flex;flex-direction:column;gap:0.6rem;border-bottom:1px solid #f3f4f6;padding-bottom:0.75rem"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;min-width:0"><div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0"><img src="${esc(D.optimizedImage(item.image || '/logo.png', 100))}" alt="${esc(item.name)}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0" onerror="this.onerror=null;this.src='/logo.png'"><div style="min-width:0;flex:1"><div style="font-size:0.85rem;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.name.split(' (')[0])}</div>${opts}<span style="font-size:0.72rem;color:#6b7280;display:block;margin-top:0.15rem">₹${inr(item.price)} each</span></div></div><div style="display:flex;align-items:center;gap:0.5rem"><div style="font-size:0.85rem;font-weight:700;color:#111827">₹${inr(item.quantity * item.price)}</div><button type="button" data-remove="${esc(key)}" class="dv-co-trash" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;border-radius: 50%" title="Remove item from order">${svg('trash-2', 13)}</button></div></div><div style="display:flex;align-items:center;justify-content:space-between;padding-left:3.5rem"><div class="qty-control"><button type="button" class="qty-btn" data-qty="-1" data-key="${esc(key)}">${svg('minus', 12)}</button><span class="qty-value">${esc(item.quantity)}</span><button type="button" class="qty-btn" data-qty="1" data-key="${esc(key)}">${svg('plus', 12)}</button></div></div></div>`;
    }).join('');
    const gp = s.giftProduct, d = fmt(s.timeLeft);
    const giftRow = giftEligible() && s.timerActive && gp ? `<div style="display:flex;flex-direction:column;gap:0.6rem;padding:0.75rem;background-color:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-top:0.5rem;margin-bottom:0.5rem"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;min-width:0"><div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0"><div style="position:relative;width:44px;height:44px;flex-shrink:0"><img src="${esc((gp.images && gp.images[0]) || gp.image || '/logo.png')}" alt="${esc(gp.name)}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;border:1px solid #bbf7d0" onerror="this.onerror=null;this.src='/logo.png'"><div style="position:absolute;bottom:-4px;right:-4px;background-color:#10b981;color:#fff;border-radius: 50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center">${svg('sparkles', 9)}</div></div><div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap"><span style="background-color:#10b981;color:#ffffff;font-size:0.62rem;font-weight:800;padding:1px 6px;border-radius:4px;letter-spacing:0.3px">FREE GIFT</span><span style="font-size:0.82rem;font-weight:700;color:#065f46;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(gp.name)}</span></div><div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.2rem;flex-wrap:wrap"><span style="font-size:0.72rem;color:#94a3b8;text-decoration:line-through">₹${inr(gp.price || gp.mrp || 499)}</span><span style="font-size:0.72rem;color:#059669;font-weight:700">₹0 (Qty: 1)</span><span style="font-size:0.65rem;background-color:#dcfce7;color:#065f46;padding:1px 6px;border-radius:100px;font-weight:700;display:inline-flex;align-items:center;gap:0.25rem">${svg('clock', 10)} <span data-timer="short">${d.minutes}:${d.seconds}</span> left</span></div></div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:0.85rem;font-weight:800;color:#059669">FREE</div><div style="font-size:0.65rem;color:#64748b;font-weight:600">Special Offer</div></div></div></div>` : '';
    const total = finalTotal();
    let coupon = '';
    if (s.couponsEnabled) {
      const showForm = s.couponOpen || s.applied;
      const body = !showForm
        ? `<div data-coupon="row" style="display:flex;align-items:center;justify-content:space-between;width:100%"><span style="font-size:0.85rem;font-weight:600;color:#4b5563">Do you have a coupon?</span><button type="button" data-act="coupon-open" class="dv-co-link" style="background:none;border:none;padding:0;font-size:0.85rem;font-weight:800;color:#0a0a0a;text-decoration:underline;cursor:pointer;transition:color 0.2s ease">Apply Coupon</button></div>`
        : `<div data-coupon="form" style="overflow:hidden">${!s.applied ? `<div style="display:flex;flex-direction:column;gap:0.5rem"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem"><label style="display:block;font-size:0.75rem;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.05em">Apply Promo Coupon</label><button type="button" data-act="coupon-cancel" style="background:none;border:none;padding:0;font-size:0.72rem;font-weight:600;color:#6b7280;cursor:pointer;text-decoration:underline">Cancel</button></div><div style="display:flex;gap:0.5rem"><input type="text" placeholder="Enter Code (e.g. Daivika10)" data-f="couponInput" value="${esc(s.couponInput)}" style="flex:1;min-width:0;padding:0.55rem 0.75rem;border-radius:6px;border:1px solid #d1d5db;font-size:0.8rem;outline:none;color:#111827;background-color:#ffffff;box-sizing:border-box"><button type="button" data-act="coupon-apply" class="dv-co-apply" style="background-color:#0a0a0a;color:#fff;border:none;border-radius:6px;padding:0 1.25rem;font-size:0.8rem;font-weight:600;cursor:pointer;transition:background-color 0.1s;flex-shrink:0">Apply</button></div></div>`
          : `<div style="display:flex;align-items:center;justify-content:space-between;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:0.5rem 0.75rem"><div style="display:flex;align-items:center;gap:0.4rem;color:#065f46;font-size:0.8rem;font-weight:600">${svg('tag', 13)}<span>${esc(s.applied.code)} Applied!</span></div><button type="button" data-act="coupon-remove" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:0.75rem;font-weight:700">Remove</button></div>`}${s.couponError ? `<div style="color:#dc2626;font-size:0.72rem;margin-top:0.4rem;font-weight:500;line-height:1.4">${esc(s.couponError)}</div>` : ''}${s.couponSuccess ? `<div style="color:#360910;font-size:0.72rem;margin-top:0.4rem;font-weight:500;line-height:1.4">${esc(s.couponSuccess)}</div>` : ''}</div>`;
      coupon = `<div style="border-top:1px solid #e5e7eb;margin-top:1.25rem;padding-top:1.25rem">${body}</div>`;
    }
    return `<div class="checkout-card"><h3 style="font-size:1rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;margin-bottom:1.25rem;color:#111827">${svg('shopping-bag', 18, { color: '#0a0a0a' })} Order Summary</h3>
        <div style="background-color:${free ? '#f0fdf4' : '#f8fafc'};border:1px solid ${free ? '#bbf7d0' : '#e2e8f0'};border-radius:12px;padding:0.85rem 1rem;margin-bottom:1.25rem;display:flex;flex-direction:column;gap:0.5rem;transition:all 0.2s ease-in-out"><div style="display:flex;align-items:center;gap:0.5rem">${free ? svg('check-circle-2', 15, { color: '#059669', style: 'flex-shrink:0' }) : svg('truck', 15, { color: '#0f172a', style: 'flex-shrink:0' })}<span style="font-size:0.8rem;font-weight:600;color:${free ? '#065f46' : '#334155'}">${free ? "<span>Congratulations! You've unlocked <strong>Free Standard Shipping</strong></span>" : `<span>Add <strong>₹${inr(s.threshold - sub)}</strong> more for <strong>Free Shipping</strong></span>`}</span></div><div style="width:100%;height:5px;background-color:${free ? '#dcfce7' : '#e2e8f0'};border-radius:100px;overflow:hidden"><div style="width:${Math.min(100, (sub / s.threshold) * 100)}%;height:100%;background-color:${free ? '#10b981' : '#0f172a'};border-radius:100px;transition:width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"></div></div><div style="display:flex;justify-content:space-between;font-size:0.68rem;color:#64748b;font-weight:500"><span>Subtotal: ₹${inr(sub)}</span><span>Free Shipping: ₹${inr(s.threshold)}</span></div></div>
        <div style="display:flex;flex-direction:column;gap:1rem;max-height:380px;overflow-y:auto;padding-right:0.25rem">${items}${giftRow}</div>
        <div style="margin-top:1.25rem;border-top:1px solid #e5e7eb;padding-top:1rem;display:flex;flex-direction:column;gap:0.6rem">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#4b5563"><span>Subtotal</span><span>₹${inr(sub)}</span></div>
          ${s.applied ? `<div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#059669;font-weight:600"><span style="display:flex;align-items:center;gap:0.25rem">${svg('tag', 13)} Coupon Discount (${esc(s.applied.code)})</span><span>-₹${inr(couponDiscount())}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#4b5563"><span>Shipping Handling ${s.state ? `(${esc(s.state)})` : ''}</span><span style="color:${s.state && ship > 0 ? '#111827' : '#059669'};font-weight:700">${!s.state && sub < s.threshold ? '<span style="color:#9ca3af;font-weight:500">Select state to calculate</span>' : ship > 0 ? `₹${inr(ship)}` : 'FREE'}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:800;color:#111827;border-top:1px dashed #e5e7eb;padding-top:0.75rem;margin-top:0.25rem"><span>Total Order Amount</span><span style="color:#0a0a0a;font-size:1.15rem">₹${inr(total)}</span></div>
          ${s.payment === 'Cash on Delivery' ? `<div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:0.75rem;margin-top:0.5rem;display:flex;flex-direction:column;gap:0.4rem"><div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;color:#92400e"><span>30% Advance (Pay Online Now via Razorpay)</span><span>₹${inr(Math.round(total * 0.3))}</span></div><div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:700;color:#78350f"><span>70% Balance (Payable on Delivery in Cash)</span><span>₹${inr(total - Math.round(total * 0.3))}</span></div></div>` : ''}
        </div>${coupon}</div>
      <div class="checkout-card" style="display:flex;gap:0.75rem;background-color:#fcfcfe">${svg('shield-check', 20, { color: '#360910', style: 'flex-shrink:0;margin-top:2px' })}<div style="flex:1;min-width:0"><div style="font-size:0.8rem;font-weight:700;color:#111827">100% Encrypted Transactions</div><p style="font-size:0.72rem;color:#6b7280;margin:0.2rem 0 0 0;line-height:1.4">We protect your credentials with 256-bit SSL network encryption. Powered securely by PCI-DSS compliant gateways.</p></div></div>`;
  }

  function successCard() {
    const order = read('vaugun_orders', []).find((o) => o._id === s.placedId);
    const cod = order && order.paymentMethod === 'Cash on Delivery';
    const a = advance();
    const hasGift = order && (order.itemsList || []).some((i) => i.isFreeGift || (i.price === 0 && ((i.name || '').toLowerCase().includes('gift') || String(i.productId || '').includes('gift'))));
    return `<div style="max-width:520px;margin:4rem auto 0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:3rem 2.5rem;text-align:center;box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.05)">
      <div style="width:64px;height:64px;border-radius: 50%;background-color:#fce7eb;display:flex;align-items:center;justify-content:center;color:#360910;margin:0 auto 1.5rem auto">${svg('check-circle-2', 36)}</div>
      <h2 style="font-size:1.5rem;font-weight:800;color:#111827;margin:0 0 0.5rem 0">${cod ? `${a}% Advance Received &amp; COD Order Confirmed!` : 'Payment Complete!'}</h2>
      <p style="font-size:0.875rem;color:#4b5563;line-height:1.6;margin:0 0 2rem 0">${cod ? `Congratulations! Your ${a}% advance deposit was received successfully. Your Cash on Delivery order has been placed, and the remaining ${100 - a}% balance is payable in cash upon delivery.` : 'Congratulations! Your payment has been received successfully. We are processing your delivery details.'}</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:1.15rem;background-color:#f9fafb;display:flex;align-items:center;gap:0.75rem;text-align:left;margin-bottom:1rem">${svg('package', 20, { color: '#0a0a0a' })}<div><div style="font-size:0.78rem;font-weight:700;color:#111827">Order Confirmed &amp; Processing</div></div></div>
      ${hasGift ? '<div style="border:1.5px solid #86efac;border-radius:12px;padding:1.15rem;background-color:#f0fdf4;display:flex;align-items:center;gap:0.85rem;text-align:left;margin-bottom:2rem;box-shadow:0 4px 12px rgba(22, 163, 74, 0.1)"><div style="width:40px;height:40px;border-radius: 50%;background-color:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.3rem">🎁</div><div><div style="font-size:0.85rem;font-weight:800;color:#166534;margin-bottom:0.15rem">Free Gift Claimed Successfully!</div><div style="font-size:0.75rem;color:#15803d;line-height:1.4">Congratulations! You completed your order before the countdown expired. Your complimentary gift is included in your parcel at ₹0!</div></div></div>' : ''}
      ${!D.auth.user ? `<div style="border:1px dashed #f59e0b;border-radius:12px;padding:1rem;background-color:#fffbeb;color:#b45309;text-align:left;font-size:0.8rem;line-height:1.5;margin-bottom:2rem;display:flex;gap:0.6rem;align-items:flex-start">${svg('alert-triangle', 16, { style: 'flex-shrink:0;margin-top:2px;color:#d97706' })}<div><strong style="font-weight:800">Important Notice:</strong> Clearing your browser history or site cache will prevent you from tracking this order as a guest. Please sign in or register an account using the same email address to link and track all your orders permanently.</div></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:0.75rem"><a href="/products" style="background-color:#0a0a0a;color:#ffffff;border:none;border-radius:100px;padding:0.85rem 1.5rem;font-size:0.9rem;font-weight:700;text-decoration:none;display:inline-block;box-shadow:0 10px 15px -3px rgba(10, 10, 10, 0.15);transition:all 0.15s">Continue Shopping</a><button data-act="invoice" class="dv-co-invoice" style="background-color:#ffffff;color:#0a0a0a;border:2px solid #0a0a0a;border-radius:100px;padding:0.85rem 1.5rem;font-size:0.9rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all 0.15s">${svg('download', 18)} Download Invoice</button></div>
    </div>`;
  }

  /* ─── Render ─── */
  let shell = false, view = null, viewEl = null, selects = {};
  function render() {
    if (!shell) {
      shell = true;
      root.innerHTML = `<div style="min-height:100vh;background-color:#f9fafb;padding:0 0 4rem 0;color:#111827;font-family:&quot;Poppins&quot;, sans-serif">
        <div style="background-color:#ffffff;border-bottom:1px solid #e2e8f0;padding:0.85rem 1.5rem;margin-bottom:2rem;box-shadow:0 2px 10px rgba(0,0,0,0.03);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100">
          <button type="button" data-act="back" class="dv-co-back" style="display:inline-flex;align-items:center;gap:0.45rem;color:#0f172a;text-decoration:none;font-size:0.82rem;font-weight:600;padding:0.4rem 0.85rem;border-radius:100px;background-color:#f8fafc;border:1px solid #e2e8f0;cursor:pointer;transition:all 0.15s ease;outline:none">${svg('arrow-left', 15)}<span>Back</span></button>
          <a href="/" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center"><img src="${esc(s.logo && !s.logo.includes('api/images') ? s.logo : '/logo.png?v=daivika_v3')}" alt="DAIVIKA" style="height:36px;max-height:40px;width:auto;object-fit:contain;display:block" onerror="this.onerror=null;this.src='/logo.png?v=daivika_v3'"></a>
          <div style="display:inline-flex;align-items:center;gap:0.35rem;color:#15803d;font-size:0.75rem;font-weight:600;background-color:#f0fdf4;padding:0.35rem 0.75rem;border-radius:100px;border:1px solid #bbf7d0">${svg('lock', 12)}<span>100% Secure</span></div>
        </div>
        <div class="checkout-container" data-view></div>
      </div>`;
    }
    const host = root.querySelector('[data-view]');
    const want = s.success ? 'success' : 'form';
    if (want !== view) {
      const old = viewEl;
      view = want;
      const enter = () => {
        viewEl = document.createElement('div');
        viewEl.style.opacity = '0';
        host.replaceChildren(viewEl);
        draw(true);
        if (want === 'form') { viewEl.style.transform = 'translateY(10px)'; animate(viewEl, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3 }).then(() => { viewEl.style.transform = ''; }); }
        else { const card = viewEl.firstElementChild; viewEl.style.opacity = '1'; card.style.opacity = '0'; animate(card, { scale: [0.95, 1], opacity: [0, 1] }, { type: 'spring', damping: 20, stiffness: 250 }); }
      };
      if (old) animate(old, { opacity: 0, y: -10 }, { duration: 0.3 }).then(enter); else enter();
      return;
    }
    draw(false);
  }
  let lastHtml = '', lastGiftKey = null, lastCouponKey = null;
  function draw(first) {
    if (!viewEl) return;
    if (view === 'success') { if (first) viewEl.innerHTML = successCard(); return; }
    const html = `<h1 style="font-size:1.75rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:1.5rem;color:#0f172a">Checkout</h1>${giftBanner()}<div class="responsive-grid-auto-fit checkout-grid-container" style="gap:3rem;align-items:start"><div>${formColumn()}</div><div style="display:flex;flex-direction:column;gap:1.5rem">${summaryColumn()}</div></div>`;
    if (html === lastHtml && !first) return;
    lastHtml = html;
    const a = document.activeElement;
    const focusKey = a && viewEl.contains(a) && a.dataset && a.dataset.f ? a.dataset.f : null;
    const caret = focusKey && a.type !== 'email' ? a.selectionStart : null;
    const scrollBox = viewEl.querySelector('[style*="max-height:380px"]');
    const scrollTop = scrollBox ? scrollBox.scrollTop : 0;
    viewEl.innerHTML = html;
    if (focusKey) { const el = viewEl.querySelector(`[data-f="${focusKey}"]`); if (el) { el.focus(); if (caret !== null) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    const sb = viewEl.querySelector('[style*="max-height:380px"]');
    if (sb) sb.scrollTop = scrollTop;
    // Searchable state / district menus
    selects.state = D.searchableSelect(viewEl.querySelector('[data-select="state"]'), { value: s.state, options: INDIAN_STATES, placeholder: 'Select State', searchPlaceholder: 'Search state...', emptyText: 'No matching states found', onChange: (st) => { if (st !== s.state) s.district = ''; s.state = st; render(); } });
    selects.district = D.searchableSelect(viewEl.querySelector('[data-select="district"]'), { value: s.district, options: G.getDistricts(s.state), placeholder: 'Select District', searchPlaceholder: 'Search district...', emptyText: 'No matching districts found', disabled: !s.state, disabledText: 'Select state first', onChange: (d) => { s.district = d; render(); } });
    // Entrances: gift banner states, coupon row / form, saved-address menu
    const gk = viewEl.querySelector('[data-gift-key]');
    const giftKey = gk ? gk.dataset.giftKey : null;
    if (gk && giftKey !== lastGiftKey && !first) animate(gk, { opacity: [0, 1], y: [-8, 0] }, { duration: giftKey === 'active' ? 0.25 : 0.3 });
    lastGiftKey = giftKey;
    const ck = viewEl.querySelector('[data-coupon]');
    const couponKey = ck ? ck.dataset.coupon : null;
    if (ck && lastCouponKey && couponKey !== lastCouponKey) { const h = ck.scrollHeight; ck.style.overflow = 'hidden'; animate(ck, { opacity: [0, 1], height: [0, h] }, couponKey === 'form' ? { duration: 0.35, ease: [0.16, 1, 0.3, 1] } : { duration: 0.25, ease: 'easeInOut' }).then(() => { ck.style.height = ''; if (couponKey === 'row') ck.style.overflow = ''; }); }
    lastCouponKey = couponKey;
    const am = viewEl.querySelector('[data-addr-menu]');
    if (am && !addrMenuShown) animate(am, { opacity: [0, 1], y: [6, 0] }, { duration: 0.15 });
    addrMenuShown = !!am;
  }
  let addrMenuShown = false;

  /* ─── Dialogs (alert and out-of-stock) ─── */
  function drawModal() {
    const old = modalHost.firstElementChild;
    if (old && !old._leaving) {
      old._leaving = true;
      animate(old.firstElementChild, { opacity: 0 }, { duration: 0.3 });
      animate(old.lastElementChild, { scale: 0.95, opacity: 0, y: 15 }, { duration: 0.25, ease: [0.16, 1, 0.3, 1] }).then(() => old.remove());
    }
    const m = s.alert || s.stockModal;
    if (!m) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1.5rem';
    const card = 'position:relative;background-color:#ffffff;border:1px solid rgba(10, 10, 10, 0.15);border-radius:16px;width:100%;box-shadow:0 25px 50px -12px rgba(10, 10, 10, 0.12), 0 10px 15px -3px rgba(0, 0, 0, 0.05);z-index:1;display:flex;flex-direction:column;gap:1.25rem';
    if (s.alert) {
      wrap.innerHTML = `<div data-act="alert-close" style="position:absolute;inset:0;background-color:rgba(15, 10, 30, 0.4);backdrop-filter:blur(4px)"></div><div style="${card};max-width:400px;padding:1.5rem"><div style="display:flex;gap:0.85rem;align-items:flex-start"><div style="background-color:#fdfbf9;border-radius:12px;padding:0.6rem;display:flex;align-items:center;justify-content:center;border:1px solid #fdf8f5;flex-shrink:0">${svg('alert-triangle', 20, { color: '#0a0a0a' })}</div><div style="display:flex;flex-direction:column;gap:0.2rem"><h4 style="font-size:1rem;font-weight:800;color:#111827;margin:0;font-family:'Poppins', sans-serif">${esc(s.alert.title)}</h4><p style="font-size:0.82rem;color:#4b5563;margin:0;line-height:1.45;font-weight:500">${esc(s.alert.message)}</p></div></div><div style="display:flex;justify-content:flex-end;gap:0.65rem;margin-top:0.2rem"><button data-act="alert-close" style="background-color:#0a0a0a;border:none;border-radius:8px;padding:0.55rem 1.75rem;font-size:0.78rem;font-weight:700;color:#ffffff;cursor:pointer;transition:all 0.15s ease;box-shadow:0 4px 10px rgba(10, 10, 10, 0.2)">OK</button></div></div>`;
    } else {
      wrap.innerHTML = `<div data-act="stock-close" style="position:absolute;inset:0;background-color:rgba(15, 10, 30, 0.4);backdrop-filter:blur(4px)"></div><div style="${card};max-width:460px;padding:1.75rem"><div style="display:flex;gap:0.85rem;align-items:flex-start"><div style="background-color:rgba(239, 68, 68, 0.08);border-radius:12px;padding:0.6rem;display:flex;align-items:center;justify-content:center;border:1px solid rgba(239, 68, 68, 0.15);flex-shrink:0">${svg('alert-triangle', 20, { color: '#ef4444' })}</div><div style="display:flex;flex-direction:column;gap:0.2rem;width:100%"><h4 style="font-size:1.05rem;font-weight:800;color:#111827;margin:0;font-family:'Poppins', sans-serif">Out of Stock Warning</h4><p style="font-size:0.82rem;color:#4b5563;margin:0.25rem 0 0 0;line-height:1.45;font-weight:500">The following items in your cart do not have sufficient stock:</p></div></div>
        <div style="display:flex;flex-direction:column;gap:0.75rem;max-height:180px;overflow-y:auto;padding:0.5rem;background-color:#faf9f6;border-radius:8px;border:1px solid #f3f0ea">${s.stockModal.items.map((i) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;gap:1rem"><div style="display:flex;flex-direction:column;min-width:0"><span style="font-weight:700;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.name)}</span>${i.selectedVariant ? `<span style="font-size:0.72rem;color:#6b7280">Option: ${esc(i.selectedVariant.name)} ${i.selectedColor ? `/ ${esc(i.selectedColor.name)}` : ''}</span>` : ''}</div><div style="text-align:right;flex-shrink:0"><span style="font-size:0.72rem;color:#ef4444;font-weight:600;display:block">Requested: ${esc(i.quantity)}</span><span style="font-size:0.72rem;color:#360910;font-weight:600;display:block">Available: ${esc(i.latestStock)}</span></div></div>`).join('')}</div>
        <p style="font-size:0.78rem;color:#6b7280;margin:0;line-height:1.4">Would you like to remove the unavailable items and proceed checking out the remaining products in your shopping bag?</p>
        <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:0.2rem"><button data-act="stock-close" class="dv-co-cancel" style="background-color:transparent;border:1px solid #d1d5db;border-radius:8px;padding:0.6rem 1.25rem;font-size:0.78rem;font-weight:600;color:#4b5563;cursor:pointer;transition:all 0.15s ease">Cancel</button><button data-act="stock-remove" class="dv-co-dark" style="background-color:#0a0a0a;border:none;border-radius:8px;padding:0.6rem 1.5rem;font-size:0.78rem;font-weight:700;color:#ffffff;cursor:pointer;transition:all 0.15s ease;box-shadow:0 4px 10px rgba(10, 10, 10, 0.2)">Remove &amp; Continue</button></div></div>`;
    }
    modalHost.appendChild(wrap);
    animate(wrap.firstElementChild, { opacity: [0, 1] }, { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] });
    animate(wrap.lastElementChild, { scale: [0.95, 1], opacity: [0, 1], y: [15, 0] }, { duration: 0.25, ease: [0.16, 1, 0.3, 1] });
  }
  const triggerAlert = (message, title = 'Notice') => { s.alert = { title, message }; s.stockModal = null; drawModal(); };
  modalHost.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'alert-close') { s.alert = null; drawModal(); }
    if (a.dataset.act === 'stock-close') { s.stockModal = null; drawModal(); }
    if (a.dataset.act === 'stock-remove') {
      s.stockModal.items.forEach((i) => removeItem(i.cartId || i.id || i._id));
      s.stockModal = null; drawModal();
      D.toast('Out-of-stock items have been removed. You can now complete your purchase!', 'success');
    }
  });

  /* ─── Cart edits ─── */
  function stockFor(item) {
    const p = D.cart.latestProducts[item.id || item._id];
    if (!p) return 999;
    const size = item.selectedVariant ? item.selectedVariant.name : '';
    const colour = item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : '');
    const inv = (p.inventory || []).find((i) => String(i.variant || '').toLowerCase() === String(size || '').toLowerCase() && String(i.color || '').toLowerCase() === String(colour || '').toLowerCase());
    return inv ? inv.stock : 50;
  }
  function updateQty(key, amount) {
    let exceeded = false, max = 999;
    s.items = reprice(s.items.map((item) => {
      if ((item.cartId || item.id || item._id) !== key) return item;
      max = stockFor(item);
      const next = item.quantity + amount;
      if (next > max) { exceeded = true; return item; }
      return { ...item, quantity: Math.max(1, next) };
    }), s.groups);
    if (exceeded) { render(); return triggerAlert(`Only ${max} item(s) left in stock.`, 'Out of Stock'); }
    if (!direct) D.cart.updateQuantity(key, amount);
    afterItems();
  }
  function removeItem(key) {
    s.items = reprice(s.items.filter((i) => (i.cartId || i.id || i._id) !== key), s.groups);
    if (!direct) D.cart.remove(key);
    afterItems();
  }
  function afterItems() { timer(); render(); emptyCheck(); }
  function emptyCheck() {
    const items = direct ? s.items : D.cart.items;
    if (D.cart.loaded && items.length === 0 && !s.success && !s.pendingCashfree) location.href = '/products';
  }

  /* ─── Saved addresses and the logged-in shopper ─── */
  function addrKeys(u) {
    const keys = [];
    if (u.email) { keys.push(`daivika_addresses_${u.email}`); keys.push(`daivika_addresses_${u.email.toLowerCase()}`); }
    if (u.phone) keys.push(`daivika_addresses_${u.phone}`);
    if (u._id || u.id) keys.push(`daivika_addresses_${u._id || u.id}`);
    return Array.from(new Set(keys));
  }
  const fill = (k, v) => { if (!s[k]) s[k] = v || ''; };
  function selectSaved(addr) {
    const u = D.auth.user;
    if (!addr) {
      s.savedId = 'new';
      Object.assign(s, { firstName: nameParts(u && u.name)[0] || '', lastName: nameParts(u && u.name).slice(1).join(' '), phone: userMobile(u), email: (u && u.email) || '', street: '', city: '', state: '', district: '', pincode: '' });
    } else {
      s.savedId = addr.id;
      Object.assign(s, { firstName: addr.firstName || '', lastName: addr.lastName || '', phone: addr.phone || '', email: addr.email || (u && u.email) || '', street: addr.street || '', city: addr.city || '', state: addr.state || '', district: addr.district || '', pincode: addr.pincode || '' });
    }
    s.addrOpen = false;
    render();
  }
  function saveAddressIfNeeded() {
    const u = D.auth.user;
    if (!(u && (s.street || s.city))) return;
    addrKeys(u).forEach((k) => {
      try {
        const existing = JSON.parse(localStorage.getItem(k) || '[]');
        const dup = existing.some((a) => String(a.street || '').trim().toLowerCase() === String(s.street || '').trim().toLowerCase() && String(a.city || '').trim().toLowerCase() === String(s.city || '').trim().toLowerCase() && String(a.pincode || '').trim() === String(s.pincode || '').trim());
        if (dup) return;
        const label = s.addrLabel === 'Other' ? (s.customLabel.trim() || 'Other') : s.addrLabel;
        const updated = [...existing, { id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, label: label || 'Home', firstName: s.firstName || '', lastName: s.lastName || '', phone: s.phone || '', email: s.email || u.email || '', street: s.street || '', city: s.city || '', state: s.state || '', district: s.district || '', pincode: s.pincode || '', isDefault: existing.length === 0 }];
        localStorage.setItem(k, JSON.stringify(updated));
        s.saved = updated;
      } catch (err) { console.error('Error saving address from checkout:', err); }
    });
  }
  let lastUser;
  D.on('auth', () => {
    const u = D.auth.user;
    if (u === lastUser) return;
    lastUser = u;
    if (u) {
      const id = u.email || u.phone;
      if (id) {
        try {
          const addrs = JSON.parse(localStorage.getItem(`daivika_addresses_${id}`) || '[]');
          s.saved = addrs;
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          if (def) {
            s.savedId = def.id;
            ['firstName', 'lastName', 'phone', 'email', 'street', 'city', 'state', 'district', 'pincode'].forEach((k) => fill(k, def[k]));
          } else if (u.role === 'user' && D.auth.token) {
            fetch(`${D.API}/orders`, { headers: { Authorization: `Bearer ${D.auth.token}` } }).then((r) => r.json()).then((json) => {
              const last = Array.isArray(json && json.data) && json.data[0] ? json.data[0].address : null;
              if (!last) return;
              ['street', 'city', 'state', 'district', 'pincode'].forEach((k) => fill(k, last[k]));
              render();
            }).catch(() => {});
          }
        } catch (e) { s.saved = []; }
      }
      if (u.name) { const p = nameParts(u.name); fill('firstName', p[0]); fill('lastName', p.slice(1).join(' ')); }
      if (u.phone) fill('phone', userMobile(u));
      if (u.email) fill('email', u.email);
    }
    render();
  });

  /* ─── Coupon ─── */
  function applyCoupon() {
    s.couponError = ''; s.couponSuccess = '';
    if (!s.phone || s.phone.trim().length < 10) { s.couponError = 'Please enter a valid 10-digit Phone Number first to verify coupon availability.'; return render(); }
    if (!s.couponInput) { s.couponError = 'Please enter a coupon code.'; return render(); }
    const code = s.couponInput.toUpperCase().trim();
    const c = s.coupons.find((x) => x.code && x.code.toUpperCase().trim() === code);
    if (!c) { s.couponError = 'Invalid coupon code.'; return render(); }
    const total = subtotal();
    if (total < c.minPurchase) { s.couponError = `Minimum purchase of ₹${c.minPurchase} required to apply this coupon.`; return render(); }
    const cat = c.category ? c.category.toLowerCase().trim() : '';
    if (cat && !['welcome', 'referral', 'festival', 'other'].includes(cat)) {
      const matching = s.items.filter((i) => i.category && i.category.toLowerCase().trim() === cat);
      if (!matching.length) { s.couponError = `This coupon is only valid for items in the "${c.category}" category.`; return render(); }
      if (matching.reduce((n, i) => n + i.price * i.quantity, 0) < c.minPurchase) { s.couponError = `Minimum purchase of ₹${c.minPurchase} for "${c.category}" items is required.`; return render(); }
    }
    const used = s.couponUsage[`${code}_${s.phone.trim()}`] || 0;
    if (used >= c.usageLimit) { s.couponError = `This coupon has already been applied ${used}/${c.usageLimit} times by mobile number ${s.phone}.`; return render(); }
    s.applied = c;
    const discount = c.discountType === 'percentage' ? Math.round((total * c.discountValue) / 100) : Math.min(total, c.discountValue);
    s.couponSuccess = `Coupon "${code}" applied successfully! You saved ₹${inr(discount)}.`;
    render();
  }

  /* ─── Payment ─── */
  function orderItems() {
    const list = s.items.map((i) => ({ productId: i.id || i._id, name: i.name, qty: i.quantity, price: i.price, image: i.image, size: i.selectedVariant ? i.selectedVariant.name : '', color: i.selectedColor ? i.selectedColor.name : (i.selectedTexture ? i.selectedTexture.name : ''), isFreeGift: Boolean(i.isFreeGift) }));
    const gp = s.giftProduct;
    if (giftEligible() && s.timerActive && gp) list.push({ productId: gp._id || gp.id || 'free_gift_item', name: `${gp.name} (Free Gift 🎁)`, qty: 1, price: 0, image: (gp.images && gp.images[0]) || gp.image || '/logo.png', size: 'Standard', color: 'Default', isFreeGift: true });
    return list;
  }
  async function pay() {
    if (!s.firstName || !s.lastName || !s.phone || !s.street || !s.city || !s.state || !s.pincode) return triggerAlert('Please fill out all required shipping and contact details', 'Missing Information');
    if (!s.district) return triggerAlert('Please select your district so we can ship from the store nearest to you.', 'District Required');
    const clean = s.phone.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      s.phoneError = 'Please enter a valid 10-digit mobile phone number';
      render();
      triggerAlert('Please enter a valid 10-digit mobile phone number for delivery updates (e.g. 9876543210).', 'Invalid Phone Number');
      const el = root.querySelector('[data-f="phone"]');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      return;
    }
    s.phoneError = '';
    s.checking = true; render();
    const out = [];
    try {
      for (const item of s.items) {
        const res = await fetch(`${D.API}/products/${item.id || item._id}?t=${Date.now()}`);
        if (!res.ok) continue;
        const r = await res.json();
        if (!(r.success && r.data)) continue;
        const size = item.selectedVariant ? item.selectedVariant.name : '';
        const colour = item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : '');
        const inv = (r.data.inventory || []).find((i) => String(i.variant || '').toLowerCase() === String(size || '').toLowerCase() && String(i.color || '').toLowerCase() === String(colour || '').toLowerCase());
        const latest = inv ? inv.stock : 50;
        if (latest < item.quantity) out.push({ ...item, latestStock: latest });
      }
    } catch (err) { console.error('Failed to verify catalog stock before checkout:', err); } finally { s.checking = false; render(); }
    if (out.length) { s.stockModal = { items: out }; s.alert = null; return drawModal(); }

    const cod = s.payment === 'Cash on Delivery';
    const invoiceSettings = read('vaugun_invoice_settings', null) || { companyLogo: '' };
    if (!window.Razorpay) return triggerAlert('Payment Gateway failed to load. Please check your internet connection and reload the page.', 'Payment Error');
    s.checking = true; render();
    let dbOrder = null, rzpOrder = null, rzpKey = window.DaivikaCheckout.razorpayKey;
    const token = D.auth.token;
    try {
      const createRes = await fetch(`${D.API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ user: `${s.firstName} ${s.lastName}`.trim(), email: s.email, phone: s.phone, couponCode: s.applied ? s.applied.code : '', isPartialCod: cod, paymentMethod: cod ? 'Cash on Delivery (Advance Paid)' : 'Razorpay', address: { street: s.street, city: s.city, district: s.district, state: s.state, pincode: s.pincode, country: 'India' }, itemsList: orderItems(), utmData: D.adParams() }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !created.success || !created.data) {
        if (created.unavailableProductId) {
          const gone = String(created.unavailableProductId);
          s.items.filter((i) => String(i.id || i._id) === gone).forEach((i) => removeItem(i.cartId || i.id || i._id));
          throw new Error(`${created.message}. It has been removed from your cart — please review your order and try again.`);
        }
        throw new Error(created.message || 'Could not create your order. Please try again.');
      }
      dbOrder = created.data;
      const shown = finalTotal();
      if (Math.abs(Number(dbOrder.total) - shown) > 1) {
        if (!window.confirm(`Your order total has been updated to ₹${inr(dbOrder.total)} (latest prices, offers and delivery charges). Continue to payment?`)) return;
      }
      const payRes = await fetch(`${D.API}/payment/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: dbOrder._id }) });
      const payData = await payRes.json().catch(() => ({}));
      rzpOrder = payData.order || payData.data;
      if (!payRes.ok || !payData.success || !(rzpOrder && rzpOrder.id)) throw new Error(payData.message || 'Failed to initialize the payment. Please try again.');
      rzpKey = payData.keyId || rzpKey;
    } catch (err) {
      console.error('Failed to start payment:', err);
      return triggerAlert(err.message || 'Failed to initialize payment. Please try again.', 'Order Not Placed');
    } finally { s.checking = false; render(); }

    const orderId = dbOrder._id;
    const rzp = new window.Razorpay({
      key: rzpKey, amount: rzpOrder.amount, currency: 'INR', name: 'Daivika Store',
      description: cod ? `${dbOrder.codPercent}% Advance Deposit (COD)` : 'Complete your sacred purchase',
      image: invoiceSettings.companyLogo || '/logo-light.png?v=daivika_v3', order_id: rzpOrder.id,
      handler: (r) => confirmPayment(r.razorpay_payment_id, orderId, dbOrder, r.razorpay_order_id, r.razorpay_signature),
      prefill: { name: `${s.firstName} ${s.lastName}`, email: s.email, contact: s.phone },
      notes: { orderId }, theme: { color: '#28060b' },
    });
    rzp.on('payment.failed', (r) => { console.error('Razorpay Payment Failed:', r.error); triggerAlert(r.error.description || 'Payment was cancelled or failed.', 'Payment Failed'); });
    rzp.open();
  }

  async function confirmPayment(paymentId, orderId, pre, rzpOrderId = null, signature = null) {
    s.checking = true; render();
    let confirmed = null;
    try {
      const res = await fetch(`${D.API}/payment/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, razorpay_payment_id: paymentId, razorpay_order_id: rzpOrderId, razorpay_signature: signature }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.data) {
        s.checking = false; render();
        return triggerAlert(`${data.message || 'We could not verify your payment.'} If money was debited, it will be confirmed automatically or refunded. Please contact support with payment ID ${paymentId}.`, 'Verification Error');
      }
      confirmed = data.data;
    } catch (networkErr) {
      // The payment went through at Razorpay; their webhook confirms the order on the server
      console.warn('Payment verify request failed; the Razorpay webhook will confirm the order:', networkErr);
      confirmed = { ...(pre || {}), _id: orderId, razorpay_payment_id: paymentId, status: 'Processing', paymentStatus: pre && pre.isPartialCod ? 'Partially Paid' : 'Paid' };
    } finally { s.checking = false; }
    try {
      sessionStorage.removeItem('daivika_gift_timer_expiry');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      s.placedId = orderId;
      saveAddressIfNeeded();
      if (s.applied) {
        const key = `${s.applied.code}_${s.phone.trim()}`;
        s.couponUsage = { ...s.couponUsage, [key]: (s.couponUsage[key] || 0) + 1 };
        localStorage.setItem('vaugun_coupon_usage', JSON.stringify(s.couponUsage));
      }
      const saved = read('vaugun_orders', []);
      localStorage.setItem('vaugun_orders', JSON.stringify([confirmed, ...saved.filter((o) => o._id !== orderId)]));
      try {
        D.track('Purchase', { content_name: `Order ${orderId}`, content_ids: s.items.map((i) => String(i.id || i._id || '')).filter(Boolean), content_type: 'product', value: Number(confirmed.total) || finalTotal(), currency: 'INR', num_items: s.items.reduce((n, i) => n + (i.quantity || 1), 0), order_id: orderId }, { email: s.email, phone: s.phone });
      } catch (e) {}
      const bought = s.items.slice();
      s.success = true;
      render();
      if (direct) bought.forEach((i) => { D.cart.remove(i.id || i._id); }); else D.cart.clear();
    } catch (error) {
      console.error('Payment completion error:', error);
      triggerAlert('Your payment was received, but something went wrong showing the confirmation. Please check My Orders or contact support.', 'System Error');
    }
  }

  // Invoice for the order just placed (same layout as the profile page's)
  function invoice() {
    if (!s.placedId) return;
    const order = read('vaugun_orders', []).find((o) => o._id === s.placedId);
    if (!order) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const settings = order.companyDetails || read('vaugun_invoice_settings', null) || { companyName: 'DAIVIKA Store', companyStreet: 'Mullonkal building, Therthally, Alakode', companyCity: 'Kannur', companyState: 'Kerala', companyPin: '670571', companyEmail: 'support@daivika.in', companyPhone: '+91 75108 21228' };
    doc.setFontSize(20); doc.setTextColor(10, 10, 10); doc.text(settings.companyName, 20, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text([settings.companyStreet, `${settings.companyCity}, ${settings.companyState} - ${settings.companyPin}`, `Email: ${settings.companyEmail}`, `Phone: ${settings.companyPhone}`, ...(settings.companyGstin ? [`GSTIN: ${settings.companyGstin}`] : [])], 20, 30);
    doc.setFontSize(14); doc.setTextColor(0); doc.text('TAX INVOICE', 190, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Invoice No: ${order.invoiceNumber || 'N/A'}`, 190, 30, { align: 'right' });
    doc.text(`Date: ${order.date}`, 190, 35, { align: 'right' });
    doc.text(`Order No: ${order.orderNumber || order._id}`, 190, 40, { align: 'right' });
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('BILL TO:', 20, 60); doc.setFont('helvetica', 'normal');
    const a = order.address || {};
    doc.text([order.user, a.street || '', `${a.city || ''}, ${a.state || ''}`, `PIN: ${a.pincode || ''}`, 'Country: India', `Phone: ${order.phone || ''}`], 20, 65);
    const clean = (n) => (n ? n.replace(/[^\x00-\x7F]/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim() : '');
    const body = order.itemsList.map((item) => {
      let name = clean(item.name);
      const gift = item.isFreeGift || (item.price === 0 && ((item.name || '').toLowerCase().includes('gift') || String(item.productId || '').includes('gift')));
      if (gift && !name.includes('FREE GIFT')) name = `[FREE GIFT 🎁] ${name}`;
      const meta = [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : '', window.DaivikaGst ? window.DaivikaGst.itemNote(item) : ''].filter(Boolean).join(' | ');
      if (meta && !name.includes('(')) name += `\n(${meta})`;
      return [name, item.qty || 1, gift ? 'FREE (INR 0)' : `INR ${item.price != null ? item.price.toLocaleString() : ''}`, gift ? 'INR 0' : `INR ${(item.price * (item.qty || 1)).toLocaleString()}`];
    });
    const opts = { startY: 100, head: [['Item Details', 'Qty', 'Unit Price', 'Total']], body, headStyles: { fillColor: [10, 10, 10] }, margin: { left: 20, right: 20 } };
    if (window.jspdfAutoTable && window.jspdfAutoTable.autoTable) window.jspdfAutoTable.autoTable(doc, opts); else doc.autoTable(opts);
    const sub = order.itemsList ? order.itemsList.reduce((n, i) => n + i.price * (i.qty || 1), 0) : 0;
    const discount = order.discount !== undefined && order.discount !== null ? order.discount : Math.max(0, sub + (order.shippingCharge || 0) - order.total);
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: INR ${sub.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
    if (discount > 0) { y += 5; doc.text(`${order.couponCode ? `Coupon Discount (${order.couponCode})` : 'Discount'}: -INR ${discount.toLocaleString('en-IN')}`, 190, y, { align: 'right' }); }
    y += 5;
    doc.text(`Shipping: ${order.shippingCharge > 0 ? 'INR ' + order.shippingCharge.toLocaleString('en-IN') : 'FREE'}`, 190, y, { align: 'right' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 10, 10);
    doc.text(`Total Due: INR ${order.total != null ? order.total.toLocaleString('en-IN') : ''}`, 190, y + 10, { align: 'right' });
    if (window.DaivikaGst) window.DaivikaGst.addToPdf(doc, order, settings, y + 22);
    doc.save(`Invoice_${order.invoiceNumber || order._id}.pdf`);
  }

  /* ─── Events ─── */
  root.addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    const a = act && act.dataset.act;
    if (a === 'back') return history.back();
    if (a === 'addr-toggle') { s.addrOpen = !s.addrOpen; return render(); }
    if (a === 'addr-close') { s.addrOpen = false; return render(); }
    const sv = t.closest('[data-saved]');
    if (sv) return selectSaved(sv.dataset.saved === 'new' ? null : s.saved.find((x) => x.id === sv.dataset.saved));
    const lb = t.closest('[data-addr-label]');
    if (lb) { s.addrLabel = lb.dataset.addrLabel; return render(); }
    const pm = t.closest('[data-pay]');
    if (pm) { s.payment = pm.dataset.pay; return render(); }
    const rm = t.closest('[data-remove]');
    if (rm) return removeItem(rm.dataset.remove);
    const q = t.closest('[data-qty]');
    if (q) return updateQty(q.dataset.key, Number(q.dataset.qty));
    if (a === 'coupon-open') { s.couponOpen = true; return render(); }
    if (a === 'coupon-cancel') { s.couponOpen = false; s.couponError = ''; return render(); }
    if (a === 'coupon-apply') return applyCoupon();
    if (a === 'coupon-remove') { s.applied = null; s.couponInput = ''; s.couponSuccess = ''; s.couponError = ''; return render(); }
    if (a === 'invoice') return invoice();
  });
  root.addEventListener('change', (e) => { if (e.target.dataset.act === 'save-toggle') { s.saveToProfile = e.target.checked; render(); } });
  root.addEventListener('input', (e) => {
    const k = e.target.dataset.f;
    if (!k) return;
    if (k === 'phone') {
      const d = e.target.value.replace(/\D/g, '').slice(0, 10);
      s.phone = d;
      s.phoneError = d.length === 10 ? '' : d.length > 0 ? 'Phone number must be exactly 10 digits' : '';
      return render();
    }
    if (k === 'couponInput') { s.couponInput = e.target.value.toUpperCase(); e.target.value = s.couponInput; return; }
    if (k === 'pincode') return pincodeChanged(e.target.value);
    s[k] = e.target.value;
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); pay(); });

  let latestPin = '';
  async function pincodeChanged(value) {
    const p = value.replace(/\D/g, '').slice(0, 6);
    s.pincode = p;
    if (p.length !== 6) { s.pin = { status: 'idle', message: '' }; return render(); }
    latestPin = p;
    s.pin = { status: 'loading', message: 'Finding your location...' };
    render();
    try {
      const res = await fetch(`${D.API}/public/pincode/${p}`);
      const json = await res.json().catch(() => ({}));
      if (latestPin !== p) return;
      if (!res.ok || !json.success || !json.data) { s.pin = res.status === 404 ? { status: 'error', message: 'PIN code not found. Please check it or fill in the address manually.' } : { status: 'idle', message: '' }; return render(); }
      const f = json.data;
      if (f.state) { s.state = f.state; s.district = f.district || ''; }
      if (f.city && !(s.city.trim() && s.city !== s.autoCity)) { s.autoCity = f.city; s.city = f.city; }
      s.pin = { status: 'success', message: f.state && !f.district ? 'State filled in — please select your district.' : '' };
      render();
    } catch (e) { if (latestPin === p) { s.pin = { status: 'idle', message: '' }; render(); } }
  }

  /* ─── Data and settings ─── */
  fetch('/api/products/groups').then((r) => r.json()).then((json) => {
    if (json.success && Array.isArray(json.data)) { s.groups = json.data; if (s.groups.length) { s.items = reprice(s.items, s.groups); render(); } }
  }).catch((err) => console.warn('Failed to fetch product groups for checkout:', err));

  // Live prices for the items being bought
  D.on('products', (map) => {
    if (!Object.keys(map).length) return;
    s.items = reprice(s.items.map((item) => {
      const p = map[item.id || item._id];
      if (!p || item.isFreeGift) return item;
      let v = item.selectedVariant, price, mrp;
      if (v) {
        const u = (p.variants || []).find((x) => x.name === v.name);
        if (!u) return item;
        v = { ...v, price: u.price, mrp: u.mrp, bulkMinQty: u.bulkMinQty, bulkPrice: u.bulkPrice };
        price = Number(u.price); mrp = Number(u.mrp);
      } else { price = Number(p.price); mrp = Number(p.mrp); }
      return { ...item, originalPrice: price, price, mrp, selectedVariant: v };
    }), s.groups);
    loadGift(); timer(); render();
  });
  // The cart page's own changes (when not a direct "Buy now")
  D.on('cart', () => {
    if (!direct) { s.items = reprice(D.cart.items, s.groups); timer(); render(); }
    emptyCheck();
  });

  (async () => {
    try {
      const res = await fetch(`${D.API}/public/settings?t=${Date.now()}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data || json;
      if (data && data.free_shipping_threshold !== undefined) { s.threshold = parseInt(data.free_shipping_threshold, 10); localStorage.setItem('vaugun_free_shipping_threshold', s.threshold); }
      if (data && data.shipping_zones !== undefined) { s.zones = data.shipping_zones; localStorage.setItem('vaugun_shipping_zones', JSON.stringify(s.zones)); }
      if (data && data.coupons !== undefined) { s.coupons = data.coupons; localStorage.setItem('vaugun_coupons', JSON.stringify(s.coupons)); }
      if (data && data.coupons_enabled !== undefined) { s.couponsEnabled = data.coupons_enabled; localStorage.setItem('vaugun_coupons_enabled', JSON.stringify(s.couponsEnabled)); }
      if (data && data.cod_settings !== undefined) { s.cod = data.cod_settings; localStorage.setItem('vaugun_cod_settings', JSON.stringify(s.cod)); }
      else { s.cod = { enabled: true, advancePercent: 30 }; localStorage.removeItem('vaugun_cod_settings'); }
      if (data && data.free_gift_settings !== undefined) { s.gift = { ...s.gift, ...data.free_gift_settings }; localStorage.setItem('daivika_free_gift_settings', JSON.stringify(data.free_gift_settings)); }
      if (s.cod && s.cod.enabled === false && s.payment === 'Cash on Delivery') s.payment = 'Razorpay';
      loadGift(); timer(); render();
    } catch (e) {}
  })();
  const fromStorage = () => {
    const v = localStorage.getItem('vaugun_free_shipping_threshold'); if (v) s.threshold = parseInt(v, 10);
    s.zones = read('vaugun_shipping_zones', s.zones); s.coupons = read('vaugun_coupons', s.coupons);
    const ce = localStorage.getItem('vaugun_coupons_enabled'); if (ce !== null) s.couponsEnabled = JSON.parse(ce);
    s.cod = read('vaugun_cod_settings', s.cod);
    const g = read('daivika_free_gift_settings', null) || read('vaugun_free_gift_settings', null); if (g) s.gift = g;
    if (s.cod && s.cod.enabled === false && s.payment === 'Cash on Delivery') s.payment = 'Razorpay';
    loadGift(); timer(); render();
  };
  window.addEventListener('storage', fromStorage);
  window.addEventListener('vaugun_settings_updated', fromStorage);
  window.addEventListener('vaugun_cod_settings_changed', fromStorage);

  // Coupon copied from the welcome popup before logging in
  try {
    const pending = localStorage.getItem('daivika_pending_coupon');
    if (pending && pending.trim()) { s.couponInput = pending.trim().toUpperCase(); s.couponOpen = true; localStorage.removeItem('daivika_pending_coupon'); }
  } catch (e) {}

  // Back from Cashfree: confirm the payment
  const returnId = new URLSearchParams(location.search).get('order_id');
  if (returnId) {
    try { history.replaceState({}, document.title, location.pathname); } catch (e) {}
    (async () => {
      try {
        s.checking = true; render();
        const res = await fetch(`${D.API}/payment/cashfree-verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: returnId }) });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const fresh = read('vaugun_orders', []);
          localStorage.setItem('vaugun_orders', JSON.stringify([data.data, ...fresh.filter((o) => o._id !== returnId)]));
          window.dispatchEvent(new Event('storage'));
          D.cart.clear();
          s.placedId = returnId; s.success = true;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          console.warn('Cashfree redirect verification failed / pending:', data);
          s.pendingCashfree = false;
          triggerAlert(data.message || 'Payment was not completed or is still pending on Cashfree. Please try again.', 'Payment Incomplete');
        }
      } catch (e) {
        console.error('Cashfree return verify error:', e);
        s.pendingCashfree = false;
        triggerAlert('Could not verify payment status with Cashfree. Please contact support if money was debited.', 'Verification Error');
      } finally { s.checking = false; s.pendingCashfree = false; render(); }
    })();
  }

  // InitiateCheckout once, with what is in the bag on arrival
  if (s.items.length) {
    try { D.track('InitiateCheckout', { content_ids: s.items.map((i) => String(i.id || i._id || '')).filter(Boolean), content_type: 'product', value: finalTotal() || 0, currency: 'INR', num_items: s.items.reduce((n, i) => n + (i.quantity || 1), 0) }); } catch (e) {}
  }

  loadGift();
  timer();
  render();
  emptyCheck();
})();
