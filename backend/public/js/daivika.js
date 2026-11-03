// Shared storefront state for the Blade pages: the same login, cart, settings and tracking the React
// contexts (AuthContext, CartContext, lib/meta-pixel, store layout) provided. Same localStorage keys,
// so a shopper keeps their cart and login when moving between the old and new pages.
(function () {
  const API = '/api';
  const listeners = {};
  // Scripts that load later still get the current state straight away
  const on = (name, fn) => {
    (listeners[name] = listeners[name] || []).push(fn);
    if (name === 'cart' && cart.loaded) fn(cart);
    if (name === 'auth' && !auth.loading) fn(auth);
    if (name === 'products' && Object.keys(cart.latestProducts).length) fn(cart.latestProducts);
  };
  const emit = (name, data) => (listeners[name] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };

  /* ─── Auth (context/AuthContext.jsx) ─── */
  const auth = { token: localStorage.getItem('vaugun_token'), user: null, loading: true };

  function setToken(token) {
    auth.token = token;
    if (token) localStorage.setItem('vaugun_token', token);
    else localStorage.removeItem('vaugun_token');
  }

  async function loadUser() {
    if (!auth.token) { auth.user = null; auth.loading = false; emit('auth', auth); return; }
    auth.loading = true;
    try {
      const res = await fetch(`${API}/auth/me`, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` } });
      const json = await res.json();
      if (res.ok && json.success) auth.user = json.data;
      else { auth.user = null; setToken(null); }
    } catch (e) {
      // Backend offline: fall back to the profile saved at the last login, like AuthContext
      auth.user = read('vaugun_user_offline', null);
    }
    auth.loading = false;
    emit('auth', auth);
  }

  auth.logout = () => {
    auth.user = null;
    setToken(null);
    localStorage.removeItem('vaugun_user_offline');
    emit('auth', auth);
    window.dispatchEvent(new CustomEvent('vaugun_logout_success'));
  };

  // All tabs share one login: follow a login or logout made in another tab
  window.addEventListener('storage', (e) => {
    if (e.key !== 'vaugun_token' || e.newValue === e.oldValue) return;
    auth.token = e.newValue;
    if (!e.newValue) { auth.user = null; emit('auth', auth); return; }
    loadUser();
  });

  /* ─── Cart (context/CartContext.jsx) ─── */
  const cart = { items: [], isOpen: false, latestProducts: {}, groups: [], loaded: false };

  function recalc(items, groups) {
    // Drop free gifts whose parent product left the cart
    const parents = new Set(items.filter((i) => !i.isFreeGift).map((i) => i.cartId));
    const valid = items.filter((i) => !(i.isFreeGift && i.freeGiftParentCartId) || parents.has(i.freeGiftParentCartId));

    const groupOf = {};
    (groups || []).forEach((g) => (g.products || []).forEach((p) => {
      const id = typeof p === 'object' ? (p._id || p.id) : p;
      if (id) groupOf[String(id)] = g;
    }));
    const keyOf = (item) => {
      const id = String(item.id || item._id || '');
      const variant = item.selectedVariant ? String(item.selectedVariant.name || '').trim().toLowerCase() : '';
      const g = groupOf[id];
      return g ? `group_${g._id}_${variant}` : `prod_${id}_${variant}`;
    };
    const qty = {};
    valid.forEach((item) => { if (!item.isFreeGift) qty[keyOf(item)] = (qty[keyOf(item)] || 0) + item.quantity; });

    return valid.map((item) => {
      if (item.isFreeGift) return { ...item, price: 0, quantity: 1 };
      const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
      let price = originalPrice;
      const total = qty[keyOf(item)] || 0;
      const src = item.selectedVariant || item;
      const minQty = Number(src.bulkMinQty), bulk = Number(src.bulkPrice);
      if (minQty > 0 && bulk > 0 && total >= minQty) price = bulk;
      return { ...item, originalPrice, price };
    });
  }

  function setItems(items) {
    cart.items = recalc(items, cart.groups);
    if (cart.loaded) localStorage.setItem('drop_cart', JSON.stringify(cart.items));
    emit('cart', cart);
  }

  cart.count = () => cart.items.reduce((n, i) => n + i.quantity, 0);
  cart.total = () => cart.items.reduce((n, i) => n + i.price * i.quantity, 0);
  cart.open = () => { cart.isOpen = true; emit('cart', cart); };
  cart.close = () => { cart.isOpen = false; emit('cart', cart); };
  cart.clear = () => setItems([]);

  cart.trackRecentlyViewed = (product) => {
    const id = product && (product.id || product._id);
    if (!id) return;
    try {
      let list = read('daivika_keep_shopping_products', []).filter((p) => (p.id || p._id) !== id);
      const info = {
        id, _id: id, name: product.name,
        image: product.image && typeof product.image === 'object' ? (product.image.url || product.image.src) : product.image,
        price: product.price, mrp: product.mrp, category: product.category, ratingInfo: product.ratingInfo,
        variants: product.variants, colors: product.colors,
      };
      list.unshift(info);
      localStorage.setItem('daivika_keep_shopping_products', JSON.stringify(list.slice(0, 6)));
      localStorage.setItem('kinzo_keep_shopping_product', JSON.stringify(info));
    } catch (e) { console.error('Failed to save recently viewed product:', e); }
  };

  cart.add = (product, quantity = 1, variant = null, color = null, texture = null, gift = null) => {
    const baseId = product.id || product._id;
    let cartId = baseId;
    if (variant) cartId += `-${variant.name}`;
    if (color) cartId += `-${color.name}`;
    if (texture) cartId += `-${texture.name}`;

    let items;
    if (cart.items.find((i) => i.cartId === cartId)) {
      items = cart.items.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + quantity } : i));
    } else {
      const details = [variant, color, texture].filter(Boolean).map((d) => d.name);
      items = [...cart.items, {
        ...product,
        cartId,
        name: details.length ? `${product.name} (${details.join(' / ')})` : product.name,
        image: (color && color.image) || (texture && texture.image) || (product.colors || []).find((c) => c.image)?.image || (product.textures || []).find((t) => t.image)?.image || product.image,
        originalPrice: Number(variant ? variant.price : product.price),
        price: Number(variant ? variant.price : product.price),
        mrp: Number(variant ? variant.mrp : product.mrp),
        selectedVariant: variant, selectedColor: color, selectedTexture: texture,
        isFreeGift: false,
        quantity,
      }];
    }

    if (gift) {
      const giftId = String(gift._id || gift.id || 'free_gift');
      const giftCartId = `gift_${giftId}_for_${cartId}`;
      if (!items.find((i) => i.cartId === giftCartId)) {
        items = [...items, {
          ...gift, id: giftId, _id: giftId, cartId: giftCartId,
          name: `${gift.name} (Free Gift 🎁)`,
          image: (gift.images && gift.images[0]) || gift.image || '/logo.png',
          originalPrice: Number(gift.price || gift.mrp || 399), price: 0, mrp: Number(gift.mrp || gift.price || 399),
          quantity: 1, isFreeGift: true, freeGiftParentCartId: cartId, parentProductName: product.name, badge: 'FREE GIFT 🎁',
        }];
      }
    }
    setItems(items);
    cart.trackRecentlyViewed(product);
    const price = Number(variant ? variant.price : product.price);
    track('AddToCart', {
      content_name: product.name || 'Product', content_category: product.category || 'General',
      content_ids: [baseId ? String(baseId) : ''], content_type: 'product', value: price * quantity, currency: 'INR', num_items: quantity,
    });
  };

  cart.remove = (cartId) => setItems(cart.items.filter((i) => i.cartId !== cartId && i.freeGiftParentCartId !== cartId));

  cart.updateQuantity = (cartId, amount) => {
    const target = cart.items.find((i) => i.cartId === cartId);
    if (!target || target.isFreeGift) return;
    if (amount > 0) {
      const latest = cart.latestProducts[target.id || target._id];
      if (latest) {
        const size = target.selectedVariant ? target.selectedVariant.name : '';
        const colour = target.selectedColor ? target.selectedColor.name : (target.selectedTexture ? target.selectedTexture.name : '');
        const inv = (latest.inventory || []).find((i) => (i.variant || '').toLowerCase() === (size || '').toLowerCase() && (i.color || '').toLowerCase() === (colour || '').toLowerCase());
        const stock = inv ? inv.stock : 50;
        if (target.quantity + amount > stock) {
          toast(`Only ${stock} item(s) left in stock.`, 'error');
          return;
        }
      }
    }
    const next = target.quantity + amount;
    if (next <= 0) cart.remove(cartId);
    else setItems(cart.items.map((i) => (i.cartId === cartId ? { ...i, quantity: Math.max(1, next) } : i)));
  };

  function applyProductUpdate(data) {
    if (!data) return;
    if (data.type === 'delete') {
      delete cart.latestProducts[data.productId];
      setItems(cart.items.filter((i) => (i.id || i._id) !== data.productId));
      return;
    }
    const p = data.product;
    if (!p) return;
    const id = p._id || p.id;
    cart.latestProducts[id] = p;
    if (!cart.items.some((i) => (i.id || i._id) === id)) return;
    setItems(cart.items.map((item) => {
      if ((item.id || item._id) !== id) return item;
      let variant = item.selectedVariant, originalPrice, mrp;
      if (variant) {
        const v = (p.variants || []).find((x) => x.name === variant.name);
        if (!v) return item;
        variant = { ...variant, price: v.price, mrp: v.mrp, bulkMinQty: v.bulkMinQty, bulkPrice: v.bulkPrice };
        originalPrice = Number(v.price); mrp = Number(v.mrp);
      } else {
        originalPrice = Number(p.price); mrp = Number(p.mrp);
      }
      return { ...item, originalPrice, price: originalPrice, mrp, bulkMinQty: p.bulkMinQty, bulkPrice: p.bulkPrice, selectedVariant: variant };
    }));
  }

  async function fetchProducts() {
    try {
      const json = await (await fetch(`${API}/products?t=${Date.now()}`)).json();
      const list = json.success && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      if (list.length) {
        cart.latestProducts = {};
        list.forEach((p) => { const id = p._id || p.id; if (id) cart.latestProducts[id] = p; });
        emit('products', cart.latestProducts);
      }
    } catch (e) { console.warn('Failed to pre-fetch products for local caching:', e); }
  }

  function startLiveUpdates() {
    let poll = null;
    const fallback = () => {
      if (poll) return;
      poll = setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        try {
          const json = await (await fetch(`${API}/products?t=${Date.now()}`)).json();
          if (json.success && Array.isArray(json.data)) json.data.forEach((p) => applyProductUpdate({ type: 'update', productId: p._id, product: p }));
        } catch (e) { console.warn('Fallback poll fetch failed:', e); }
      }, 60000);
    };
    try {
      const es = new EventSource(`${API}/products/events`);
      es.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.type !== 'connected') applyProductUpdate(d); } catch (e) { console.error(e); } };
      es.onerror = () => { es.close(); fallback(); };
    } catch (e) { fallback(); }
  }

  function initCart() {
    try {
      const saved = read('drop_cart', []);
      cart.items = recalc((saved || []).map((i) => ({ ...i, cartId: i.cartId || i.id || i._id })), []);
    } catch (e) { console.error('Failed to parse cart from localStorage:', e); }
    cart.loaded = true;
    emit('cart', cart);

    fetch(`${API}/products/groups`).then((r) => r.json()).then((json) => {
      if (json.success && Array.isArray(json.data) && json.data.length) { cart.groups = json.data; setItems(cart.items); }
    }).catch((e) => console.warn('Failed to fetch product groups for cart calculations:', e));

    fetchProducts();
    // Safety refresh every 5 minutes while visible, and when the shopper comes back to the tab
    let last = Date.now();
    const refresh = () => { if (document.visibilityState === 'visible' && Date.now() - last > 60000) { last = Date.now(); fetchProducts(); } };
    setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    startLiveUpdates();
  }

  /* ─── Public settings (Navbar loadSettingsFromDB) ─── */
  const SETTING_KEYS = {
    announcements: 'vaugun_announcements', header_ticker: 'vaugun_header_ticker', invoice_settings: 'vaugun_invoice_settings',
    coupons: 'vaugun_coupons', coupons_enabled: 'vaugun_coupons_enabled', shipping_policy_settings: 'vaugun_shipping_policy_settings',
    returns_settings: 'vaugun_returns_settings', privacy_settings: 'vaugun_privacy_settings', refund_settings: 'vaugun_refund_settings',
    terms_settings: 'vaugun_terms_settings',
  };
  async function syncSettings() {
    try {
      const res = await fetch(`${API}/public/settings?t=${Date.now()}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data || json;
      if (data && data.free_shipping_threshold !== undefined) localStorage.setItem('vaugun_free_shipping_threshold', data.free_shipping_threshold);
      Object.entries(SETTING_KEYS).forEach(([k, storageKey]) => {
        if (data && data[k] !== undefined && (data[k] || k === 'coupons' || k === 'coupons_enabled')) localStorage.setItem(storageKey, JSON.stringify(data[k]));
      });
      window.dispatchEvent(new Event('vaugun_settings_updated'));
    } catch (e) { console.warn('Could not load public settings from DB:', e); }
  }

  /* ─── Meta Pixel (lib/meta-pixel.js, components/MetaPixelTracker.jsx) ─── */
  const UTM_KEY = 'daivika_meta_utm';
  function adParams() {
    try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || localStorage.getItem(UTM_KEY) || '{}'); } catch (e) { return {}; }
  }
  function captureAdParams() {
    try {
      const q = new URLSearchParams(location.search);
      const fbclid = q.get('fbclid'), source = q.get('utm_source'), campaign = q.get('utm_campaign');
      if (!source && !fbclid && !campaign) return;
      const data = JSON.stringify({
        utm_source: source || (fbclid ? 'meta_ads' : 'direct'), utm_medium: q.get('utm_medium') || (fbclid ? 'paid_social' : ''),
        utm_campaign: campaign || (fbclid ? 'meta_ad_traffic' : ''), utm_content: q.get('utm_content') || q.get('utm_ad') || '',
        utm_term: q.get('utm_term') || '', fbclid: fbclid || '', landingPage: location.pathname, referrer: document.referrer || '',
        timestamp: new Date().toISOString(),
      });
      sessionStorage.setItem(UTM_KEY, data);
      localStorage.setItem(UTM_KEY, data);
    } catch (e) { console.warn('Could not capture ad tracking parameters:', e); }
  }
  const STANDARD_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Lead', 'Search', 'AddPaymentInfo', 'CompleteRegistration'];
  function track(eventName, eventData = {}, userData = {}) {
    if (window.fbq) {
      try { window.fbq(STANDARD_EVENTS.includes(eventName) ? 'track' : 'trackCustom', eventName, { currency: 'INR', ...eventData }); } catch (e) { /* non-blocking */ }
    }
    try {
      fetch(`${API}/meta-pixel/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({
          eventName, eventData: { currency: 'INR', ...eventData },
          userData: { ...userData, userAgent: navigator.userAgent, screenResolution: `${screen.width}x${screen.height}`, url: location.href, path: location.pathname },
          adAttribution: adParams(), timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (e) { /* non-blocking */ }
  }
  async function initPixel() {
    try {
      const config = await (await fetch(`${API}/meta-pixel/config?t=${Date.now()}`, { cache: 'no-store' })).json();
      const s = (config && config.data) || config || {};
      const pixelId = String(s.pixelId || config.pixelId || '').trim();
      const active = (s.isActive !== undefined ? s.isActive : config.isActive) !== false;
      if (!pixelId || !active) return;
      if (!window.fbq) {
        /* eslint-disable */
        !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
      }
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
    } catch (e) { console.warn('Meta Pixel initialization check error:', e); }
  }

  /* ─── Image URLs (lib/image-optimizer.js) ─── */
  function safeImage(img) {
    if (!img) return '';
    if (typeof img === 'object') img = img.url || img.src || img.path || '';
    if (!img || typeof img !== 'string') return '';
    let clean = img.trim();
    if (clean.includes('localhost:') || clean.includes('127.0.0.1:')) {
      try { const u = new URL(clean); clean = u.pathname + u.search; } catch (e) {
        const i = clean.indexOf('/', clean.indexOf('://') + 3);
        if (i !== -1) clean = clean.slice(i);
      }
    }
    if (/^(https?:|data:)/.test(clean) || clean.startsWith('/')) return clean;
    if (clean.startsWith('uploads/')) return `/${clean}`;
    return `/uploads/${clean}`;
  }
  const IMAGE_WIDTHS = [160, 320, 480, 640, 960, 1280];
  function optimizedImage(url, width) {
    const safe = safeImage(url);
    const cld = safe.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!(?:[a-z]_[^/,]+,?)+\/)(.*)$/i);
    const pick = () => IMAGE_WIDTHS.find((x) => x >= width) || IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
    if (cld) return `${cld[1]}f_auto,q_auto${width ? `,c_limit,w_${pick()}` : ''}/${cld[2]}`;
    if (!width || !safe.startsWith('/api/images/') || safe.includes('?')) return safe;
    return `${safe}?w=${pick()}`;
  }

  /* ─── Toasts ─── */
  function toast(message, type = 'success') {
    window.dispatchEvent(new CustomEvent('show_toast', { detail: { message, type } }));
  }

  /* ─── Page behaviour from the store layout ─── */
  // Every page opens at the top, also when coming back with the browser's Back button (ScrollToTop)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 100);

  // Theme colours the store layout forces, and the cursor-following highlight (.app-container::after)
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--color-primary', '#0a0a0a');
  rootStyle.setProperty('--color-primary-rgb', '6, 36, 30');
  rootStyle.setProperty('--color-accent', '#0a0a0a');
  rootStyle.setProperty('--color-accent-hover', '#0a0a0a');
  localStorage.removeItem('vaugun_theme_settings');
  localStorage.setItem('vaugun_store_gender', 'all');
  window.addEventListener('mousemove', (e) => {
    rootStyle.setProperty('--mouse-x', `${(e.clientX / innerWidth) * 100}%`);
    rootStyle.setProperty('--mouse-y', `${(e.clientY / innerHeight) * 100}%`);
  });

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => Number(n || 0).toLocaleString('en-IN');

  window.Daivika = { API, auth, cart, on, emit, toast, track, read, syncSettings, safeImage, optimizedImage, esc, inr };

  initCart();
  loadUser();
  syncSettings();
  captureAdParams();
  initPixel();
  track('PageView', { page_title: document.title, page_location: location.href, page_path: location.pathname });
})();
