// Product page (app/(store)/product/[id]/ProductDetailsClient.jsx, components/NotifyMeForm.jsx).
// The page is drawn in regions; a region is redrawn only when its markup changes, so running animations
// (highlight marquee, gallery fade, gift countdown) are not restarted. React's effects that pick the
// variant, colour and image are replayed in the same order (see commit()).
(function () {
  const { animate, inView } = window.Motion;
  const D = window.Daivika;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const root = document.querySelector('[data-pd-root]');
  const svg = (name, size, { color = 'currentColor', fill = 'none', stroke = 2, style = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const inr = (n) => Number(n).toLocaleString('en-IN');
  const lc = (s) => String(s || '').toLowerCase();
  const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f8fafc'/%3E%3Crect x='280' y='220' width='240' height='200' rx='16' fill='%23cbd5e1'/%3E%3Crect x='220' y='460' width='360' height='24' rx='12' fill='%23cbd5e1'/%3E%3Crect x='300' y='510' width='200' height='20' rx='10' fill='%23e2e8f0'/%3E%3C/svg%3E";
  // framer-motion defaults when a component gives no transition
  const OPACITY = { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] };
  const SPRING_Y = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 };
  const SPRING_SCALE = { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 };

  const INFO_SECTIONS = [
    { key: 'benefits', title: 'Benefits & Key Features', icon: '✨', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: 'rgba(16, 185, 129, 0.3)', accent: '#065f46', dot: '#10b981' },
    { key: 'astrologySignificance', title: 'Astrology & Spiritual Significance', icon: '🪐', bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: 'rgba(124, 58, 237, 0.28)', accent: '#5b21b6', dot: '#8b5cf6' },
    { key: 'howToWear', title: 'How to Wear', icon: '📿', bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', border: 'rgba(249, 115, 22, 0.3)', accent: '#9a3412', dot: '#f97316' },
  ];
  const GIFT_DEFAULTS = {
    productPageOfferEnabled: true, productPageTimerMinutes: 10, productPageGiftProductId: 'prod_daivika_anti_fog_spray_001',
    productPageGiftProductName: 'DAIVIKA Anti-Fog Spray', productPageGiftProductImage: '/api/images/cmti78aoh0005r332hpz1762j',
    productPageGiftProductPrice: 399, productPageApplicableType: 'all', productPageApplicableProductIds: [],
    productPageOfferTitle: '⚡ Limited Time Offer: Free Gift Included!',
    productPageOfferSubtitle: 'Add this product to cart within the countdown timer to get a FREE DAIVIKA Anti-Fog Spray with your order!',
    productPageBadgeText: 'FREE GIFT WITH ITEM 🎁',
  };
  const readGift = () => {
    try { const saved = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings'); return saved ? { ...GIFT_DEFAULTS, ...JSON.parse(saved) } : GIFT_DEFAULTS; } catch (e) { return GIFT_DEFAULTS; }
  };

  /* ─── State ─── */
  const s = {
    id: root.dataset.productId, db: null, loading: true,
    variant: 0, image: 0, color: null, texture: null, qty: 1, weight: '', checking: false,
    tab: 'description', descExpanded: false,
    reviews: [], reviewSort: 'helpful', sortOpen: false, showForm: false, userRating: 0, reviewText: '', replyId: null, replyText: '',
    related: [], gift: readGift(), giftProduct: null, timeLeft: 0, timerActive: false, timerExpired: false,
    groupArrows: false,
  };
  let switching = false;
  let initVariant = false;

  // Product shown: the API's copy over the cached catalogue copy (same object while neither changes)
  let memo = { db: undefined, cached: undefined, value: undefined };
  function product() {
    const cached = D.cart.latestProducts[s.id];
    if (memo.db === s.db && memo.cached === cached) return memo.value;
    const value = s.db ? { ...cached, ...s.db, productGroup: s.db.productGroup || (cached && cached.productGroup) } : cached;
    memo = { db: s.db, cached, value };
    return value;
  }
  let imagesMemo = { p: undefined, value: [] };
  function allImages(p) {
    if (imagesMemo.p === p) return imagesMemo.value;
    let value = [];
    if (p) {
      const colorImages = (p.colors || []).map((c) => c && c.image).filter(Boolean);
      const textureImages = (p.textures || []).map((t) => t && t.image).filter(Boolean);
      const variantImages = (p.variants || []).flatMap((v) => (Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []))).filter(Boolean);
      const rawImages = Array.isArray(p.images) ? p.images : [];
      const primary = p.image || rawImages[0] || colorImages[0] || textureImages[0] || variantImages[0];
      const all = [primary, ...rawImages, ...colorImages, ...textureImages, ...variantImages, ...(p.subImages || [])]
        .map((img) => (img && typeof img === 'object' ? img.url || img.src || img.path || null : img)).filter(Boolean);
      const unique = Array.from(new Set(all));
      value = unique.length === 0 ? (primary ? [primary] : [FALLBACK]) : unique.slice(0, 8);
    }
    imagesMemo = { p, value };
    return value;
  }
  function resolveImage(img) {
    if (img && typeof img === 'object') img = img.url || img.src || img.path || null;
    if (!img || typeof img !== 'string') return FALLBACK;
    const safe = D.safeImage(img);
    return safe ? D.optimizedImage(safe, 800) : FALLBACK;
  }

  const activeVariantOf = (p, st = s) => (p && p.variants && p.variants.length ? p.variants[st.variant] : null);
  function activeStock(p, st = s) {
    if (!p) return 0;
    if (p.inventory && p.inventory.length) {
      const hasVariants = p.variants && p.variants.length > 0;
      const v = activeVariantOf(p, st);
      const size = hasVariants ? (v ? v.name : '') : st.weight;
      const colour = st.texture ? st.texture.name : (st.color ? st.color.name : '');
      const inv = p.inventory.find((i) => lc(i.variant) === lc(size) && lc(i.color) === lc(colour));
      return inv ? inv.stock : (p.inventory.length > 1 ? 0 : (p.inventory[0] && p.inventory[0].stock != null ? p.inventory[0].stock : 50));
    }
    return 50;
  }
  function availableColors(p, st = s) {
    if (!p || !p.colors) return [];
    const v = activeVariantOf(p, st);
    if (v && v.colors && v.colors.length) return p.colors.filter((c) => v.colors.includes(c.name));
    return p.colors;
  }
  function availableTextures(p, st = s) {
    if (!p || !p.textures) return [];
    const v = activeVariantOf(p, st);
    if (v && v.colors && v.colors.length) return p.textures.filter((t) => v.colors.includes(t.name));
    return p.textures;
  }
  function colorLabel(p) {
    if (!p) return '';
    if (p.colors && p.colors.length) return p.colors[0].name;
    if (p.name.includes(' - ')) return p.name.split(' - ').pop();
    if (p.name.includes('-')) return p.name.split('-').pop();
    return p.name;
  }

  /* ─── React's selection effects, replayed in order until nothing changes ─── */
  let lastDeps = {};
  const EFFECTS = [
    // Image index past the end of the gallery goes back to the first image
    { deps: (p) => [allImages(p).length, s.image], run: (p, st, next) => { const n = allImages(p).length; if (st.image >= n && n > 0) next.image = 0; } },
    // ?size= picks the variant once
    { deps: (p) => [p], run: (p) => {
      if (initVariant || !p || !p.variants) return;
      const size = new URLSearchParams(location.search).get('size');
      if (size) { const idx = p.variants.findIndex((v) => v.name.toLowerCase() === size.toLowerCase()); if (idx !== -1) { pending.variant = idx; initVariant = true; } } else initVariant = true;
    } },
    // Default combination sold out: first in-stock variant / colour (and its image)
    { deps: (p) => [p], run: (p) => {
      if (!p || !p.inventory || !p.inventory.length) return;
      if (new URLSearchParams(location.search).get('size')) return;
      const variants = p.variants || [], colors = p.colors || [], inventory = p.inventory;
      const v0 = variants.length ? (variants[0].name || '') : '';
      const v0Colors = variants.length && variants[0].colors && variants[0].colors.length ? colors.filter((c) => variants[0].colors.includes(c.name)) : colors;
      const c0 = v0Colors.length ? (v0Colors[0].name || '') : '';
      const def = inventory.find((i) => lc(i.variant) === lc(v0) && lc(i.color) === lc(c0));
      if (!def || def.stock > 0) return;
      const imgs = [p.image, ...colors.map((c) => c.image).filter(Boolean), ...(p.textures || []).map((t) => t.image).filter(Boolean), ...(p.subImages || [])].filter(Boolean);
      if (variants.length) {
        for (let vi = 0; vi < variants.length; vi++) {
          const variant = variants[vi];
          const vColors = variant.colors && variant.colors.length ? colors.filter((c) => variant.colors.includes(c.name)) : colors;
          if (vColors.length) {
            for (const color of vColors) {
              const inv = inventory.find((i) => lc(i.variant) === lc(variant.name) && lc(i.color) === lc(color.name));
              if (inv && inv.stock > 0) {
                pending.variant = vi; pending.color = color;
                if (color.image) { const k = imgs.findIndex((x) => x === color.image); if (k !== -1) pending.image = k; }
                return;
              }
            }
          } else {
            const inv = inventory.find((i) => lc(i.variant) === lc(variant.name));
            if (inv && inv.stock > 0) { pending.variant = vi; return; }
          }
        }
      } else if (colors.length) {
        for (const color of colors) {
          const inv = inventory.find((i) => lc(i.color) === lc(color.name));
          if (inv && inv.stock > 0) {
            pending.color = color;
            if (color.image) { const k = imgs.findIndex((x) => x === color.image); if (k !== -1) pending.image = k; }
            return;
          }
        }
      }
    } },
    // A variant change keeps the colour when that variant has it, else its first colour
    { deps: (p) => [s.variant, p], run: (p, st) => {
      if (!p) return;
      const colors = availableColors(p, st);
      if (colors.length) { if (!st.color || !colors.some((c) => c.name === st.color.name)) pending.color = colors[0]; } else pending.color = null;
      if (p.textures && p.textures.length) {
        if (!st.texture || !p.textures.some((t) => t.name === st.texture.name)) pending.texture = colors.length === 0 ? p.textures[0] : null;
      } else pending.texture = null;
    } },
    // The colour / texture follows the image shown (React builds its own, shorter image list here)
    { deps: (p) => [s.image, p], run: (p, st) => {
      if (!p) return;
      const imgs = Array.from(new Set([p.image, ...(p.colors || []).map((c) => c.image).filter(Boolean), ...(p.textures || []).map((t) => t.image).filter(Boolean), ...(p.subImages || [])].filter(Boolean))).slice(0, 5);
      const url = imgs[st.image];
      if (!url) return;
      const tex = (p.textures || []).find((t) => t.image === url);
      const col = (p.colors || []).find((c) => c.image === url);
      if (tex) { if (!st.texture || st.texture.name !== tex.name) { pending.texture = tex; pending.color = null; } }
      else if (col) { if (!st.color || st.color.name !== col.name) { pending.color = col; pending.texture = null; } }
      else if (!st.color && !st.texture) {
        if (p.colors && p.colors.length) { pending.color = p.colors.find((c) => c.image) || p.colors[0]; pending.texture = null; }
        else if (p.textures && p.textures.length) { pending.texture = p.textures.find((t) => t.image) || p.textures[0]; pending.color = null; }
      }
    } },
  ];
  let pending = {};
  function commit() {
    for (let round = 0; round < 12; round++) {
      const p = product();
      const snapshot = { ...s };
      pending = {};
      EFFECTS.forEach((e, i) => {
        const deps = e.deps(p);
        const prev = lastDeps[i];
        if (prev && deps.length === prev.length && deps.every((d, k) => d === prev[k])) return;
        lastDeps[i] = deps;
        const next = {};
        e.run(p, snapshot, next);
        Object.assign(pending, next);
      });
      const changed = Object.keys(pending).filter((k) => s[k] !== pending[k]);
      if (!changed.length) break;
      Object.assign(s, pending);
    }
    render();
  }

  /* ─── Data ─── */
  function mapProduct(data) {
    let img = data.image;
    if (img && typeof img === 'object') img = img.url || img.src || img.path || null;
    if (img && typeof img === 'string' && img.includes('localhost:') && img.includes('/uploads/')) img = img.slice(img.indexOf('/uploads/'));
    let sub = data.subImages || [];
    if (Array.isArray(sub)) {
      sub = sub.map((x) => {
        if (x && typeof x === 'object') x = x.url || x.src || x.path || null;
        if (x && typeof x === 'string' && x.includes('localhost:') && x.includes('/uploads/')) x = x.slice(x.indexOf('/uploads/'));
        return x;
      }).filter(Boolean);
    }
    return { ...data, id: data._id, image: img, subImages: sub };
  }
  const shuffle4 = (list, excludeId) => list.map((p) => ({ ...p, id: p._id || p.id })).filter((p) => p.id !== excludeId).sort(() => Math.random() - 0.5).slice(0, 4);

  async function loadProduct() {
    const id = s.id;
    if (!switching) { window.scrollTo(0, 0); if (!D.cart.latestProducts[id] && !s.db) s.loading = true; }
    try {
      const res = await fetch(`${D.API}/products/${id}`);
      const result = await res.json();
      if (!(res.ok && result.success && result.data)) throw new Error('Not found in DB');
      if (id !== s.id) return;
      s.db = mapProduct(result.data);
      const cachedList = Object.values(D.cart.latestProducts);
      if (cachedList.length) s.related = shuffle4(cachedList, s.db.id);
      else {
        try {
          const r = await fetch(`${D.API}/products`);
          const j = await r.json();
          s.related = r.ok && j.success && j.data && j.data.length ? shuffle4(j.data.map((p) => ({ ...p, id: p._id })), s.db.id) : [];
        } catch (e) { s.related = []; }
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      s.db = null; s.related = [];
    } finally {
      const wasLoading = s.loading;
      s.loading = false;
      commit();
      if (switching) setTimeout(() => { switching = false; }, 500);
      else { window.scrollTo(0, 0); setTimeout(() => window.scrollTo(0, 0), 100); }
      if (wasLoading) entrance();
    }
  }

  async function loadReviews() {
    try {
      const res = await fetch(`${D.API}/reviews?productId=${s.id}`);
      const result = await res.json();
      if (res.ok && result.success) s.reviews = result.data || [];
      else if (Array.isArray(result)) s.reviews = result;
      render();
    } catch (err) { console.warn('Failed to fetch product reviews from database.', err); }
  }

  // Free gift offer: settings, the gift product and this product's countdown
  fetch(`${D.API}/public/settings?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).then((json) => {
    if (json && json.free_gift_settings) {
      s.gift = { ...s.gift, ...json.free_gift_settings };
      localStorage.setItem('daivika_free_gift_settings', JSON.stringify(json.free_gift_settings));
      giftChanged();
    }
  }).catch(() => {});
  const onGiftStorage = () => {
    const saved = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
    if (saved) { try { s.gift = JSON.parse(saved); giftChanged(); } catch (e) {} }
  };
  window.addEventListener('vaugun_settings_updated', onGiftStorage);
  window.addEventListener('storage', onGiftStorage);

  const giftId = () => (s.gift && (s.gift.productPageGiftProductId || s.gift.giftProductId)) || 'prod_daivika_anti_fog_spray_001';
  function giftEligible() {
    const p = product();
    if (!s.gift || s.gift.productPageOfferEnabled === false) return false;
    if (!p && !s.id) return false;
    if (s.gift.productPageApplicableType === 'specific') return (s.gift.productPageApplicableProductIds || []).includes(String((p && (p._id || p.id)) || s.id || ''));
    return true;
  }
  let giftFetchFor = null;
  function loadGiftProduct() {
    const gid = giftId();
    if (!gid || (s.gift && s.gift.productPageOfferEnabled === false)) { s.giftProduct = null; return; }
    if (D.cart.latestProducts[gid]) { s.giftProduct = D.cart.latestProducts[gid]; return; }
    if (giftFetchFor === gid) return;
    giftFetchFor = gid;
    const fallback = () => ({ _id: gid, id: gid, name: s.gift.productPageGiftProductName || 'DAIVIKA Anti-Fog Spray', image: s.gift.productPageGiftProductImage || '/logo.png', price: s.gift.productPageGiftProductPrice || 399 });
    fetch(`/api/products/${gid}?t=${Date.now()}`).then((r) => r.json())
      .then((json) => { s.giftProduct = json.success && json.data ? json.data : fallback(); render(); })
      .catch(() => { s.giftProduct = fallback(); render(); });
  }
  let timer = null;
  function startCountdown() {
    clearInterval(timer);
    if (!giftEligible() || !s.id) { s.timerActive = false; return; }
    const seconds = Math.max(1, (Number(s.gift.productPageTimerMinutes) || 10) * 60);
    const key = `daivika_pdp_gift_expiry_${s.id}`;
    let expiry = parseInt(sessionStorage.getItem(key), 10);
    if (!expiry || isNaN(expiry)) { expiry = Date.now() + seconds * 1000; sessionStorage.setItem(key, String(expiry)); }
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      const wasActive = s.timerActive;
      s.timeLeft = diff; s.timerActive = diff > 0; s.timerExpired = diff <= 0;
      if (wasActive !== s.timerActive) render(); else updateDigits();
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  function giftChanged() { loadGiftProduct(); startCountdown(); render(); }

  /* ─── Regions ─── */
  const regions = {};
  // Replaces a region's content only when its markup changed; returns true when it did
  function put(name, html) {
    const el = root.querySelector(`[data-r="${name}"]`);
    if (!el) return false;
    if (regions[name] === html && el.isConnected && el._drawn) return false;
    regions[name] = html;
    el.innerHTML = html;
    el._drawn = true;
    return true;
  }

  function shell(p) {
    const crumbs = [{ name: 'Products', url: '/products' }];
    if (p.category) crumbs.push({ name: p.category, url: `/products?category=${encodeURIComponent(p.category)}` });
    if (p.category && p.subcategory) crumbs.push({ name: p.subcategory, url: `/products?category=${encodeURIComponent(p.category)}&subcategory=${encodeURIComponent(p.subcategory)}` });
    crumbs.push({ name: p.name, url: `/product/${s.id}` });
    const trail = [{ name: 'Home', url: '/' }, ...crumbs];
    const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url ? (it.url.startsWith('http') ? it.url : `https://daivika.com${it.url}`) : 'https://daivika.com' })) };
    const crumbHtml = `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script><nav aria-label="Breadcrumb" style="margin:0.1rem 0 0.35rem;display:flex;align-items:center"><ol style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;list-style:none;padding:0;margin:0;font-size:0.85rem;color:#64748b;font-weight:500">${trail.map((it, i) => {
      const last = i === trail.length - 1;
      return `<li style="display:flex;align-items:center;gap:0.4rem">${i > 0 ? svg('chevron-right', 14, { color: '#94a3b8', style: 'flex-shrink:0' }) : ''}${last ? `<span style="color:#0f172a;font-weight:700" aria-current="page">${esc(it.name)}</span>` : `<a href="${esc(it.url || '/')}" class="breadcrumb-link" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.25rem;transition:color 0.2s">${i === 0 ? svg('home', 14, { style: 'margin-bottom:1px' }) : ''}${esc(it.name)}</a>`}</li>`;
    }).join('')}</ol></nav>`;
    return `<div style="background-color:#ffffff;min-height:100vh;font-family:&quot;Poppins&quot;, sans-serif;padding-bottom:3rem;margin-top:0;padding-top:0">
      <div class="container breadcrumbs-container dv-pd-crumbs" style="box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
        <div data-r="crumbs" style="display:contents">${crumbHtml}</div>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-shrink:0;z-index:5;position:relative">
          <button class="pd-share-btn" data-act="copy">${svg('link-2', 13)}<span>Copy Link</span></button>
          <button class="pd-share-btn" data-act="share">${svg('share-2', 13)}<span>Share</span></button>
        </div>
      </div>
      <div class="container pd-main-container dv-pd-main" style="box-sizing:border-box">
        <div class="product-detail-grid">
          <div class="product-gallery-column" data-enter-col style="display:flex;flex-direction:column;gap:0.75rem">
            <div class="product-gallery-container" data-gallery style="position:relative;touch-action:pan-y;display:flex;align-items:center;justify-content:center;padding:0;width:100%;aspect-ratio:1 / 1;min-height:auto;border-radius:8px;overflow:hidden;background-color:#FAF8F5">
              <div data-r="badge" style="display:contents"></div>
              <div data-gallery-layers style="display:contents"></div>
              <div data-r="arrows" style="display:contents"></div>
            </div>
          </div>
          <div class="product-info-column" data-enter-col data-enter-delay="0.1">
            <div>
              <div data-r="pill" style="display:contents"></div>
              <h1 data-r="title" style="font-size:clamp(1.5rem, 3.2vw, 2.1rem);font-weight:800;line-height:1.25;color:#1e293b;margin:0 0 0.5rem 0;letter-spacing:-0.4px"></h1>
              <div data-r="short" style="display:contents"></div>
              <div data-r="highlights" style="display:contents"></div>
              <div data-r="rating" style="display:contents"></div>
              <div data-r="price" style="display:contents"></div>
              <div data-r="bulk" style="display:contents"></div>
              <div data-r="group" style="display:contents"></div>
              <div data-r="variants" style="display:contents"></div>
              <div data-r="options" style="display:contents"></div>
              <div data-r="measure" style="display:contents"></div>
              <div data-r="gift" style="display:contents"></div>
              <div data-r="purchase" style="display:contents"></div>
              <div data-r="notify" style="display:contents"></div>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:0.4rem;background:linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 50%, #FAF0F2 100%);border:1.5px solid rgba(54, 9, 16, 0.15);border-radius:16px;padding:0.75rem 0.3rem;box-sizing:border-box;box-shadow:0 4px 16px rgba(54, 9, 16, 0.06)">
                ${[['shield-check', 'rgba(16, 185, 129, 0.12)', '#059669', '100% Premium Quality', ''], ['truck', 'rgba(54, 9, 16, 0.12)', '#360910', 'Fast Shipping', 'border-left:1px solid rgba(54, 9, 16, 0.15);border-right:1px solid rgba(54, 9, 16, 0.15);'], ['rotate-ccw', 'rgba(99, 102, 241, 0.12)', '#4f46e5', 'Easy Returns', '']].map(([icon, bg, color, label, extra]) => `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.35rem;${extra}"><div style="width:34px;height:34px;border-radius:10px;background-color:${bg};display:flex;align-items:center;justify-content:center">${svg(icon, 17, { color, stroke: 2.2 })}</div><span style="font-size:0.73rem;font-weight:800;color:#1e293b;letter-spacing:-0.1px;line-height:1.2">${label}</span></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div id="product-tabs-section" class="product-sections-container dv-pd-sections" style="max-width:1280px;padding:0 0.5rem;box-sizing:border-box">
          <div data-r="tabs" class="pd-tabs-container"></div>
          <div data-tab-body></div>
        </div>
      </div>
      <div data-r="related" style="display:contents"></div>
    </div>`;
  }

  function badgeHtml(p) {
    const v = activeVariantOf(p);
    const price = v ? Number(v.price) : Number(p.price), mrp = v ? Number(v.mrp) : Number(p.mrp);
    if (!(p.badge || mrp > price)) return '';
    return `<div style="position:absolute;top:12px;left:12px;background-color:${esc(p.badgeBg || '#fef3c7')};color:${esc(p.badgeColor || '#92400e')};font-size:0.72rem;font-weight:800;padding:0.28rem 0.7rem;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12);border:${p.badgeBg ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(251, 191, 36, 0.5)'};z-index:8;letter-spacing:0.3px;text-transform:uppercase;pointer-events:none">${esc(p.badge || `${Math.round(((mrp - price) / mrp) * 100)}% OFF`)}</div>`;
  }

  function arrowsHtml(p) {
    const imgs = allImages(p);
    if (imgs.length <= 1) return '';
    const arrow = (side, label, icon) => `<button data-act="${side}" style="position:absolute;${side === 'prev' ? 'left' : 'right'}:0.5rem;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius: 50%;background-color:rgba(0, 0, 0, 0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255, 255, 255, 0.3);color:#ffffff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;transition:all 0.2s ease;outline:none" aria-label="${label}">${svg(icon, 18, { color: '#ffffff', stroke: 2.5 })}</button>`;
    return arrow('prev', 'Previous Image', 'chevron-left') + arrow('next', 'Next Image', 'chevron-right')
      + `<div style="position:absolute;bottom:0.6rem;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:0.35rem;z-index:6;background-color:rgba(0, 0, 0, 0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:0.25rem 0.5rem;border-radius:100px;border:1px solid rgba(255, 255, 255, 0.2)">${imgs.map((_, i) => `<button data-dot="${i}" style="width:${i === s.image ? '16px' : '5px'};height:5px;border-radius:100px;background-color:${i === s.image ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'};border:none;padding:0;cursor:pointer;transition:all 0.25s ease;outline:none" aria-label="Go to image ${i + 1}"></button>`).join('')}</div>`;
  }

  // Gallery image: crossfades when the shown image changes (AnimatePresence initial={false})
  let galleryKey = null, galleryLayer = null;
  function drawGallery(p) {
    const host = root.querySelector('[data-gallery-layers]');
    const imgs = allImages(p);
    const src = resolveImage(imgs[s.image] || p.image);
    const key = `${s.image}|${src}`;
    if (key === galleryKey && galleryLayer && galleryLayer.isConnected) return;
    const first = !galleryLayer || !galleryLayer.isConnected;
    const sameIndex = galleryKey && galleryKey.split('|')[0] === String(s.image);
    galleryKey = key;
    if (!first && sameIndex) { galleryLayer.src = src; return; }
    const img = document.createElement('img');
    img.src = src;
    img.alt = p.name;
    img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;border-radius:8px';
    img.addEventListener('error', () => { img.onerror = null; img.src = FALLBACK; }, { once: true });
    const old = galleryLayer;
    galleryLayer = img;
    host.appendChild(img);
    if (!first) {
      animate(img, { opacity: [0, 1] }, { duration: 0.35, ease: 'easeInOut' });
      animate(old, { opacity: 0 }, { duration: 0.35, ease: 'easeInOut' }).then(() => old.remove());
    }
  }

  function pillHtml(p) {
    const stock = activeStock(p);
    const out = stock <= 0, limited = stock > 0 && stock < 100;
    return `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;flex-wrap:wrap"><span style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${esc(p.category)}</span><span style="font-size:0.68rem;font-weight:800;color:${out ? '#991b1b' : (limited ? '#9a3412' : '#166534')};background-color:${out ? '#fee2e2' : (limited ? '#ffedd5' : '#dcfce7')};border:${limited ? '1px solid #fed7aa' : (out ? '1px solid #fecaca' : 'none')};padding:0.2rem 0.65rem;border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;display:inline-flex;align-items:center;gap:4px">${limited ? '<span style="width:6px;height:6px;border-radius: 50%;background-color:#ea580c;display:inline-block"></span>' : ''}${out ? 'Out of Stock' : (limited ? 'Limited Stock' : 'In Stock')}</span></div>`;
  }

  function highlightsHtml(p) {
    let raw = p && p.highlights;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { raw = [{ title: raw, description: '' }]; } }
    let items = [];
    if (Array.isArray(raw) && raw.length) {
      items = raw.map((h) => {
        if (typeof h === 'string' && h.trim()) return { title: h.trim(), description: '', bg: '', color: '' };
        if (h && typeof h === 'object') {
          const title = String(h.title || h.name || h.key || '').trim();
          const description = String(h.description || h.detail || h.value || '').trim();
          if (title || description) return { title, description, bg: h.bg || '', color: h.color || '' };
        }
        return null;
      }).filter(Boolean);
    }
    if (!items.length) return '';
    const row1 = items.filter((_, i) => i % 2 === 0), row2 = items.filter((_, i) => i % 2 !== 0);
    const track = (list, pal, speed) => {
      const shown = list.length <= 2 ? [...list, ...list, ...list, ...list] : [...list, ...list, ...list];
      return `<div class="hide-scrollbar highlight-track-container" data-marquee style="display:flex;overflow-x:auto;width:100%;padding:0.15rem 0 0.35rem 0;box-sizing:border-box;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;cursor:grab;user-select:none"><div class="moving-track-inner" style="display:flex;align-items:center;gap:0.5rem;width:max-content;animation:highlights-marquee ${speed}s linear infinite;will-change:transform">${shown.map((it) => `<div style="display:inline-flex;align-items:center;gap:0.4rem;background-color:${esc(it.bg || pal.bg)};color:${esc(it.color || pal.text)};border:1px solid ${it.bg ? 'transparent' : pal.border};padding:0.45rem 0.85rem;border-radius:10px;font-size:0.78rem;white-space:nowrap;flex-shrink:0;box-shadow:0 2px 5px rgba(0, 0, 0, 0.03);pointer-events:none"><span style="font-weight:800">${esc(it.title)}</span>${it.description ? `<span style="font-weight:500;opacity:0.9">- ${esc(it.description)}</span>` : ''}</div>`).join('')}</div></div>`;
    };
    return `<div style="display:flex;flex-direction:column;gap:0.4rem;margin:0.5rem 0 1rem 0;width:100%;overflow:hidden;box-sizing:border-box">${track(row1.length ? row1 : items, { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' }, 28)}${row2.length ? track(row2, { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }, 32) : ''}</div>`;
  }

  const avg = () => (s.reviews.length ? s.reviews.reduce((n, r) => n + r.rating, 0) / s.reviews.length : 0);
  const avgText = () => (avg() > 0 ? avg().toFixed(1) : '0.0');
  const stars = (n, size, filledWhen, strokeOff = 2) => [1, 2, 3, 4, 5].map((k) => svg('star', size, { color: '#ffc107', fill: k <= filledWhen ? '#ffc107' : 'none', stroke: k <= filledWhen ? 0 : strokeOff })).join('');

  function ratingHtml() {
    const n = s.reviews.length;
    return `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap"><div style="display:flex;color:#ffc107;font-size:0.9rem;align-items:center;gap:0.1rem">${stars(5, 14, Math.round(avg()))}</div><button data-act="goReviews" style="background:none;border:none;color:#64748b;font-size:0.8rem;font-weight:700;cursor:pointer;text-decoration:underline;padding:0">${avgText()} (${n} ${n === 1 ? 'Review' : 'Reviews'})</button></div>`;
  }

  function priceHtml(p) {
    const v = activeVariantOf(p);
    const price = v ? Number(v.price) : Number(p.price), mrp = v ? Number(v.mrp) : Number(p.mrp);
    const off = mrp && mrp > price;
    return `<div style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap"><span style="font-size:clamp(1.6rem, 3.5vw, 2.2rem);font-weight:800;color:#0f172a">₹${inr(price)}</span>${off ? `<span style="font-size:clamp(1rem, 2vw, 1.2rem);color:#94a3b8;text-decoration:line-through;font-weight:600">₹${inr(mrp)}</span><span style="font-size:0.72rem;font-weight:800;color:#dc2626;background-color:#fef2f2;padding:0.2rem 0.5rem;border-radius:6px">${Math.round(((mrp - price) / mrp) * 100)}% OFF</span>` : ''}</div>`;
  }

  function bulkHtml(p) {
    const v = activeVariantOf(p);
    const min = v ? Number(v.bulkMinQty) : Number(p.bulkMinQty), bulk = v ? Number(v.bulkPrice) : Number(p.bulkPrice);
    if (!(min > 0 && bulk > 0)) return '';
    return `<div data-bulk-key="${s.variant}-${esc(s.weight)}-${min}-${bulk}" style="background:linear-gradient(135deg, #fdfbf7 0%, #f5eedc 100%);border:1px solid #e0d0b0;border-radius:14px;padding:0.75rem 1rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 2px 10px rgba(124, 94, 45, 0.04)"><div style="width:30px;height:30px;border-radius:10px;background-color:#8c6d3b;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:0.9rem;flex-shrink:0">★</div><div style="display:flex;flex-direction:column;gap:0.1rem"><div style="font-size:0.82rem;font-weight:800;color:#544324">Buy ${min}+ for ₹${inr(bulk)} each!</div><div style="font-size:0.72rem;color:#7a6336;font-weight:600">Discount applies automatically at checkout.</div></div></div>`;
  }

  function groupHtml(p) {
    const g = p.productGroup;
    if (!(g && g.products && g.products.length > 1)) return '';
    const arrows = s.groupArrows;
    const arrow = (dir, icon) => `<button data-act="group-${dir}" style="position:absolute;${dir === 'left' ? 'left' : 'right'}:0.25rem;width:28px;height:28px;border-radius: 50%;background-color:#1a1a1a;border:none;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:5;outline:none">${svg(icon, 13, { color: '#ffffff', stroke: 2.5 })}</button>`;
    return `<div style="margin-bottom:1.25rem"><div style="font-size:0.78rem;font-weight:800;color:#475569;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Colour: <span style="font-weight:900;color:#0f172a">${esc(colorLabel(p))}</span></div>
      <div class="group-slider-outer" style="position:relative;width:100%;display:flex;align-items:center">${arrows ? arrow('left', 'chevron-left') : ''}
      <div data-group-slider class="hide-scrollbar group-colour-slider" style="padding-left:${arrows ? '2rem' : '2px'};padding-right:${arrows ? '2rem' : '8px'};width:100%;flex:1;min-width:0;justify-content:flex-start">${g.products.map((gp) => {
        const current = gp._id === p.id || gp._id === p._id;
        return `<div class="group-colour-card" data-group="${esc(gp._id)}" style="border:${current ? '2px solid var(--color-primary, #0a0a0a)' : '1px solid #e2e8f0'};background-color:${current ? 'rgba(var(--color-primary-rgb), 0.02)' : '#ffffff'};transform:${current ? 'scale(1.02)' : 'scale(1)'}"><img src="${esc(D.optimizedImage(gp.image || '/images/placeholder.svg', 120))}" alt="${esc(gp.name)}" style="width:100%;height:65px;object-fit:cover;border-radius:6px;background-color:#f8fafc;pointer-events:none"><div style="font-size:0.68rem;font-weight:700;color:#1e293b;text-transform:capitalize;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${esc(colorLabel(gp))}</div><div style="text-align:center;line-height:1.1"><span style="font-size:0.7rem;font-weight:800;color:#0f172a">₹${esc(gp.price)}</span></div></div>`;
      }).join('')}</div>${arrows ? arrow('right', 'chevron-right') : ''}</div></div>`;
  }

  function variantsHtml(p) {
    if (!(p.variants && p.variants.length)) return '';
    return `<div style="margin-bottom:1.25rem"><div style="font-size:0.78rem;font-weight:800;color:#475569;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Select Variant</div><div style="display:flex;gap:0.5rem;flex-wrap:wrap">${p.variants.map((v, i) => `<button data-variant="${i}" style="padding:0.45rem 1rem;border-radius:50px;border:${s.variant === i ? '2px solid #0f172a' : '1px solid #e2e8f0'};background-color:${s.variant === i ? '#0f172a' : '#ffffff'};color:${s.variant === i ? '#ffffff' : '#334155'};font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.2s">${esc(v.name)}</button>`).join('')}</div></div>`;
  }

  function optionsHtml(p) {
    const colors = availableColors(p), textures = availableTextures(p);
    if (!colors.length && !textures.length) return '';
    const swatch = (attr, selected, bgStyle, title) => `<button ${attr} style="width:28px;height:28px;border-radius: 50%;${bgStyle};border:1px solid rgba(0, 0, 0, 0.15);outline:${selected ? '2px solid #0f172a' : 'none'};outline-offset:${selected ? '2px' : '0px'};padding:0;cursor:pointer;transition:all 0.2s;transform:${selected ? 'scale(1.08)' : 'scale(1)'}" title="${esc(title)}"></button>`;
    const label = s.texture ? `Texture - ${s.texture.name}` : (s.color ? `Color - ${s.color.name}` : '');
    return `<div style="margin-bottom:1.25rem"><div style="font-size:0.78rem;font-weight:800;color:#475569;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Option: <span style="font-weight:600;color:#64748b;text-transform:none">${esc(label)}</span></div><div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">`
      + colors.map((c) => swatch(`data-color="${esc(c.name)}"`, s.color && s.color.name === c.name && s.texture === null, `background-color:${esc(c.code)}`, c.name)).join('')
      + textures.map((t, i) => swatch(`data-texture="${i}"`, s.texture && s.texture.name === t.name, `background-image:url(${esc(t.image)});background-size:cover;background-position:center`, t.name)).join('')
      + '</div></div>';
  }

  function measureHtml(p) {
    const v = activeVariantOf(p);
    if (!(v && v.measurements && v.measurements.length)) return '';
    return `<div style="margin-bottom:1.25rem"><div style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:800;color:#475569;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">${svg('ruler', 13, { color: 'var(--color-primary)' })}Measurements (${esc(v.name)})</div><div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(90px, 1fr));gap:0.5rem">${v.measurements.map((m) => `<div style="padding:0.5rem;border-radius:10px;border:1px solid #e2e8f0;background-color:#f8fafc;text-align:center;display:flex;flex-direction:column;gap:0.15rem"><span style="font-size:0.64rem;font-weight:700;color:#64748b;text-transform:uppercase">${esc(m.name)}</span><span style="font-size:0.88rem;font-weight:800;color:#1e293b">${esc(m.value)}</span></div>`).join('')}</div></div>`;
  }

  const digits = (t) => ({ minutes: String(Math.floor(t / 60)).padStart(2, '0'), seconds: String(t % 60).padStart(2, '0') });
  function giftHtml() {
    if (!giftEligible()) return '';
    const on = s.timerActive, g = s.gift, gp = s.giftProduct;
    const img = D.optimizedImage((gp && (gp.image || (gp.images && gp.images[0]))) || g.productPageGiftProductImage || '/logo.png', 100);
    const name = (gp && gp.name) || g.productPageGiftProductName || 'DAIVIKA Anti-Fog Spray';
    const price = (gp && gp.price) || g.productPageGiftProductPrice || 399;
    const d = digits(s.timeLeft);
    return `<div style="margin-bottom:1.25rem;padding:1.1rem 1.25rem;border-radius:18px;background:${on ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 45%, #f7fee7 100%)' : '#f9fafb'};border:${on ? '1.5px solid #6ee7b7' : '1px solid #e5e7eb'};box-shadow:${on ? '0 6px 24px -4px rgba(16, 185, 129, 0.18)' : 'none'};position:relative;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.6rem;margin-bottom:0.85rem">
        <div style="display:inline-flex;align-items:center;gap:0.4rem;background-color:${on ? '#059669' : '#9ca3af'};color:#ffffff;font-size:0.68rem;font-weight:800;padding:4px 10px;border-radius:100px;letter-spacing:0.4px;text-transform:uppercase;box-shadow:${on ? '0 2px 8px rgba(5, 150, 105, 0.35)' : 'none'}">${svg('sparkles', 11)}${esc(g.productPageBadgeText || 'FREE GIFT WITH THIS ITEM 🎁')}</div>
        ${on ? `<div style="display:flex;align-items:center;gap:0.45rem;background-color:#ffffff;padding:0.3rem 0.65rem;border-radius:10px;border:1px solid #a7f3d0;box-shadow:0 1px 4px rgba(0,0,0,0.04)">${svg('clock', 13, { color: '#059669' })}<span style="font-size:0.7rem;font-weight:700;color:#065f46">Ends in:</span><div style="display:inline-flex;align-items:center;gap:2px;font-family:monospace;font-size:0.88rem;font-weight:900;color:#065f46"><span data-min style="background-color:#ecfdf5;padding:1px 4px;border-radius:4px">${d.minutes}</span><span>:</span><span data-sec style="background-color:#ecfdf5;padding:1px 4px;border-radius:4px">${d.seconds}</span></div></div>`
          : '<span style="font-size:0.72rem;color:#9ca3af;font-weight:700;background-color:#f3f4f6;padding:3px 8px;border-radius:6px">Offer Expired for this session</span>'}
      </div>
      <div style="display:flex;align-items:center;gap:0.85rem;background-color:#ffffff;padding:0.75rem 0.95rem;border-radius:14px;border:1.5px solid #d1fae5;box-shadow:0 1px 3px rgba(0,0,0,0.03)">
        <div style="position:relative;width:54px;height:54px;flex-shrink:0"><img src="${esc(img)}" alt="${esc((gp && gp.name) || 'Free Gift')}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;border:1.5px solid #a7f3d0;background-color:#f8fafc" onerror="this.onerror=null;this.src='/logo.png'"><div style="position:absolute;bottom:-3px;right:-3px;background-color:#10b981;color:#fff;border-radius: 50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 2px 5px rgba(0,0,0,0.2)">🎁</div></div>
        <div style="flex:1;min-width:0"><div style="font-size:0.68rem;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.3px">Complimentary Gift Item</div><div style="font-size:0.88rem;font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</div><div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.2rem"><span style="font-size:0.74rem;color:#94a3b8;text-decoration:line-through">₹${inr(price)}</span><span style="font-size:0.84rem;font-weight:900;color:#059669">FREE (₹0)</span><span style="font-size:0.65rem;background-color:#dcfce7;color:#065f46;padding:1px 6px;border-radius:100px;font-weight:700">100% OFF</span></div></div>
      </div>
      <div style="margin-top:0.65rem;font-size:0.74rem;color:${on ? '#047857' : '#6b7280'};line-height:1.45;display:flex;align-items:center;gap:0.4rem;font-weight:600"><span style="font-size:0.85rem">⚡</span><span>${esc(on ? (g.productPageOfferSubtitle || `Add to cart before the timer expires to get a FREE ${(gp && gp.name) || 'gift'} with this item!`) : 'Countdown expired for this session. Add to cart to purchase at standard price.')}</span></div>
    </div>`;
  }
  // The countdown digits change every second without redrawing the banner
  function updateDigits() {
    const d = digits(s.timeLeft);
    const m = root.querySelector('[data-min]'), sec = root.querySelector('[data-sec]');
    if (m) m.textContent = d.minutes;
    if (sec) sec.textContent = d.seconds;
  }

  function purchaseHtml(p) {
    const stock = activeStock(p);
    const off = stock === 0 || s.checking;
    const liked = D.wishlist.has(p.id || p._id);
    return `<div style="display:flex;flex-direction:column;gap:0.75rem;width:100%;margin-bottom:1.5rem">
      <div class="purchase-row-1" style="display:flex;align-items:center;gap:0.6rem;width:100%">
        <div class="purchase-qty-container" style="display:flex;align-items:center;background-color:#f8fafc;border-radius:50px;border:1px solid #cbd5e1;padding:0.2rem 0.4rem;height:44px;box-sizing:border-box;flex-shrink:0">
          <button data-act="minus" style="width:32px;height:32px;border-radius: 50%;border:none;background-color:transparent;cursor:pointer;font-size:1.1rem;font-weight:800;color:#475569">-</button>
          <span style="font-weight:800;font-size:0.92rem;padding:0 0.4rem;min-width:18px;text-align:center">${s.qty}</span>
          <button data-act="plus" style="width:32px;height:32px;border-radius: 50%;border:none;background-color:transparent;cursor:pointer;font-size:1.1rem;font-weight:800;color:#475569">+</button>
        </div>
        <button class="purchase-cart-btn" data-act="cart" data-press="${off ? '' : '1.01,0.99'}" style="background-color:${off ? '#e2e8f0' : 'var(--color-primary, #0f172a)'};color:${off ? '#94a3b8' : '#ffffff'};border:none;border-radius:50px;padding:0 1.25rem;height:44px;font-size:0.88rem;font-weight:800;cursor:${off ? 'not-allowed' : 'pointer'};display:flex;align-items:center;justify-content:center;flex:1;gap:0.4rem;transition:all 0.2s;white-space:nowrap">${s.checking ? 'Checking stock...' : stock === 0 ? 'Out of Stock' : `${svg('shopping-cart', 15)} Add To Cart`}</button>
        <button class="purchase-wishlist-btn" data-act="wish" data-press=",0.85" style="width:44px;height:44px;border-radius: 50%;background-color:#ffffff;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${liked ? 'var(--color-primary)' : '#64748b'};transition:all 0.2s;flex-shrink:0">${svg('heart', 18, { fill: liked ? 'currentColor' : 'none', stroke: liked ? 0 : 2 })}</button>
      </div>
      <div style="width:100%"><button class="purchase-buy-btn" data-act="buy" data-press="${off ? '' : '1.01,0.99'}" style="border-radius:50px;padding:0 1.5rem;height:44px;font-size:0.88rem;font-weight:800;cursor:${off ? 'not-allowed' : 'pointer'};border:1.5px solid #0f172a;background-color:#ffffff;color:#0f172a;display:flex;align-items:center;justify-content:center;width:100%;gap:0.5rem;transition:all 0.2s">${s.checking ? 'Checking stock...' : stock === 0 ? 'Out of Stock' : 'Buy Now'}</button></div>
    </div>`;
  }

  // Back-in-stock form (NotifyMeForm): its own state, reset when the product / option changes
  const notify = { key: null, phone: '', busy: false, done: false, error: '' };
  function notifyHtml(p) {
    if (activeStock(p) !== 0) return '';
    const hasVariants = p.variants && p.variants.length > 0;
    const v = activeVariantOf(p);
    const key = [p._id || p.id, hasVariants ? (v ? v.name : '') : s.weight, s.texture ? s.texture.name : (s.color ? s.color.name : '')].join('|');
    if (notify.key !== key) {
      if (notify.key === null) notify.phone = String((D.auth.user && D.auth.user.phone) || '').replace(/\D/g, '').slice(-10);
      notify.key = key; notify.done = false; notify.error = '';
    }
    if (notify.done) return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1rem;margin-top:0.75rem;border-radius:12px;background-color:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:0.85rem;font-weight:600">${svg('check-circle-2', 16, { style: 'flex-shrink:0' })} We will message +91 ${esc(notify.phone)} when this is back in stock.</div>`;
    return `<form data-notify style="margin-top:0.75rem;padding:0.85rem 1rem;border-radius:12px;background-color:#fdf8f0;border:1px solid #ead9c0"><div style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;font-weight:700;color:#360910;margin-bottom:0.5rem">${svg('bell', 15)} Notify me when it is back in stock</div><div style="display:flex;gap:0.5rem;flex-wrap:wrap"><input type="tel" inputmode="numeric" autocomplete="tel" aria-label="Mobile number" placeholder="10-digit mobile number" value="${esc(notify.phone)}" style="flex:1 1 160px;min-width:0;height:44px;padding:0 0.85rem;border-radius:10px;border:1px solid #d1d5db;font-size:16px;box-sizing:border-box"><button type="submit"${notify.busy ? ' disabled' : ''} style="flex:0 0 auto;height:44px;padding:0 1.1rem;border-radius:10px;border:none;background-color:#360910;color:#ffffff;font-size:0.85rem;font-weight:700;cursor:${notify.busy ? 'wait' : 'pointer'};display:inline-flex;align-items:center;gap:0.4rem">${notify.busy ? svg('loader-2', 14).replace('class="', 'class="animate-spin ') : ''} Notify Me</button></div>${notify.error ? `<div role="alert" style="color:#dc2626;font-size:0.78rem;margin-top:0.4rem">${esc(notify.error)}</div>` : ''}</form>`;
  }

  function tabsHtml() {
    const t = s.tab;
    return `<button data-tab="description" class="pd-tab-btn ${t === 'description' ? 'active' : ''}">${svg('info', 16)}<span>Overview &amp; Details</span></button>`
      + `<button data-tab="specifications" class="pd-tab-btn ${t === 'specifications' ? 'active' : ''}">${svg('ruler', 16)}<span>Specifications</span></button>`
      + `<button data-tab="reviews" class="pd-tab-btn ${t === 'reviews' ? 'active' : ''}"${t === 'reviews' ? ' style="border:none"' : ' style="border:1.5px solid #fcd34d;background-color:#fffbeb"'}>${svg('star', 16, { fill: t === 'reviews' ? '#ffffff' : '#f59e0b', color: t === 'reviews' ? '#ffffff' : '#f59e0b' })}<span>Customer Reviews</span><span class="tab-badge" style="background-color:#fef3c7;color:#d97706;padding:0.15rem 0.55rem;border-radius:50px;font-size:0.75rem;font-weight:900;line-height:1;margin-left:0.2rem">★ ${avgText()} (${s.reviews.length})</span></button>`;
  }

  const infoLine = (line, accent) => { const m = line.match(/^([^:]{2,40}):\s+(.+)$/); return m ? `<strong style="color:${accent};font-weight:700">${esc(m[1])}:</strong> ${esc(m[2])}` : esc(line); };
  function descriptionHtml(p) {
    const raw = (p.description ? p.description.replace(/(?:⭐|\u2B50|\u2605|\s){3,}\s*(?:Rated by Happy Customers)?/gi, '').replace(/Rated by Happy Customers/gi, '').trim() : '') || 'Our products represent the highest quality standards. Premium, ethically sourced, and designed for optimal everyday performance.';
    const cut = raw.length > 280;
    const text = !s.descExpanded && cut ? `${raw.slice(0, 280)}...` : raw;
    let out = `<h3 style="font-size:1.25rem;font-weight:800;margin-bottom:1rem;color:#0f172a">Product Description</h3><div style="margin-bottom:1.75rem"><p style="font-size:0.94rem;line-height:1.75;color:#475569;white-space:pre-line;margin:0">${esc(text)}</p>${cut ? `<button data-act="desc" style="background:none;border:none;color:var(--color-primary, #0f172a);font-weight:800;font-size:0.85rem;cursor:pointer;padding:0.4rem 0 0 0;display:inline-flex;align-items:center;gap:0.3rem;outline:none"><span>${s.descExpanded ? 'Show Less' : 'Read Full Description'}</span>${svg(s.descExpanded ? 'chevron-up' : 'chevron-down', 14)}</button>` : ''}</div>`;
    INFO_SECTIONS.forEach((sec) => {
      const v = p[sec.key];
      if (!(v && typeof v === 'string')) return;
      const lines = v.split('\n').map((l) => l.replace(/^\s*(?:[-•*●▪]|\d+[.)])\s*/, '').trim()).filter(Boolean);
      if (!lines.length) return;
      out += `<div style="margin-top:1.25rem;padding:1.1rem 1.25rem;background:${sec.bg};border:1.5px solid ${sec.border};border-radius:18px;box-shadow:0 4px 15px rgba(0, 0, 0, 0.03)"><h3 style="display:flex;align-items:center;gap:0.6rem;font-size:1.05rem;font-weight:800;margin:0 0 0.75rem 0;color:${sec.accent}"><span aria-hidden="true" style="width:30px;height:30px;border-radius:9px;background-color:rgba(255, 255, 255, 0.85);display:inline-flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 2px 6px rgba(0, 0, 0, 0.06);flex-shrink:0">${sec.icon}</span>${esc(sec.title)}</h3>`
        + (lines.length === 1 ? `<p style="font-size:0.92rem;line-height:1.7;color:#334155;margin:0">${infoLine(lines[0], sec.accent)}</p>`
          : `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:0.5rem">${lines.map((l) => `<li style="display:flex;gap:0.6rem;font-size:0.92rem;line-height:1.6;color:#334155"><span aria-hidden="true" style="width:7px;height:7px;border-radius: 50%;background-color:${sec.dot};flex-shrink:0;margin-top:0.55em"></span><span>${infoLine(l, sec.accent)}</span></li>`).join('')}</ul>`)
        + '</div>';
    });
    if (p.highlights && p.highlights.length) {
      const PAL = [
        { bg: 'linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 100%)', border: '1.5px solid rgba(54, 9, 16, 0.25)', title: '#360910', icon: '✨' },
        { bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1.5px solid rgba(16, 185, 129, 0.25)', title: '#065f46', icon: '💧' },
        { bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', border: '1.5px solid rgba(249, 115, 22, 0.25)', title: '#9a3412', icon: '🛡️' },
        { bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '1.5px solid rgba(124, 58, 237, 0.25)', title: '#5b21b6', icon: '⚡' },
        { bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', border: '1.5px solid rgba(244, 63, 94, 0.25)', title: '#9f1239', icon: '🌟' },
      ];
      // React maps over the raw value; a string is walked character by character, as it was there
      const list = typeof p.highlights === 'string' ? p.highlights.split('') : p.highlights;
      out += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;margin-top:1.5rem">${list.map((h, i) => {
        const t = PAL[i % PAL.length];
        const title = typeof h === 'string' ? h : h.title;
        const desc = typeof h === 'string' ? '' : h.description;
        return `<div style="padding:1.1rem 1.25rem;background:${t.bg};border:${t.border};border-radius:18px;box-shadow:0 4px 15px rgba(0, 0, 0, 0.03);position:relative;overflow:hidden"><div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:${desc ? '0.4rem' : '0'}"><span style="width:28px;height:28px;border-radius:8px;background-color:rgba(255, 255, 255, 0.85);display:flex;align-items:center;justify-content:center;font-size:0.95rem;box-shadow:0 2px 6px rgba(0, 0, 0, 0.06)">${t.icon}</span><h4 style="font-weight:800;font-size:0.98rem;color:${t.title};margin:0;line-height:1.3">${esc(title)}</h4></div>${desc ? `<p style="color:#334155;font-size:0.86rem;line-height:1.55;margin:0;font-weight:500">${esc(desc)}</p>` : ''}</div>`;
      }).join('')}</div>`;
    }
    return out;
  }

  function specsHtml(p) {
    const specs = [
      { key: 'Product Category', value: p.category ? p.category.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'General Store Product' },
      { key: 'Available Sizes', value: p.variants && p.variants.length ? p.variants.map((v) => v.name).join(', ') : 'N/A' },
      ...(p.specifications || []),
    ];
    return `<h3 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:1.25rem">Technical Specifications</h3><div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background-color:#ffffff"><div class="spec-header" style="display:grid;grid-template-columns:200px 1fr;background-color:#0f172a;color:#ffffff;padding:0.85rem 1.25rem;font-weight:800;font-size:0.85rem;align-items:center"><div>Specification</div><div>Details</div></div>${specs.map((sp, i) => `<div class="spec-row" style="display:grid;grid-template-columns:200px 1fr;padding:0.85rem 1.25rem;background-color:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:${i === specs.length - 1 ? 'none' : '1px solid #f1f5f9'};align-items:center"><div class="spec-key" style="font-weight:700;color:#64748b;font-size:0.85rem">${esc(sp.key)}</div><div class="spec-val" style="font-weight:800;color:#1e293b;font-size:0.88rem;word-break:break-word">${esc(sp.value)}</div></div>`).join('')}</div>`;
  }

  function reviewDate(str) {
    if (!str) return 'Just now';
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const sec = Math.floor((Date.now() - d.getTime()) / 1000), min = Math.floor(sec / 60), hr = Math.floor(min / 60), days = Math.floor(hr / 24);
    if (sec < 60) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const SORT_LABELS = { helpful: 'MOST HELPFUL', recent: 'MOST RECENT', highest: 'HIGHEST RATED', lowest: 'LOWEST RATED' };
  function sortedReviews() {
    const list = [...s.reviews];
    if (s.reviewSort === 'recent') list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    else if (s.reviewSort === 'highest') list.sort((a, b) => b.rating - a.rating);
    else if (s.reviewSort === 'lowest') list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    return list;
  }
  function reviewsHtml() {
    const n = s.reviews.length;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    s.reviews.forEach((r) => { const k = Math.max(1, Math.min(5, Math.round(r.rating || 5))); counts[k] = (counts[k] || 0) + 1; });
    const banner = `<div class="dv-pd-rating-banner" style="background-color:#FAF8F0;border:1px solid #EFEAE0;border-radius:16px;margin-bottom:1.75rem;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;align-items:center;min-width:120px"><div style="font-size:2.5rem;font-weight:800;color:#1e293b;line-height:1">${avgText()}</div><div style="display:flex;color:#ffc107;margin:0.4rem 0 0.3rem 0;gap:0.1rem">${stars(5, 16, Math.round(avg()))}</div><div style="font-size:0.78rem;color:#64748b;font-weight:600">${n > 0 ? `Based on ${n} ${n === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</div></div>
      <div style="flex:1 1 280px;min-width:240px;display:flex;flex-direction:column;gap:0.4rem">${[5, 4, 3, 2, 1].map((star) => { const c = counts[star] || 0; const pct = n ? Math.round((c / n) * 100) : 0; return `<div style="display:flex;align-items:center;gap:0.6rem;font-size:0.8rem"><div style="display:flex;color:#ffc107;width:68px;gap:1px;flex-shrink:0">${stars(5, 11, star, 1.5)}</div><div style="flex:1;height:9px;background-color:#e2e8f0;border-radius:100px;overflow:hidden"><div style="width:${pct}%;height:100%;background-color:${pct > 0 ? '#48d179' : 'transparent'};border-radius:100px;transition:width 0.5s ease"></div></div><div style="font-size:0.76rem;color:#64748b;font-weight:600;min-width:55px;text-align:right;flex-shrink:0">${pct}% (${c})</div></div>`; }).join('')}</div>
      <div class="dv-pd-review-actions" style="display:flex;flex-direction:column;gap:0.6rem;min-width:160px">
        <button data-act="toggleForm" style="width:100%;padding:0.65rem 1.25rem;border-radius:10px;background-color:#48d179;color:#ffffff;border:none;font-weight:800;cursor:pointer;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(72, 209, 121, 0.25);display:flex;align-items:center;justify-content:center;gap:0.35rem">${svg('message-square', 14)}${s.showForm ? 'Cancel Review' : 'WRITE A REVIEW'}</button>
        <div data-sort-wrap style="position:relative;width:100%"><button type="button" data-act="sortToggle" style="width:100%;padding:0.6rem 1rem;border-radius:10px;background-color:#ffffff;color:#166534;border:2px solid #22c55e;font-weight:800;cursor:pointer;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 6px rgba(34, 197, 94, 0.12);outline:none;transition:all 0.2s ease"><span>${SORT_LABELS[s.reviewSort]}</span>${svg('chevron-down', 16, { color: '#166534', style: `transform:${s.sortOpen ? 'rotate(180deg)' : 'rotate(0deg)'};transition:transform 0.2s ease` })}</button>${s.sortOpen ? sortMenuHtml() : ''}</div>
      </div>
    </div>`;
    const form = s.showForm ? `<form data-review-form style="background-color:#f8fafc;padding:1.5rem;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:1.75rem;overflow:hidden"><h4 style="margin-bottom:1rem;font-weight:800;color:#0f172a">How would you rate this product?</h4><div style="display:flex;gap:0.4rem;margin-bottom:1.25rem">${[1, 2, 3, 4, 5].map((k) => `<button type="button" data-rate="${k}" style="background:none;border:none;cursor:pointer;color:${k <= s.userRating ? '#ffc107' : '#ccc'};padding:0">${svg('star', 26, { fill: k <= s.userRating ? '#ffc107' : 'none', stroke: k <= s.userRating ? 0 : 2 })}</button>`).join('')}</div><textarea data-review-text placeholder="Tell us what you liked or how we can improve..." style="width:100%;height:90px;padding:0.75rem;border-radius:12px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.88rem;margin-bottom:1.25rem;outline:none;box-sizing:border-box">${esc(s.reviewText)}</textarea><div style="display:flex;gap:0.75rem"><button type="submit" style="padding:0.65rem 1.25rem;border-radius:10px;border:none;background-color:var(--color-primary, #0f172a);color:#ffffff;font-weight:800;font-size:0.85rem;cursor:pointer">Submit Review</button><button type="button" data-act="closeForm" style="padding:0.65rem 1.25rem;border-radius:10px;border:1px solid #cbd5e1;background-color:#ffffff;color:#475569;font-weight:800;font-size:0.85rem;cursor:pointer">Cancel</button></div></form>` : '';
    const list = sortedReviews().map((r) => {
      const rid = r._id || r.id;
      const replies = r.replies && r.replies.length ? `<div style="margin-left:0.75rem;padding-left:1rem;border-left:2px solid #e2e8f0;display:flex;flex-direction:column;gap:0.75rem;margin-bottom:0.75rem;margin-top:0.75rem">${r.replies.map((rp) => `<div><div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.2rem"><div style="width:24px;height:24px;border-radius: 50%;background-color:${rp.isAdmin ? 'var(--color-primary, #0f172a)' : '#cbd5e1'};color:${rp.isAdmin ? '#fff' : '#334155'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.7rem">${esc(String(rp.user).charAt(0).toUpperCase())}</div><div style="display:flex;align-items:baseline;gap:0.35rem"><div style="font-weight:800;font-size:0.8rem;color:#0f172a">${esc(rp.user)}</div>${rp.isAdmin ? '<span style="font-size:0.58rem;background-color:var(--color-primary, #0f172a);color:#fff;padding:0.08rem 0.25rem;border-radius:4px;font-weight:800;text-transform:uppercase">Admin</span>' : ''}<div style="font-size:0.68rem;color:#64748b">${esc(reviewDate(rp.createdAt || rp.date))}</div></div></div><p style="color:#475569;font-size:0.82rem;line-height:1.45;margin-left:28px;margin:0">${esc(rp.text)}</p></div>`).join('')}</div>` : '';
      const replyForm = s.replyId === rid ? `<form data-reply-form="${esc(rid)}" style="margin-left:0.75rem;padding-left:1rem;border-left:2px solid #e2e8f0;overflow:hidden;margin-top:0.75rem"><div style="display:flex;gap:0.75rem;align-items:flex-start"><textarea data-reply-text placeholder="Write a reply..." style="flex:1;min-height:60px;padding:0.5rem 0.75rem;border-radius:8px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;outline:none;resize:vertical;box-sizing:border-box">${esc(s.replyText)}</textarea></div><div style="display:flex;gap:0.4rem;margin-top:0.4rem"><button type="submit" style="padding:0.35rem 0.85rem;border-radius:6px;border:none;background-color:var(--color-primary, #0f172a);color:#ffffff;font-weight:800;font-size:0.75rem;cursor:pointer">Post Reply</button><button type="button" data-act="cancelReply" style="padding:0.35rem 0.85rem;border-radius:6px;border:1px solid #cbd5e1;background-color:#ffffff;color:#475569;font-weight:800;font-size:0.75rem;cursor:pointer">Cancel</button></div></form>` : '';
      return `<div style="padding:1.25rem;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px"><div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;align-items:flex-start"><div style="display:flex;align-items:center;gap:0.6rem"><div style="width:36px;height:36px;border-radius: 50%;background-color:#e2e8f0;color:#0f172a;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.88rem">${esc(String(r.user).charAt(0).toUpperCase())}</div><div><div style="font-weight:800;color:#0f172a;font-size:0.88rem">${esc(r.user)}</div><div style="font-size:0.72rem;color:#64748b">${esc(reviewDate(r.createdAt || r.date))}</div></div></div><div style="display:flex;color:#ffc107">${[1, 2, 3, 4, 5].map((k) => svg('star', 12, { fill: k <= r.rating ? '#ffc107' : 'none', stroke: k <= r.rating ? 0 : 2 })).join('')}</div></div><p style="color:#334155;line-height:1.5;font-size:0.88rem;margin-bottom:0.75rem">${esc(r.comment)}</p><div style="display:flex;gap:1.25rem;margin-bottom:0.5rem"><button data-like="${esc(rid)}" data-press=",0.95" style="background:none;border:none;display:flex;align-items:center;gap:0.35rem;color:${r.userLiked ? 'var(--color-primary, #0f172a)' : '#64748b'};cursor:pointer;font-size:0.78rem;font-weight:800;padding:0">${svg('thumbs-up', 13, { fill: r.userLiked ? 'currentColor' : 'none' })} Helpful (${esc(r.likes)})</button><button data-reply="${esc(rid)}" style="background:none;border:none;display:flex;align-items:center;gap:0.35rem;color:#64748b;cursor:pointer;font-size:0.78rem;font-weight:800;padding:0">${svg('message-square', 13)} ${r.replies && r.replies.length > 0 ? `${r.replies.length} Replies` : 'Reply'}</button></div>${replies}${replyForm}</div>`;
    }).join('');
    return `${banner}${form}<div style="display:flex;flex-direction:column;gap:1rem">${list}</div>`;
  }
  function sortMenuHtml() {
    return `<div data-sort-menu style="position:absolute;top:calc(100% + 4px);left:0;right:0;background-color:#ffffff;border-radius:12px;border:1.5px solid #e2e8f0;box-shadow:0 10px 25px rgba(0, 0, 0, 0.12);padding:0.35rem;z-index:100;overflow:hidden">${Object.entries(SORT_LABELS).map(([id, label]) => { const on = s.reviewSort === id; return `<div data-sort="${id}" class="dv-pd-sort-opt${on ? ' dv-on' : ''}" style="padding:0.6rem 0.85rem;border-radius:8px;font-size:0.78rem;font-weight:800;letter-spacing:0.5px;cursor:pointer;color:${on ? '#15803d' : '#334155'};background-color:${on ? '#f0fdf4' : 'transparent'};display:flex;align-items:center;justify-content:space-between;transition:all 0.15s ease"><span>${label}</span>${on ? '<span style="width:6px;height:6px;border-radius: 50%;background-color:#22c55e"></span>' : ''}</div>`; }).join('')}</div>`;
  }

  // The open tab, redrawn in place; it plays its entrance when a different tab opens
  let tabKey = null, tabEl = null;
  function drawTab(p) {
    const host = root.querySelector('[data-tab-body]');
    const html = s.tab === 'description' ? descriptionHtml(p) : s.tab === 'specifications' ? specsHtml(p) : reviewsHtml();
    if (tabKey === s.tab && tabEl && tabEl.isConnected) {
      if (tabEl._html !== html) {
        // Keep typed text and focus in the review / reply boxes
        const focused = document.activeElement && tabEl.contains(document.activeElement) ? document.activeElement : null;
        const sel = focused && focused.matches('textarea') ? [focused.matches('[data-review-text]') ? '[data-review-text]' : '[data-reply-text]', focused.selectionStart] : null;
        tabEl.innerHTML = html; tabEl._html = html;
        if (sel) { const t = tabEl.querySelector(sel[0]); if (t) { t.focus(); t.setSelectionRange(sel[1], sel[1]); } }
      }
      return;
    }
    tabKey = s.tab;
    tabEl = document.createElement('section');
    tabEl.style.cssText = `width:100%${s.tab === 'description' ? ';box-sizing:border-box' : ''};opacity:0;transform:translateY(10px)`;
    tabEl.innerHTML = html; tabEl._html = html;
    host.replaceChildren(tabEl);
    animate(tabEl, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3 }).then(() => { tabEl.style.transform = ''; });
  }

  let relatedKey = null;
  function drawRelated() {
    const host = root.querySelector('[data-r="related"]');
    const key = s.related.map((p) => p.id || p._id).join(',');
    if (key === relatedKey && host._drawn) return;
    relatedKey = key; host._drawn = true;
    host.innerHTML = '';
    if (!s.related.length) return;
    const section = document.createElement('section');
    section.className = 'dv-pd-related';
    section.style.cssText = 'background-color:#ffffff;border-top:1px solid #e2e8f0';
    section.innerHTML = `<div class="container" style="box-sizing:border-box"><div style="text-align:center;margin-bottom:2rem"><div data-rel-head style="opacity:0;transform:translateY(15px)"><div style="font-size:0.78rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.25rem">Related Products</div><h2 style="font-size:clamp(1.5rem, 3.5vw, 2rem);font-weight:800;letter-spacing:-0.4px;margin-bottom:0.5rem;color:#0f172a">Explore <span style="color:var(--color-primary, #0f172a)">Related Products</span></h2></div></div><div class="related-products-grid"></div></div>`;
    const grid = section.querySelector('.related-products-grid');
    s.related.forEach((p, i) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'opacity:0;transform:translateY(15px)';
      const card = D.productCards.create(p);
      if (card) wrap.appendChild(card);
      grid.appendChild(wrap);
      inView(wrap, () => { animate(wrap, { opacity: 1, y: 0 }, { delay: i * 0.08, duration: 0.4 }).then(() => { wrap.style.transform = ''; }); });
    });
    host.appendChild(section);
    const head = section.querySelector('[data-rel-head]');
    inView(head, () => { animate(head, { opacity: 1, y: 0 }, { duration: 0.6 }); });
  }

  /* ─── Render ─── */
  let mode = null; // 'loading' | 'missing' | 'page'
  let seoKey = null;
  function setSeo(p) {
    const title = p ? `${p.name} | DAIVIKA by Zodimithra - Authentic Spiritual Wearables` : 'Loading Sacred Product Details';
    const desc = p ? (p.shortDescription || p.description || `Shop 100% authentic, energised ${p.name} at DAIVIKA by Zodimithra. Consecrated by Vedic rituals.`) : 'Loading sacred product details at DAIVIKA.';
    const n = s.reviews.length;
    const schema = p ? {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.image,
      description: p.description || `Authentic, consecrated ${p.name} curated by Daivika by Zodimithra. Sacred quality and Vedic energisation guaranteed.`,
      brand: { '@type': 'Brand', name: 'Daivika' },
      offers: { '@type': 'Offer', url: location.href, priceCurrency: 'INR', price: p.price, priceValidUntil: '2027-12-31', itemCondition: 'https://schema.org/NewCondition', availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: 'Daivika' } },
      aggregateRating: n ? { '@type': 'AggregateRating', ratingValue: avgText(), reviewCount: String(n) } : undefined,
    } : null;
    const key = JSON.stringify([title, desc, schema]);
    if (key === seoKey) return;
    seoKey = key;
    const formatted = title.includes('DAIVIKA') || title.includes('Daivika') ? title : `${title} | DAIVIKA`;
    document.title = formatted;
    const set = (sel, attr, val) => { const m = document.querySelector(sel); if (m) m.setAttribute(attr, val); };
    set('meta[name="description"]', 'content', desc);
    set('meta[property="og:title"]', 'content', formatted);
    set('meta[property="og:description"]', 'content', desc);
    let tag = document.getElementById('ld-json-schema-page');
    if (schema) {
      if (!tag) { tag = document.createElement('script'); tag.id = 'ld-json-schema-page'; tag.type = 'application/ld+json'; document.head.appendChild(tag); }
      tag.textContent = JSON.stringify(schema);
    } else if (tag) tag.remove();
  }

  function render() {
    const p = product();
    if (s.loading) { setSeo(p); return; }
    if (!p) {
      setSeo(null);
      if (mode === 'missing') return;
      mode = 'missing';
      root.innerHTML = '<div class="container" style="padding-top:10rem;padding-bottom:10rem;text-align:center"><div data-missing style="opacity:0;transform:scale(0.9)"><h2 style="font-size:2rem;margin-bottom:1.5rem">Product not found</h2><a href="/products" class="btn btn-primary">Back to Collections</a></div></div>';
      const box = root.querySelector('[data-missing]');
      animate(box, { opacity: [0, 1] }, OPACITY);
      animate(box, { scale: [0.9, 1] }, SPRING_SCALE);
      return;
    }
    setSeo(p);
    if (mode !== 'page') {
      mode = 'page';
      for (const k in regions) delete regions[k];
      galleryKey = null; galleryLayer = null; tabKey = null; relatedKey = null;
      root.innerHTML = shell(p);
      if (!document.getElementById('dv-pd-main-style')) {
        const st = document.createElement('style');
        st.id = 'dv-pd-main-style';
        st.textContent = 'body .main-content,body .main-content.product-page,main{background-color:#ffffff !important;padding-top:1.75rem !important;margin-top:0 !important;padding-bottom:0 !important}@media (max-width: 768px){body .main-content,body .main-content.product-page,main{background-color:#ffffff !important;padding-top:1.25rem !important;margin-top:0 !important;padding-bottom:0 !important}}';
        document.head.appendChild(st);
      }
      updateGroupArrows();
    }
    put('badge', badgeHtml(p));
    drawGallery(p);
    put('arrows', arrowsHtml(p));
    put('pill', pillHtml(p));
    const titleEl = root.querySelector('[data-r="title"]');
    if (titleEl.textContent !== p.name) titleEl.textContent = p.name;
    put('short', p.shortDescription ? `<p style="font-size:0.95rem;line-height:1.6;color:#475569;margin:0 0 0.75rem 0;white-space:pre-line">${esc(p.shortDescription)}</p>` : '');
    put('highlights', highlightsHtml(p));
    put('rating', ratingHtml());
    put('price', priceHtml(p));
    if (put('bulk', bulkHtml(p))) {
      const b = root.querySelector('[data-bulk-key]');
      if (b) { animate(b, { opacity: [0, 1], scale: [0.98, 1] }, { duration: 0.3 }); }
    }
    put('group', groupHtml(p));
    put('variants', variantsHtml(p));
    put('options', optionsHtml(p));
    put('measure', measureHtml(p));
    put('gift', giftHtml());
    put('purchase', purchaseHtml(p));
    put('notify', notifyHtml(p));
    put('tabs', tabsHtml());
    drawTab(p);
    drawRelated();
  }

  // Columns rise in once the product first shows
  function entrance() {
    root.querySelectorAll('[data-enter-col]').forEach((el) => {
      el.style.opacity = '0'; el.style.transform = 'translateY(15px)';
      animate(el, { opacity: [0, 1], y: [15, 0] }, { duration: 0.6, delay: Number(el.dataset.enterDelay || 0), ease: [0.23, 1, 0.32, 1] }).then(() => { el.style.transform = ''; });
    });
  }

  function updateGroupArrows() {
    const p = product();
    const show = !!(p && p.productGroup && p.productGroup.products) && innerWidth > 768 && p.productGroup.products.length > 4;
    if (show !== s.groupArrows) { s.groupArrows = show; render(); }
  }
  window.addEventListener('resize', updateGroupArrows);

  /* ─── Actions ─── */
  const imagesNow = () => allImages(product());
  function setImage(i) { s.image = i; commit(); }
  const prevImage = () => { const n = imagesNow().length; if (n <= 1) return; setImage(s.image <= 0 ? n - 1 : s.image - 1); };
  const nextImage = () => { const n = imagesNow().length; if (n <= 1) return; setImage(s.image >= n - 1 ? 0 : s.image + 1); };

  async function checkLiveStock() {
    s.checking = true; render();
    const p0 = product();
    const hasVariants = p0.variants && p0.variants.length > 0;
    const v0 = activeVariantOf(p0);
    try {
      const res = await fetch(`${D.API}/products/${s.id}?t=${Date.now()}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const mapped = mapProduct(result.data);
          s.db = mapped;
          const size = hasVariants ? (v0 ? v0.name : '') : s.weight;
          const colour = s.texture ? s.texture.name : (s.color ? s.color.name : '');
          const inv = (mapped.inventory || []).find((i) => lc(i.variant) === lc(size) && lc(i.color) === lc(colour));
          const latest = inv ? inv.stock : ((mapped.inventory || []).length > 1 ? 0 : ((mapped.inventory || [])[0] && mapped.inventory[0].stock != null ? mapped.inventory[0].stock : 50));
          s.checking = false;
          if (latest <= 0) { D.toast(`Sorry, the selected option (${size}${colour ? ' / ' + colour : ''}) is out of stock!`, 'error'); commit(); return false; }
          if (latest < s.qty) { D.toast(`Only ${latest} item(s) left in stock.`, 'error'); commit(); return false; }
          commit();
          return true;
        }
      }
    } catch (e) { console.error('Live stock check failed:', e); }
    s.checking = false;
    commit();
    const fb = activeStock(product());
    if (fb <= 0) { D.toast('Sorry, this item is currently out of stock!', 'error'); return false; }
    if (fb < s.qty) { D.toast(`Only ${fb} item(s) left in stock.`, 'error'); return false; }
    return true;
  }
  const giftToAdd = () => (giftEligible() && s.timerActive && s.giftProduct ? s.giftProduct : null);

  async function addToCart() {
    if (s.checking) return;
    // React's handler reads the selection as it was when the button was pressed
    const p = product(), v = activeVariantOf(p), color = s.color, texture = s.texture, qty = s.qty;
    if (!(await checkLiveStock())) return;
    const gift = giftToAdd();
    D.cart.add(p, qty, v, color, texture, gift);
    if (gift) D.toast(`🎁 FREE GIFT UNLOCKED: ${gift.name} added to your cart for FREE!`, 'success');
    D.cart.open();
  }

  async function buyNow() {
    if (s.checking) return;
    const p = product(), v = activeVariantOf(p), color = s.color, texture = s.texture, qty = s.qty;
    if (!(await checkLiveStock())) return;
    let cartId = p.id || p._id;
    let name = p.name;
    const details = [];
    if (v) { cartId += `-${v.name}`; details.push(v.name); }
    if (color) { cartId += `-${color.name}`; details.push(color.name); }
    if (texture) { cartId += `-${texture.name}`; details.push(texture.name); }
    if (details.length) name += ` (${details.join(' / ')})`;
    const items = [{
      ...p, cartId, name,
      image: (color && color.image) ? color.image : ((texture && texture.image) ? texture.image : (((p.colors || []).find((c) => c.image) || {}).image || ((p.textures || []).find((t) => t.image) || {}).image || p.image)),
      price: v ? Number(v.price) : Number(p.price), mrp: v ? Number(v.mrp) : Number(p.mrp),
      selectedVariant: v, selectedColor: color, quantity: qty,
    }];
    const gift = giftToAdd();
    if (gift) {
      const gid = gift._id || gift.id;
      items.push({
        ...gift, id: gid, _id: gid, cartId: `gift_${gid}_for_${cartId}`, name: `${gift.name} (Free Gift 🎁)`,
        image: (gift.images && gift.images[0]) || gift.image || '/logo.png', price: 0, originalPrice: Number(gift.price || 399),
        mrp: Number(gift.mrp || gift.price || 399), quantity: 1, isFreeGift: true, freeGiftParentCartId: cartId, parentProductName: p.name, badge: 'FREE GIFT 🎁',
      });
    }
    // The checkout page reads this (React passed it as router state)
    try { sessionStorage.setItem('daivika_checkout_state', JSON.stringify({ checkoutItems: items })); } catch (e) {}
    location.href = '/checkout';
  }

  function copyLink() {
    const text = location.href;
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); D.alert('Product page link copied to clipboard!', 'Copy Product Link'); } catch (e) { D.alert('Could not copy link automatically. Please copy the URL from your browser address bar.', 'Copy Product Link'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => D.alert('Product page link copied to clipboard!', 'Copy Product Link')).catch(fallback);
    else fallback();
  }
  function share() {
    const p = product();
    if (navigator.share) navigator.share({ title: `${p.name} | Daivika Store`, text: p.description || `Buy ${p.name} at Daivika store.`, url: location.href }).catch((e) => console.log('Error sharing', e));
    else { navigator.clipboard.writeText(location.href); D.alert('Product page link copied to clipboard!', 'Share Product'); }
  }

  function switchProduct(newId) {
    switching = true;
    history.pushState(null, '', `/product/${newId}`);
    Object.assign(s, { variant: 0, image: 0, color: null, texture: null, qty: 1, id: newId, reviews: [] });
    initVariant = false;
    lastDeps = {};
    loadReviews();
    startCountdown();
    loadProduct();
  }

  // Forms open and close by height (framer height: 0 ↔ auto)
  function expand(el) {
    const h = el.scrollHeight;
    el.style.height = '0px'; el.style.opacity = '0';
    animate(el, { height: [0, h], opacity: [0, 1] }, OPACITY).then(() => { el.style.height = ''; });
  }
  function collapse(el, done) {
    const h = el.offsetHeight;
    const clone = el.cloneNode(true);
    el.replaceWith(clone);
    clone.style.overflow = 'hidden';
    animate(clone, { height: [h, 0], opacity: [1, 0] }, OPACITY).then(() => { clone.remove(); done && done(); });
    return clone;
  }

  root.addEventListener('click', async (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    const a = act && act.dataset.act;
    if (a === 'copy') return copyLink();
    if (a === 'share') return share();
    if (a === 'prev') { e.preventDefault(); e.stopPropagation(); return prevImage(); }
    if (a === 'next') { e.preventDefault(); e.stopPropagation(); return nextImage(); }
    const dot = t.closest('[data-dot]');
    if (dot) { e.stopPropagation(); return setImage(Number(dot.dataset.dot)); }
    if (a === 'goReviews') { s.tab = 'reviews'; render(); const sec = document.getElementById('product-tabs-section'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'group-left' || a === 'group-right') {
      e.stopPropagation();
      const slider = root.querySelector('[data-group-slider]');
      if (slider) slider.scrollBy({ left: (a === 'group-left' ? -1 : 1) * ((innerWidth <= 600 ? 110 : 100) + 12), behavior: 'smooth' });
      return;
    }
    const g = t.closest('[data-group]');
    if (g) { const p = product(); if (!(g.dataset.group === p.id || g.dataset.group === p._id)) switchProduct(g.dataset.group); return; }
    const vb = t.closest('[data-variant]');
    if (vb) { s.variant = Number(vb.dataset.variant); return commit(); }
    const cb = t.closest('[data-color]');
    if (cb) {
      const p = product();
      const color = availableColors(p).find((c) => c.name === cb.dataset.color);
      s.color = color; s.texture = null;
      if (color && color.image) { const k = allImages(p).indexOf(color.image); if (k !== -1) s.image = k; }
      return commit();
    }
    const tb = t.closest('[data-texture]');
    if (tb) {
      const p = product();
      const tex = availableTextures(p)[Number(tb.dataset.texture)];
      s.texture = tex; s.color = null;
      if (tex && tex.image) { const k = allImages(p).indexOf(tex.image); if (k !== -1) s.image = k; }
      return commit();
    }
    if (a === 'minus') { s.qty = Math.max(1, s.qty - 1); return render(); }
    if (a === 'plus') {
      const stock = activeStock(product());
      if (s.qty + 1 > stock) D.toast(`Only ${stock} item(s) left in stock.`, 'error'); else { s.qty += 1; render(); }
      return;
    }
    if (a === 'cart') { if (activeStock(product()) === 0 || s.checking) return; return addToCart(); }
    if (a === 'buy') { if (activeStock(product()) === 0 || s.checking) return; return buyNow(); }
    if (a === 'wish') { D.wishlist.toggle(product()); return; }
    const tab = t.closest('[data-tab]');
    if (tab) { s.tab = tab.dataset.tab; return render(); }
    if (a === 'desc') { s.descExpanded = !s.descExpanded; return render(); }
    if (a === 'toggleForm' || a === 'closeForm') {
      if (s.showForm) { const f = root.querySelector('[data-review-form]'); s.showForm = false; if (f) collapse(f, () => {}); tabEl._html = null; render(); return; }
      s.showForm = true; render();
      const f = root.querySelector('[data-review-form]');
      if (f) expand(f);
      return;
    }
    if (a === 'sortToggle') {
      if (s.sortOpen) {
        const m = root.querySelector('[data-sort-menu]');
        s.sortOpen = false;
        if (m) { const c = m.cloneNode(true); m.replaceWith(c); animate(c, { opacity: 0, y: -6, scale: 0.98 }, { duration: 0.15 }).then(() => c.remove()); }
        tabEl._html = null; render();
        return;
      }
      s.sortOpen = true; render();
      const m = root.querySelector('[data-sort-menu]');
      if (m) animate(m, { opacity: [0, 1], y: [-6, 0], scale: [0.98, 1] }, { duration: 0.15 });
      return;
    }
    const so = t.closest('[data-sort]');
    if (so) {
      s.reviewSort = so.dataset.sort; s.sortOpen = false;
      const m = root.querySelector('[data-sort-menu]');
      if (m) { const c = m.cloneNode(true); m.replaceWith(c); animate(c, { opacity: 0, y: -6, scale: 0.98 }, { duration: 0.15 }).then(() => c.remove()); }
      tabEl._html = null; render();
      return;
    }
    const rate = t.closest('[data-rate]');
    if (rate) { s.userRating = Number(rate.dataset.rate); return render(); }
    const like = t.closest('[data-like]');
    if (like) return likeReview(like.dataset.like);
    const rep = t.closest('[data-reply]');
    if (rep) {
      const rid = rep.dataset.reply;
      if (s.replyId === rid) { const f = root.querySelector('[data-reply-form]'); s.replyId = null; if (f) collapse(f); tabEl._html = null; render(); return; }
      const old = root.querySelector('[data-reply-form]');
      if (old) collapse(old);
      s.replyId = rid; tabEl._html = null; render();
      const f = root.querySelector(`[data-reply-form="${CSS.escape(rid)}"]`);
      if (f) { expand(f); f.querySelector('textarea').focus(); }
      return;
    }
    if (a === 'cancelReply') { const f = root.querySelector('[data-reply-form]'); s.replyId = null; s.replyText = ''; if (f) collapse(f); tabEl._html = null; render(); }
  });

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-review-text]')) s.reviewText = e.target.value;
    else if (e.target.matches('[data-reply-text]')) s.replyText = e.target.value;
    else if (e.target.closest('[data-notify]')) { notify.phone = e.target.value.replace(/\D/g, '').slice(-10); e.target.value = notify.phone; }
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.matches('[data-notify]')) return submitNotify();
    if (f.matches('[data-review-form]')) return addReview();
    if (f.matches('[data-reply-form]')) return addReply(f.dataset.replyForm);
  });

  async function submitNotify() {
    if (!/^[6-9]\d{9}$/.test(notify.phone)) { notify.error = 'Please enter a valid 10-digit mobile number.'; return render(); }
    notify.busy = true; notify.error = ''; render();
    try {
      const p = product();
      const hasVariants = p.variants && p.variants.length > 0;
      const v = activeVariantOf(p);
      const token = localStorage.getItem('vaugun_token');
      const res = await fetch(`${D.API}/public/stock-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productId: p._id || p.id, variant: hasVariants ? (v ? v.name : '') : s.weight, color: s.texture ? s.texture.name : (s.color ? s.color.name : ''), phone: notify.phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not save your request. Please try again.');
      notify.done = true;
    } catch (err) { notify.error = err.message; } finally { notify.busy = false; render(); }
  }

  async function addReview() {
    if (s.userRating === 0 || !s.reviewText.trim()) return;
    const user = D.auth.user;
    const p = product();
    try {
      const res = await fetch(`${D.API}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: s.id, user: (user && user.name) || 'Guest User', email: (user && user.email) || 'guest@daivika.com', productName: (p && p.name) || 'Daivika Product', rating: Number(s.userRating), comment: s.reviewText }),
      });
      const data = await res.json();
      if (res.ok && data.success) { loadReviews(); D.alert('Review submitted successfully!', 'Review Added'); }
      else { s.reviews = [data.data || data, ...s.reviews]; D.alert('Review submitted!', 'Review Added'); }
    } catch (err) {
      console.error(err);
      s.reviews = [{ _id: 'rev_' + Date.now(), productId: s.id, user: (user && user.name) || 'Guest User', productName: (p && p.name) || 'Daivika Product', rating: Number(s.userRating), comment: s.reviewText, likes: 0, replies: [], createdAt: new Date().toISOString() }, ...s.reviews];
      D.alert('Review added locally.', 'Review Added');
    }
    s.userRating = 0; s.reviewText = '';
    const f = root.querySelector('[data-review-form]');
    s.showForm = false;
    if (f) collapse(f);
    tabEl._html = null;
    render();
  }

  async function likeReview(rid) {
    let unlike = false;
    s.reviews = s.reviews.map((r) => {
      if ((r._id || r.id) !== rid) return r;
      if (r.userLiked) { unlike = true; return { ...r, likes: Math.max(0, r.likes - 1), userLiked: false }; }
      return { ...r, likes: r.likes + 1, userLiked: true };
    });
    render();
    try { await fetch(`${D.API}/reviews/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId: rid, action: unlike ? 'unlike' : 'like' }) }); }
    catch (err) { console.error('Failed to sync like with server', err); }
  }

  async function addReply(rid) {
    if (!s.replyText.trim()) return;
    const text = s.replyText;
    const user = D.auth.user;
    s.replyText = '';
    const f = root.querySelector('[data-reply-form]');
    s.replyId = null;
    if (f) collapse(f);
    const temp = { user: (user && user.name) || 'Guest User', isAdmin: !!(user && user.role === 'admin'), createdAt: new Date().toISOString(), text };
    s.reviews = s.reviews.map((r) => ((r._id || r.id) === rid ? { ...r, replies: [...(r.replies || []), temp] } : r));
    tabEl._html = null;
    render();
    try {
      const res = await fetch(`${D.API}/reviews/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewId: rid, user: temp.user, text, isAdmin: temp.isAdmin }) });
      if (res.ok) { const data = await res.json(); if (data.success && data.data) { s.reviews = s.reviews.map((r) => ((r._id || r.id) === rid ? data.data : r)); render(); } }
    } catch (err) { console.error('Failed to submit reply to database', err); }
  }

  // Gallery swipe (35 px)
  let touchX = null;
  root.addEventListener('touchstart', (e) => {
    if (e.target.closest('[data-act="prev"],[data-act="next"],[data-dot],[data-act^="group-"]')) return;
    if (e.target.closest('[data-gallery]')) touchX = e.touches[0].clientX;
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (touchX === null || !e.target.closest('[data-gallery]')) { touchX = null; return; }
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 35) { if (diff > 0) nextImage(); else prevImage(); }
    touchX = null;
  });

  // Highlight rows: drag to scroll, pause while held or hovered
  let drag = null;
  root.addEventListener('mousedown', (e) => {
    const el = e.target.closest('[data-marquee]');
    if (!el) return;
    drag = { el, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.firstElementChild.style.animationPlayState = 'paused';
  });
  root.addEventListener('mousemove', (e) => {
    if (!drag) return;
    e.preventDefault();
    drag.el.scrollLeft = drag.scrollLeft - (e.pageX - drag.el.offsetLeft - drag.startX) * 1.5;
  });
  const endDrag = () => { if (!drag) return; drag.el.style.cursor = 'grab'; drag.el.firstElementChild.style.animationPlayState = 'running'; drag = null; };
  root.addEventListener('mouseup', endDrag);
  root.addEventListener('mouseover', (e) => { const inner = e.target.closest('.moving-track-inner'); if (inner) inner.style.animationPlayState = 'paused'; });
  root.addEventListener('mouseout', (e) => {
    const inner = e.target.closest('.moving-track-inner');
    if (inner && !inner.contains(e.relatedTarget)) inner.style.animationPlayState = 'running';
    const track = e.target.closest('[data-marquee]');
    if (track && !track.contains(e.relatedTarget)) endDrag();
  });

  // whileHover / whileTap scale on buttons (data-press="hover,tap")
  root.addEventListener('pointerover', (e) => {
    const b = e.target.closest('[data-press]');
    if (!b || b.contains(e.relatedTarget) || !b.dataset.press) return;
    const [hover] = b.dataset.press.split(',');
    if (hover) animate(b, { scale: Number(hover) }, SPRING_SCALE);
  });
  root.addEventListener('pointerout', (e) => {
    const b = e.target.closest('[data-press]');
    if (!b || b.contains(e.relatedTarget) || !b.dataset.press) return;
    animate(b, { scale: 1 }, SPRING_SCALE);
  });
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-press]');
    if (!b || !b.dataset.press) return;
    const [, tap] = b.dataset.press.split(',');
    if (tap) animate(b, { scale: Number(tap) }, SPRING_SCALE);
  });
  root.addEventListener('pointerup', (e) => {
    const b = e.target.closest('[data-press]');
    if (!b || !b.dataset.press) return;
    const [hover] = b.dataset.press.split(',');
    animate(b, { scale: hover && b.matches(':hover') ? Number(hover) : 1 }, SPRING_SCALE);
  });

  // Stock changes pushed from other tabs / the live feed
  const onStock = (e) => {
    let data = e.detail;
    if (e.type === 'storage' && e.key === 'daivika_last_stock_update') { try { data = JSON.parse(e.newValue); } catch (err) { console.error('Failed to parse storage update info:', err); } }
    if (!data || data.productId !== s.id || !s.db) return;
    const same = (inv) => lc(inv.variant) === lc(data.variant) && lc(inv.color) === lc(data.color);
    const inventory = (s.db.inventory || []).map((inv) => (same(inv) ? { ...inv, stock: data.stock } : inv));
    if (!(s.db.inventory || []).some(same)) inventory.push({ variant: data.variant || '', color: data.color || '', stock: data.stock });
    s.db = { ...s.db, inventory };
    commit();
  };
  window.addEventListener('daivika_stock_update', onStock);
  window.addEventListener('storage', onStock);

  // Catalogue updates: the product, related products and the gift product follow them
  let trackedFor = null;
  D.on('products', () => {
    const p = product();
    if (!s.related.length && Object.keys(D.cart.latestProducts).length && p) s.related = shuffle4(Object.values(D.cart.latestProducts), p.id || p._id);
    loadGiftProduct();
    if (!s.loading) commit();
  });
  D.on('wishlist', () => { if (mode === 'page') render(); });
  D.on('auth', () => { if (mode === 'page' && notify.key !== null && !notify.phone) { notify.phone = String((D.auth.user && D.auth.user.phone) || '').replace(/\D/g, '').slice(-10); regions.notify = null; render(); } });

  // Recently viewed and Meta Pixel ViewContent whenever the product shown changes
  const origCommit = commit;
  commit = function () {
    origCommit();
    const p = product();
    if (p && p !== trackedFor) {
      trackedFor = p;
      D.cart.trackRecentlyViewed(p);
      try { D.track('ViewContent', { content_name: p.name || 'Product', content_category: p.category || 'General', content_ids: [String(p._id || p.id || s.id || '')], content_type: 'product', value: Number(p.price) || 0, currency: 'INR' }); } catch (e) {}
    }
  };

  // React reloads the page data when the browser goes back to another product
  window.addEventListener('popstate', () => location.reload());

  setSeo(null);
  loadGiftProduct();
  startCountdown();
  loadReviews();
  loadProduct();
})();
