// Order tracking (app/(store)/order-tracking/page.jsx): finds an order saved in this browser, or asks the
// server with the order reference and the mobile number on the order, and shows its progress.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const T = window.DaivikaTracking;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const icon = (name, size, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${ICONS[name].cls}" aria-hidden="true">${ICONS[name].inner}</svg>`;
  const form = document.querySelector('[data-track-form]');
  const submit = form.querySelector('[data-track-submit]');
  const error = document.querySelector('[data-track-error]');
  const result = document.querySelector('[data-track-result]');
  const recent = document.querySelector('[data-track-recent]');
  const orders = (() => { const o = D.read('vaugun_orders', []); return Array.isArray(o) ? o : []; })();

  const progress = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('complete')) return 3;
    if (s.includes('ship') || s.includes('transit') || s.includes('dispatch')) return 2;
    return 1;
  };

  function showResult(order, ref) {
    const p = progress(order && order.status);
    const dot = (bg, fg, mark) => `<div style="position:absolute;left:-35px;top:2px;width:24px;height:24px;border-radius: 50%;background-color:${bg};display:flex;align-items:center;justify-content:center;z-index:2;color:${fg};font-size:0.75rem;font-weight:900">${mark}</div>`;
    const step = (title, desc, note, noteColor, dotHtml, extra = '') => `<div style="position:relative${extra}">${dotHtml}
      <h4 style="margin:0 0 0.3rem 0;font-size:1.05rem;font-weight:800;color:#0f172a">${esc(title)}</h4>
      <p style="margin:0;font-size:0.9rem;color:#64748b;line-height:1.6">${esc(desc)}</p>
      <div style="font-size:0.75rem;color:${noteColor};margin-top:0.35rem;font-weight:700">${note}</div></div>`;
    const items = order && order.itemsList && order.itemsList.length ? `<div style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #f1f5f9">
      <h5 style="font-size:0.85rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">Items in Parcel</h5>
      <div style="display:flex;flex-direction:column;gap:0.75rem">${order.itemsList.map((item) => {
        const free = item.isFreeGift || item.price === 0;
        const giftTag = item.isFreeGift || (item.price === 0 && ((item.name || '').toLowerCase().includes('gift') || (item.productId || '').includes('gift')));
        const img = typeof item.image === 'string' ? item.image : ((item.image && item.image.url) || '/logo.png');
        return `<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background-color:#f8fafc;border-radius:12px">
          <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;background-color:#ffffff"><img src="${esc(img)}" alt="${esc(item.name)}" style="width:100%;height:100%;object-fit:cover"></div>
          <div style="flex:1"><h6 style="margin:0;font-size:0.9rem;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap">${giftTag ? '<span style="background-color:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:1px 6px;border-radius:4px;font-size:0.68rem;font-weight:800">🎁 FREE GIFT</span>' : ''}${esc(item.name)}</h6>
          <p style="margin:0;font-size:0.78rem;color:#64748b">Qty: ${esc(item.qty)} ${item.size ? `• Size: ${esc(item.size)}` : ''} ${item.color ? `• Color: ${esc(item.color)}` : ''}</p></div>
          <div style="font-weight:800;font-size:0.9rem;color:${free ? '#059669' : '#0f172a'}">${free ? 'FREE (₹0)' : `₹${esc(item.price)}`}</div>
        </div>`;
      }).join('')}</div></div>` : '';

    result.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #f1f5f9">
        <div>
          <span style="font-size:0.75rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px">Order Reference</span>
          <h3 style="margin:0.2rem 0 0 0;font-size:1.4rem;font-weight:800;color:#0f172a">#${esc((order && (order.orderNumber || order._id)) || ref.toUpperCase())}</h3>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <span style="padding:0.4rem 1rem;border-radius:50px;background-color:#fce7eb;color:#360910;font-size:0.85rem;font-weight:800;border:1px solid #f8b4c0">${esc((order && order.status) || 'Processing')}</span>
          ${order && order.total ? `<span style="font-size:1.1rem;font-weight:800;color:#0f172a">₹${esc(order.total)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:2rem;position:relative;padding-left:2.5rem">
        <div style="position:absolute;left:15px;top:15px;bottom:15px;width:2px;background-color:#e2e8f0;z-index:1"></div>
        ${step(T.step1Title, T.step1Desc, 'Confirmed &amp; Processed', '#16a34a', dot('#16a34a', '#fff', '✓'))}
        ${step(T.step2Title, T.step2Desc, p >= 2 ? 'In Transit with Express Courier' : 'Preparing for Dispatch', p >= 2 ? '#360910' : '#94a3b8', dot(p >= 2 ? '#360910' : '#cbd5e1', '#fff', p >= 2 ? '✓' : '•'))}
        ${step(T.step3Title, T.step3Desc, p >= 3 ? 'Delivered' : 'Pending Final Delivery', '#94a3b8', dot(p >= 3 ? '#16a34a' : '#e2e8f0', p >= 3 ? '#fff' : '#94a3b8', p >= 3 ? '✓' : '•'), `;opacity:${p >= 3 ? 1 : 0.6}`)}
      </div>${items}`;
    result.hidden = false;
    animate(result, { opacity: [0, 1], y: [15, 0] }, { duration: 0.4 });
  }

  function setLoading(on) {
    submit.disabled = on;
    submit.textContent = on ? 'Locating Package...' : 'Track Package';
    if (on) result.hidden = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ref = form.ref.value.trim();
    if (!ref) return;
    setLoading(true);
    error.hidden = true;
    const lower = ref.toLowerCase();
    const digits = ref.replace(/\D/g, '');
    const local = orders.find((o) => (o._id && o._id.toLowerCase() === lower)
      || (o.orderNumber && o.orderNumber.toLowerCase() === lower)
      || (o.invoiceNumber && o.invoiceNumber.toLowerCase() === lower)
      || (digits.length >= 10 && o.phone && o.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
      || (o.email && o.email.toLowerCase() === lower));
    if (local) { setLoading(false); showResult(local, ref); return; }

    const phone = form.phone.value.replace(/\D/g, '').slice(-10);
    const fail = (msg) => { error.textContent = msg; error.hidden = false; };
    if (phone.length !== 10) { setLoading(false); fail('Enter the 10-digit mobile number you used when placing the order.'); return; }
    try {
      const res = await fetch(`${D.API}/orders/track?ref=${encodeURIComponent(ref)}&phone=${phone}`);
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (res.ok && json.success && json.data) showResult(json.data, ref);
      else fail(json.message || 'No order found with these details. Please check your order ID and mobile number.');
    } catch (err) {
      setLoading(false);
      fail('Could not reach the server. Please check your connection and try again.');
    }
  });

  // Orders placed in this browser
  if (orders.length) {
    recent.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h3 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:0.6rem">${icon('shopping-bag', 20, '#360910')} Your Recent Orders</h3>
        <span style="font-size:0.8rem;color:#64748b;font-weight:600">${orders.length} Order(s) Saved</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem">${orders.slice(0, 5).map((o, i) => `
        <div class="dv-track-order" data-order="${i}" style="padding:1.1rem 1.25rem;border-radius:16px;cursor:pointer;transition:all 0.2s ease;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.25rem">
              <span style="font-size:0.92rem;font-weight:800;color:#0f172a">Order #${esc(o.orderNumber || o._id)}</span>
              <span style="padding:0.2rem 0.6rem;border-radius:50px;background-color:#fce7eb;color:#360910;font-size:0.72rem;font-weight:700">${esc(o.status || 'Processing')}</span>
            </div>
            <div style="font-size:0.78rem;color:#64748b;display:flex;align-items:center;gap:0.5rem">${icon('clock', 13, '#94a3b8')}<span>${esc(o.date || 'Recent')}</span><span>•</span><span>${(o.itemsList && o.itemsList.length) || 1} Item(s)</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="text-align:right">
              <div style="font-size:1rem;font-weight:800;color:#0f172a">₹${esc(o.total)}</div>
              <div style="font-size:0.72rem;color:#16a34a;font-weight:700">${esc(o.paymentMethod || 'COD')}</div>
            </div>
            ${icon('arrow-right', 18, '#360910')}
          </div>
        </div>`).join('')}</div>`;
    recent.hidden = false;
    recent.style.opacity = 0;
    animate(recent, { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, delay: 0.2 });
    recent.addEventListener('click', (e) => {
      const row = e.target.closest('[data-order]');
      if (!row) return;
      const order = orders[Number(row.dataset.order)];
      form.ref.value = order._id;
      showResult(order, order._id);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    });
  }
})();
