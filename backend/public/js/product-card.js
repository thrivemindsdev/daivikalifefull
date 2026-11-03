// Product card (components/ProductCard.jsx). Daivika.productCards.render(container, products, options)
// draws the cards and keeps them in step with the live catalogue, the cart and the wishlist.
(function () {
  const D = window.Daivika;
  const ICONS = window.DaivikaIcons || {};
  const svg = (name, size, { color = 'currentColor', fill = 'none', stroke = 2, style = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f1f5f9'/%3E%3Crect x='100' y='80' width='100' height='80' rx='8' fill='%23cbd5e1'/%3E%3Crect x='80' y='175' width='140' height='12' rx='6' fill='%23cbd5e1'/%3E%3Crect x='110' y='198' width='80' height='10' rx='5' fill='%23e2e8f0'/%3E%3C/svg%3E";
  const DEFAULT_COUPONS = [
    { code: 'DAIVIKA10', discountType: 'percentage', discountValue: 10 },
    { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20 },
    { code: 'FLAT20', discountType: 'percentage', discountValue: 20 },
    { code: 'KERALA500', discountType: 'fixed', discountValue: 500 },
  ];
  const lc = (s) => String(s || '').toLowerCase();
  const ratings = {};
  const cards = new Set();

  function coupons() {
    const saved = D.read('vaugun_coupons', null);
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_COUPONS;
  }

  // Which variant / colour / texture a card shows: the filtered size, else the first in-stock combination
  function selection(product, activeSize) {
    const variants = product.variants || [];
    const colors = product.colors || [];
    let v = 0;
    if (activeSize && activeSize !== 'all') {
      const i = variants.findIndex((x) => lc(x.name) === lc(activeSize));
      if (i !== -1) v = i;
    }
    let c = 0;
    const inv = product.inventory || [];
    if (inv.length) {
      const v0 = variants[0];
      const v0Colors = v0 && v0.colors && v0.colors.length ? colors.filter((x) => v0.colors.includes(x.name)) : colors;
      const def = inv.find((i) => lc(i.variant) === lc(v0 ? v0.name : '') && lc(i.color) === lc(v0Colors[0] ? v0Colors[0].name : ''));
      if (def && def.stock <= 0) {
        outer: for (let vi = 0; vi < Math.max(variants.length, 1); vi++) {
          const variant = variants[vi];
          const vColors = variant && variant.colors && variant.colors.length ? colors.filter((x) => variant.colors.includes(x.name)) : colors;
          if (vColors.length) {
            for (let ci = 0; ci < vColors.length; ci++) {
              const found = inv.find((i) => lc(i.variant) === lc(variant ? variant.name : '') && lc(i.color) === lc(vColors[ci].name));
              if (found && found.stock > 0) { v = vi; c = ci; break outer; }
            }
          } else {
            const found = inv.find((i) => lc(i.variant) === lc(variant ? variant.name : ''));
            if (found && found.stock > 0) { v = vi; break; }
          }
        }
      }
    }
    const variant = variants.length ? variants[v] : null;
    const pick = (list) => (variant && variant.colors && variant.colors.length ? list.filter((x) => variant.colors.includes(x.name)) : list);
    const activeColors = pick(colors);
    const activeTextures = pick(product.textures || []);
    const color = activeColors.length ? activeColors[c] : null;
    const texture = !activeColors.length && activeTextures.length ? activeTextures[0] : null;
    return { variant, color, texture };
  }

  function stockOf(product, { variant, color, texture }) {
    const inv = product.inventory || [];
    if (!inv.length) return 50;
    const colour = texture ? texture.name : (color ? color.name : '');
    const found = inv.find((i) => lc(i.variant) === lc(variant ? variant.name : '') && lc(i.color) === lc(colour));
    return found ? found.stock : (inv.length > 1 ? 0 : (inv[0].stock ?? 50));
  }

  function loadRating(id, card) {
    if (ratings[id]) return;
    ratings[id] = { rating: 0, count: 0 };
    fetch(`${D.API}/reviews?productId=${id}`).then((r) => r.json().then((j) => ({ ok: r.ok, j }))).then(({ ok, j }) => {
      const list = ok && j.success ? (j.data || []) : (Array.isArray(j) ? j : []);
      if (list.length) ratings[id] = { rating: list.reduce((s, r) => s + r.rating, 0) / list.length, count: list.length };
      cards.forEach((c) => { if (c.id === id) draw(c); });
    }).catch(() => {});
  }

  function draw(card) {
    const base = card.product;
    const product = D.cart.latestProducts[card.id] || base;
    const sel = selection(product, card.activeSize);
    const { variant, color, texture } = sel;
    let cartId = card.id;
    if (variant) cartId += `-${variant.name}`;
    if (color) cartId += `-${color.name}`;
    if (texture) cartId += `-${texture.name}`;
    const inCart = D.cart.items.find((i) => i.cartId === cartId);
    const quantity = inCart ? inCart.quantity : 0;
    const price = Number(variant ? variant.price : product.price);
    const mrp = Number(variant ? variant.mrp : product.mrp);
    const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const href = `/product/${card.id}${variant ? `?size=${encodeURIComponent(variant.name)}` : ''}`;
    const favorited = D.wishlist.has(card.id);

    const rating = product.ratingInfo || ratings[card.id] || { rating: 0, count: 0 };
    if (!product.ratingInfo) loadRating(card.id, card);
    const count = Number(rating.count) || 0;
    const reviews = count >= 1000 ? `${(count / 1000).toFixed(1)}K Reviews` : `${count} ${count === 1 ? 'Review' : 'Reviews'}`;

    const benefit = product.subtitle || (Array.isArray(product.highlights) && product.highlights[0]
      ? (typeof product.highlights[0] === 'string' ? product.highlights[0] : product.highlights[0].title)
      : (product.category ? product.category.toUpperCase() : 'Premium Quality'));

    // The coupon list is read once, when the card is created (React reads it on mount only)
    const list = card.coupons;
    const matching = list.filter((c) => c && c.code && (!c.category || c.category === 'all' || !product.category || lc(c.category).trim() === lc(product.category).trim()));
    const eligible = matching.length ? matching : list;
    const hash = String(card.id || 'daivika').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const coupon = eligible[hash % eligible.length] || eligible[0];
    let off = 0;
    if (coupon && coupon.discountType === 'fixed') off = Math.min(Math.round(price * 0.5), Number(coupon.discountValue) || 50);
    else if (coupon) off = Math.round((price * (Number(coupon.discountValue) || 10)) / 100);
    const withCoupon = Math.max(1, price - off);

    const rawImage = (texture && texture.image) || (color && color.image) || product.image || (Array.isArray(product.images) && product.images[0]);
    let image = FALLBACK;
    const raw = rawImage && typeof rawImage === 'object' ? (rawImage.url || rawImage.src || rawImage.path) : rawImage;
    if (raw && typeof raw === 'string' && D.safeImage(raw)) image = D.optimizedImage(D.safeImage(raw), 450);

    const stock = stockOf(product, sel);
    const esc = D.esc;
    const action = quantity > 0
      ? `<div style="display:flex;align-items:center;gap:0.35rem;width:100%"><div style="display:flex;align-items:center;justify-content:space-between;background-color:#FFC20E;color:#111827;border-radius:100px;padding:0.35rem 0.6rem;box-sizing:border-box;flex:1;box-shadow:0 4px 12px rgba(255, 194, 14, 0.35)">
          <button type="button" data-pc="dec" style="background:none;border:none;color:#111827;cursor:pointer;padding:0.15rem;display:flex;align-items:center;outline:none">${svg('minus', 13, { stroke: 3 })}</button>
          <span style="font-size:0.75rem;font-weight:800">${quantity} in Cart</span>
          <button type="button" data-pc="inc" style="background:none;border:none;color:#111827;cursor:pointer;padding:0.15rem;display:flex;align-items:center;outline:none">${svg('plus', 13, { stroke: 3 })}</button>
        </div></div>`
      : stock === 0
        ? '<button type="button" disabled class="dv-pc-btn" style="width:100%;display:flex;align-items:center;justify-content:center;background-color:#f1f5f9;color:#94a3b8;border-radius:100px;border:none;cursor:not-allowed;font-size:0.74rem;font-weight:800;outline:none">OUT OF STOCK</button>'
        : `<button type="button" data-pc="inc" class="dv-pc-btn dv-pc-add" style="width:100%;display:flex;align-items:center;justify-content:center;gap:0.35rem;color:#111827;border-radius:100px;border:none;cursor:pointer;font-weight:800;letter-spacing:0.4px;transition:all 0.15s ease;outline:none">${svg('shopping-bag', 14, { color: '#111827', stroke: 2.5 })}ADD TO CART</button>`;

    card.el.innerHTML = `
      <a href="${href}" class="product-card-image-link" style="display:block;position:relative;aspect-ratio:1 / 1;width:100%;background-color:#f8fafc;border-radius:12px;overflow:hidden">
        <img src="${esc(image)}" alt="${esc(product.name)} - DAIVIKA" width="300" height="300" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block;image-rendering:-webkit-optimize-contrast;transform:translateZ(0);backface-visibility:hidden" onerror="this.onerror=null;this.src=&quot;${FALLBACK}&quot;">
        ${product.badge || discount > 0 ? `<div class="dv-pc-badge" style="position:absolute;top:8px;left:8px;background-color:${esc(product.badgeBg || '#FEF3C7')};color:${esc(product.badgeColor || '#92400e')};font-weight:800;padding:0.2rem 0.55rem;border-radius:6px;box-shadow:0 2px 8px rgba(0, 0, 0, 0.08);border:${product.badgeBg ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(251, 191, 36, 0.4)'};z-index:4;letter-spacing:0.2px;text-transform:uppercase;pointer-events:none">${esc(product.badge || (discount > 0 ? `${discount}% OFF` : 'Best Seller'))}</div>` : ''}
        <button type="button" data-pc="wish" style="position:absolute;top:8px;right:8px;background:rgba(255, 255, 255, 0.92);backdrop-filter:blur(6px);border:none;cursor:pointer;padding:0.35rem;border-radius: 50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0, 0, 0, 0.08);color:${favorited ? '#ef4444' : '#94a3b8'};z-index:4;outline:none">${svg('heart', 14, { fill: favorited ? '#ef4444' : 'none', stroke: favorited ? 0 : 2 })}</button>
      </a>
      <div style="padding:0.5rem 0.15rem 0.15rem 0.15rem;display:flex;flex-direction:column;flex:1;justify-content:space-between">
        <div>
          ${count > 0 ? `<div style="display:flex;align-items:center;gap:0.25rem;margin-bottom:0.25rem;flex-wrap:nowrap;overflow:hidden">
            <span class="dv-pc-rating" style="display:inline-flex;align-items:center;gap:2px;color:#059669;font-weight:800">${svg('star', 11, { color: '#059669', fill: '#059669', stroke: 0 })}${(Number(rating.rating) || 0).toFixed(1)}</span>
            <span style="font-size:0.7rem;color:#cbd5e1;margin:0 2px">|</span>
            <span class="dv-pc-reviews" style="font-weight:500;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${reviews}</span>
          </div>` : ''}
          <a href="${href}" style="text-decoration:none;color:inherit;display:block;margin-bottom:0.2rem"><h3 class="dv-pc-name" style="font-weight:800;color:#0f172a;margin:0;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word">${esc(product.name)}</h3></a>
          <p class="dv-pc-benefit" style="color:#64748b;margin:0 0 0.35rem 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2">${esc(benefit)}</p>
          <div style="display:flex;align-items:baseline;gap:0.35rem;margin-bottom:0.2rem;flex-wrap:wrap">
            <span class="dv-pc-price" style="font-weight:900;color:#0f172a;line-height:1">₹${D.inr(price)}</span>
            ${mrp && mrp > price ? `<span class="dv-pc-mrp" style="font-weight:500;color:#94a3b8;text-decoration:line-through;line-height:1">₹${D.inr(mrp)}</span>` : ''}
            ${discount > 0 ? `<span class="dv-pc-off" style="font-weight:800;color:#059669;background-color:#e6f9f0;padding:1px 5px;border-radius:4px;line-height:1">${discount}% OFF</span>` : ''}
          </div>
          ${coupon ? `<div class="dv-pc-coupon" style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#059669;background-color:#ecfdf5;border:1px dashed #a7f3d0;padding:2px 6px;border-radius:6px;margin-bottom:0.45rem;max-width:100%;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${svg('tag', 11, { color: '#059669', stroke: 2.5, style: 'flex-shrink:0' })}<span style="overflow:hidden;text-overflow:ellipsis">Get it for ₹${D.inr(withCoupon)} with <strong style="color:#047857;letter-spacing:0.2px;text-transform:uppercase">${esc(coupon.code)}</strong></span></div>` : ''}
        </div>
        <div style="margin-top:auto;width:100%">${action}</div>
      </div>`;
    card.state = { product, sel, cartId, quantity };
  }

  function onClick(e) {
    const btn = e.target.closest('[data-pc]');
    if (!btn) return;
    const card = [...cards].find((c) => c.el.contains(btn));
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    const { product, sel, cartId, quantity } = card.state;
    if (btn.dataset.pc === 'wish') D.wishlist.toggle(product);
    else if (btn.dataset.pc === 'dec') { if (quantity > 1) D.cart.updateQuantity(cartId, -1); else D.cart.remove(cartId); }
    else if (quantity > 0) D.cart.updateQuantity(cartId, 1);
    else {
      D.cart.add(product, 1, sel.variant, sel.color, sel.texture);
      D.cart.open();
      D.toast(`Added ${product.name || 'item'} to cart! 🛍️`);
    }
  }

  const redrawAll = () => cards.forEach((c) => { if (c.el.isConnected) draw(c); else cards.delete(c); });
  D.on('cart', redrawAll);
  D.on('wishlist', redrawAll);
  D.on('products', redrawAll);

  // Returns the card element; the caller places it in the page
  function create(product, options = {}) {
    const id = product && (product.id || product._id);
    if (!id) return null;
    const el = document.createElement('div');
    el.className = 'product-card-item dv-pc';
    el.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;height:100%;width:100%;max-width:100%;min-width:0;box-sizing:border-box;position:relative;background-color:#ffffff;border-radius:16px;border:1px solid #f1f5f9;transition:transform 0.25s ease, box-shadow 0.25s ease';
    el.addEventListener('click', onClick);
    const card = { el, id, product, activeSize: options.activeSize, coupons: coupons() };
    cards.add(card);
    draw(card);
    return el;
  }

  D.productCards = { create };
})();
