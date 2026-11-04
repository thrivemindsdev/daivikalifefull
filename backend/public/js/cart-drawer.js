// Cart drawer (components/CartDrawer.jsx). Items keep their element while the drawer is open, so only
// newly added items play the entrance animation, as with React keys.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const ICONS = window.DaivikaIcons || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const icon = (name, size, stroke = 2) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true">${i.inner}</svg>`;
  };

  const root = $('[data-cart]');
  const overlay = $('[data-cart-overlay]', root);
  const panel = $('[data-cart-panel]', root);
  const list = $('[data-cart-items]', root);
  const footer = $('[data-cart-footer]', root);
  const countBadge = $('[data-cart-count]', root);
  const SPRING = { type: 'spring', damping: 28, stiffness: 260 };
  let open = false;
  let nodes = new Map();

  const img = (item) => `src="${D.esc(D.optimizedImage(item.image || '/logo.png', 150))}" alt="${D.esc(item.name)}" onerror="this.onerror=null;this.src='/logo.png'"`;
  const qtyBtn = (key, delta, label) => `<button type="button" data-qty="${delta}" data-key="${D.esc(key)}" aria-label="${label}" style="width:25px;height:25px;min-width:25px;border-radius: 50%;background:linear-gradient(135deg, #fff 0%, #fef3c7 100%);border:1px solid rgba(197,131,26,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#360910;box-shadow:0 1px 3px rgba(54,9,16,0.12);outline:none;padding:0">${icon(delta < 0 ? 'minus' : 'plus', 10, 2.5)}</button>`;
  const corner = (pos) => `<span style="position:absolute;${pos};font-size:0.62rem;color:#c5831a;line-height:1;z-index:2">✦</span>`;

  function itemHtml(item, key) {
    if (item.isFreeGift) {
      return `<div style="position:relative;width:68px;height:68px;flex-shrink:0">
          <img ${img(item)} style="width:100%;height:100%;border-radius:10px;object-fit:cover;border:1px solid #a7f3d0">
          <div style="position:absolute;bottom:-4px;right:-4px;background-color:#10b981;color:#fff;border-radius: 50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center">${icon('sparkles', 10)}</div>
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0.22rem">
          <div style="display:inline-flex;align-items:center;gap:0.3rem;background-color:#10b981;color:#fff;font-size:0.58rem;font-weight:800;padding:2px 7px;border-radius:100px;letter-spacing:0.4px;text-transform:uppercase;width:fit-content">${icon('gift', 9)} FREE GIFT</div>
          <div style="font-size:0.8rem;font-weight:800;color:#065f46;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${D.esc(item.name.replace(/\(Free Gift.*?\)/i, '').trim())}</div>
          <div style="font-size:0.64rem;color:#047857">🎁 Unlocked with: ${D.esc(item.parentProductName || 'Selected Product')}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.2rem">
            <span style="font-size:0.82rem;font-weight:900;color:#059669">FREE (₹0)</span>
            <button type="button" data-remove="${D.esc(key)}" style="color:#9ca3af;font-size:0.66rem;background:none;border:none;cursor:pointer;outline:none">Remove</button>
          </div>
        </div>`;
    }
    const colour = item.selectedColor, texture = item.selectedTexture, variant = item.selectedVariant;
    const options = colour || texture || variant ? `<div style="display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;margin-top:1px">
        ${colour ? `<div title="Color: ${D.esc(colour.name)}" style="width:11px;height:11px;border-radius: 50%;background-color:${D.esc(colour.code || '#ccc')};border:1px solid rgba(197,131,26,0.5)"></div>` : ''}
        ${variant ? `<span style="font-size:0.58rem;font-weight:700;color:#54111c;background:rgba(197,131,26,0.12);padding:1px 5px;border-radius:3px;border:1px solid rgba(197,131,26,0.25)">${D.esc(variant.name)}</span>` : ''}
        ${colour || texture ? `<span style="font-size:0.6rem;color:#7c4f2f;font-weight:600">${D.esc(colour ? colour.name : texture.name)}</span>` : ''}
      </div>` : '';
    return `<div style="position:absolute;bottom:-10px;right:-6px;font-size:3.5rem;color:rgba(197,131,26,0.06);line-height:1;user-select:none;pointer-events:none;font-family:serif">❁</div>
      <div style="position:relative;width:74px;height:74px;flex-shrink:0">
        ${corner('top:-3px;left:-3px')}${corner('top:-3px;right:-3px')}${corner('bottom:-3px;left:-3px')}${corner('bottom:-3px;right:-3px')}
        <img ${img(item)} style="width:100%;height:100%;border-radius:10px;object-fit:cover;border:2px solid rgba(197,131,26,0.5);box-shadow:0 3px 10px rgba(54,9,16,0.12)">
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0.14rem">
        <span style="font-size:0.56rem;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:#7c2d12;background:linear-gradient(90deg, rgba(252,211,77,0.25), rgba(197,131,26,0.15));border:1px solid rgba(197,131,26,0.35);padding:1px 6px;border-radius:3px;width:fit-content;display:inline-flex;align-items:center;gap:3px">🪔 Sanctified</span>
        <div style="font-size:0.85rem;font-weight:800;color:#1e0608;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;margin-top:1px">${D.esc(item.name.split(' (')[0])}</div>
        ${options}
        <div style="font-size:0.94rem;font-weight:900;color:#360910;margin-top:2px">₹${D.inr(item.price)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.35rem">
          <div style="display:inline-flex;align-items:center;background:linear-gradient(135deg, #fdf3d8 0%, #fce7a0 100%);border:1.5px solid rgba(197,131,26,0.55);border-radius:100px;padding:2px;gap:2px;box-shadow:inset 0 1px 2px rgba(54,9,16,0.08)">
            ${qtyBtn(key, -1, 'Decrease quantity')}
            <span style="padding:0 0.5rem;font-size:0.8rem;font-weight:900;color:#360910;min-width:20px;text-align:center">${item.quantity}</span>
            ${qtyBtn(key, 1, 'Increase quantity')}
          </div>
          <button type="button" class="dv-cart-remove" data-remove="${D.esc(key)}" style="font-size:0.68rem;font-weight:700;border:none;cursor:pointer;padding:0.2rem 0.5rem;border-radius:5px;outline:none;transition:all 0.2s">Remove</button>
        </div>
      </div>`;
  }

  const GIFT_STYLE = 'display:flex;gap:0.85rem;padding:0.85rem;border-radius:14px;background:linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);border:1.5px dashed #10b981;box-sizing:border-box;transition:transform 0.3s ease';
  const ITEM_STYLE = 'display:flex;gap:0.85rem;padding:0.9rem;border-radius:16px;background:linear-gradient(145deg, #fffdf5 0%, #fdf3d8 100%);border:1.5px solid rgba(197,131,26,0.42);border-top:3px solid #c5831a;box-shadow:0 4px 16px rgba(54,9,16,0.05), inset 0 1px 0 rgba(255,255,255,0.9);transition:all 0.3s ease;box-sizing:border-box;position:relative;overflow:hidden';

  function render(fresh) {
    const items = D.cart.items;
    const count = items.reduce((a, c) => a + c.quantity, 0);
    countBadge.hidden = items.length === 0;
    countBadge.textContent = `${count} items`;
    footer.hidden = items.length === 0;
    $('[data-cart-total]', root).textContent = `₹${D.inr(D.cart.total())}`;

    if (!items.length) {
      nodes = new Map();
      list.innerHTML = '';
      list.appendChild($('[data-cart-empty]', root).content.cloneNode(true));
      return;
    }
    if (fresh || !nodes.size) { nodes = new Map(); list.innerHTML = ''; }
    const next = new Map();
    items.forEach((item, index) => {
      const key = item.cartId || item.id || item._id;
      let node = nodes.get(key);
      if (!node) {
        node = document.createElement('div');
        node.className = item.isFreeGift ? 'dv-cart-gift' : 'dv-cart-item';
        node.style.cssText = item.isFreeGift ? GIFT_STYLE : ITEM_STYLE;
        node.style.opacity = '0';
        animate(node, { opacity: [0, 1], y: [10, 0] }, { delay: index * (item.isFreeGift ? 0.06 : 0.07) })
          .then(() => { node.style.transform = ''; });
      }
      node.innerHTML = itemHtml(item, key);
      next.set(key, node);
      list.appendChild(node);
    });
    nodes.forEach((node, key) => { if (!next.has(key)) node.remove(); });
    nodes = next;
  }

  let shimmer = null;
  function setOpen(value) {
    if (value === open) return;
    open = value;
    document.body.style.overflow = open ? 'hidden' : 'auto';
    if (open) {
      root.hidden = false;
      render(true);
      animate(overlay, { opacity: [0, 1] });
      animate(panel, { x: ['110%', 0], opacity: [0.8, 1] }, SPRING);
      shimmer = animate($('[data-cart-shimmer]', root), { x: ['-100%', '200%'] }, { duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 });
    } else {
      animate(overlay, { opacity: 0 });
      animate(panel, { x: '110%', opacity: 0.8 }, SPRING).then(() => {
        if (open) return;
        root.hidden = true;
        if (shimmer) shimmer.stop();
      });
    }
  }

  D.on('cart', (cart) => {
    if (cart.isOpen !== open) setOpen(cart.isOpen);
    else if (open) render(false);
  });
  overlay.addEventListener('click', () => D.cart.close());
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cart-close],[data-cart-checkout],[data-remove],[data-qty]');
    if (!btn) return;
    if (btn.hasAttribute('data-cart-close')) D.cart.close();
    else if (btn.hasAttribute('data-cart-checkout')) { D.cart.close(); window.location.href = '/checkout'; }
    else if (btn.dataset.remove) D.cart.remove(btn.dataset.remove);
    else D.cart.updateQuantity(btn.dataset.key, Number(btn.dataset.qty));
  });
  document.body.style.overflow = 'auto';
})();
