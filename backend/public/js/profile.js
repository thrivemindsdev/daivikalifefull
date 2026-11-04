// Profile page (app/(store)/profile/page.jsx): account settings, orders with reviews and invoices, saved
// addresses, wishlist and password. Guests see the "My Orders" login card.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const G = window.DaivikaGeo;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const root = document.querySelector('[data-profile]');
  const fileInput = document.querySelector('[data-profile-file]');
  const svg = (name, size, { color = 'currentColor', fill = 'none', style = '', cls = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}${cls ? ' ' + cls : ''}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const OPACITY = { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] };
  const SPRING = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 };
  const SCALE = { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 };
  // framer-motion defaults: opacity tweens, x / y spring, scale a stiffer spring
  function framer(el, values) {
    return Promise.all(Object.entries(values).map(([k, v]) => animate(el, { [k]: v }, k === 'opacity' ? OPACITY : k === 'scale' ? SCALE : SPRING)));
  }
  const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

  const s = {
    tab: 'profile', mobileView: 'menu', uploading: false, message: { type: '', text: '' },
    search: '', statusFilter: 'All', filterOpen: false, ratings: {},
    profileName: '', currentPassword: '', newPassword: '',
    orders: [], selectedOrder: null,
    addresses: [], showAddrForm: false, editingId: null, addrForm: null, stateOpen: false, stateSearch: '', addrError: '',
  };
  const user = () => D.auth.user;
  const isMobile = () => innerWidth < 768;

  // ?tab= opens a section (and the content view on phones)
  const tabParam = new URLSearchParams(location.search).get('tab');
  if (tabParam && ['profile', 'orders', 'wishlist', 'security', 'addresses'].includes(tabParam)) {
    s.tab = tabParam;
    if (innerWidth < 768) s.mobileView = 'content';
  }

  /* ─── Saved addresses (localStorage, plus addresses from past orders) ─── */
  function addrKeys() {
    const u = user();
    if (!u) return [];
    const keys = [];
    if (u.email) { keys.push(`daivika_addresses_${u.email}`); keys.push(`daivika_addresses_${u.email.toLowerCase()}`); }
    if (u.phone) keys.push(`daivika_addresses_${u.phone}`);
    if (u._id || u.id) keys.push(`daivika_addresses_${u._id || u.id}`);
    return Array.from(new Set(keys));
  }
  function loadAddresses() {
    const u = user();
    if (!u) return [];
    let all = [];
    addrKeys().forEach((k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); if (Array.isArray(v)) all = [...all, ...v]; } catch (e) { console.error(e); } });
    try {
      const orders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
      orders.filter((o) => (u.email && (o.email || '').toLowerCase() === u.email.toLowerCase()) || (u.phone && o.phone === u.phone) || (u._id && o.userId === u._id)).forEach((o) => {
        if (!(o.address && (o.address.street || o.address.addressLine1 || o.address.city))) return;
        const street = o.address.street || o.address.addressLine1 || '', city = o.address.city || '';
        if (!(street || city)) return;
        const parts = (o.user || '').trim().split(' ');
        all.push({ id: `order_addr_${o._id || Date.now()}`, label: 'Checkout Address', firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '', phone: o.phone || u.phone || '', email: o.email || u.email || '', street, city, state: o.address.state || '', pincode: o.address.pincode || o.address.zipCode || '', isDefault: false });
      });
    } catch (e) { console.error('Error extracting addresses from orders:', e); }
    const unique = new Map();
    all.forEach((a) => { const k = `${String(a.street || '').trim().toLowerCase()}_${String(a.city || '').trim().toLowerCase()}_${String(a.pincode || '').trim()}`; if (!unique.has(k)) unique.set(k, a); });
    return Array.from(unique.values());
  }
  function saveAddresses(list) {
    if (!user()) return;
    addrKeys().forEach((k) => { try { localStorage.setItem(k, JSON.stringify(list)); } catch (e) { console.error(e); } });
    s.addresses = list;
  }
  const emptyAddr = () => ({ label: 'Home', firstName: '', lastName: '', phone: '', email: (user() && user().email) || '', street: '', city: '', state: '', district: '', pincode: '' });
  s.addrForm = emptyAddr();
  let autoCity = '';
  const pin = D.pincodeLookup(() => drawContent());

  /* ─── Orders and reviews ─── */
  const confirmed = (o) => {
    const pay = (o.paymentStatus || '').toLowerCase(), method = (o.paymentMethod || '').toLowerCase(), status = (o.status || '').toLowerCase();
    return status !== 'pending payment' && pay !== 'pending' && (pay === 'paid' || pay === 'partially paid' || method.includes('cash on delivery') || method.includes('cashfree') || method.includes('razorpay'));
  };
  async function syncOrders() {
    const u = user();
    if (!u) return;
    let local = [];
    try { local = JSON.parse(localStorage.getItem('vaugun_orders') || '[]'); } catch (e) { console.error('Error parsing local orders:', e); }
    const email = u.email ? u.email.toLowerCase().trim() : '', phone = u.phone ? u.phone.trim() : '';
    const mine = (o) => (email && (o.email || '').toLowerCase().trim() === email) || (phone && (o.phone || '').trim() === phone);
    const userLocal = local.filter(mine);
    const token = localStorage.getItem('vaugun_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    try {
      await fetch(`${D.API}/orders/sync`, { method: 'POST', headers, body: JSON.stringify({ orders: userLocal }) }).catch(() => {});
      const res = await fetch(`${D.API}/orders`, { method: 'GET', headers });
      const json = await res.json();
      const db = Array.isArray(json) ? json : (json.success && Array.isArray(json.data) ? json.data : []);
      if (res.ok) {
        const ids = new Set(db.map((o) => String(o._id || o.id || '')));
        const final = [...db, ...userLocal.filter((o) => !ids.has(String(o._id || o.id || '')) && confirmed(o))];
        localStorage.setItem('vaugun_orders', JSON.stringify([...final, ...local.filter((o) => !mine(o))]));
        s.orders = final;
        drawAll();
        loadReviews();
        return;
      }
    } catch (err) { console.warn('Backend order fetch failed, falling back to localStorage:', err.message); }
    s.orders = userLocal.filter(confirmed);
    drawAll();
    loadReviews();
  }
  window.addEventListener('storage', () => syncOrders());
  async function loadReviews() {
    const u = user();
    if (!u || !u.email) return;
    try {
      const data = await (await fetch(`${D.API}/reviews`)).json();
      if (!data.success) return;
      const r = {};
      data.data.forEach((rev) => { if ((rev.email || '').toLowerCase().trim() === u.email.toLowerCase().trim()) r[`${rev.orderId}-${rev.productName}`] = { rating: rev.rating, comment: rev.comment, submitted: true }; });
      s.ratings = r;
      drawContent();
    } catch (err) { console.error('Error loading reviews from database:', err); }
  }

  /* ─── Feedback banner ─── */
  let msgTimer = null;
  function setMessage(type, text, clearAfter) {
    s.message = { type, text };
    drawMessage();
    clearTimeout(msgTimer);
    if (clearAfter) msgTimer = setTimeout(() => { s.message = { type: '', text: '' }; drawMessage(); }, clearAfter);
  }
  let msgEl = null;
  function drawMessage() {
    const host = root.querySelector('[data-msg]');
    if (!host) return;
    const m = s.message;
    if (!m.text) {
      if (msgEl) { const el = msgEl; msgEl = null; el.style.pointerEvents = 'none'; framer(el, { opacity: 0, y: -20, scale: 0.95 }).then(() => el.remove()); }
      return;
    }
    const color = m.type === 'error' ? ['#fef2f2', '#b91c1c', '#fca5a5'] : m.type === 'success' ? ['#f0fdf4', '#15803d', '#86efac'] : ['#f0f9ff', '#0369a1', '#7dd3fc'];
    const icon = m.type === 'error' ? svg('alert-triangle', 18) : m.type === 'success' ? svg('check-circle-2', 18) : svg('refresh-ccw', 18, { cls: 'animate-spin' });
    const html = `<span style="display:flex;flex-shrink:0">${icon}</span><span style="flex:1">${esc(m.text)}</span><button type="button" data-act="msg-close" class="dv-pf-msg-x" style="border:none;background:none;cursor:pointer;padding:0;color:inherit;display:flex">${svg('x', 16)}</button>`;
    const style = `display:flex;align-items:center;gap:0.75rem;padding:1rem 1.25rem;border-radius:16px;margin-bottom:1.5rem;font-size:0.9rem;font-weight:600;background-color:${color[0]};color:${color[1]};border:1px solid ${color[2]};box-shadow:0 4px 12px rgba(0,0,0,0.02)`;
    if (msgEl) { msgEl.style.cssText = style + ';opacity:1'; msgEl.innerHTML = html; return; }
    msgEl = document.createElement('div');
    msgEl.style.cssText = style + ';opacity:0;transform:translateY(-20px) scale(0.95)';
    msgEl.innerHTML = html;
    host.appendChild(msgEl);
    framer(msgEl, { opacity: [0, 1], y: [-20, 0], scale: [0.95, 1] });
  }

  /* ─── Layout ─── */
  let mode = null;
  function guestCard() {
    return `<div style="min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;background-color:#faf8f5;font-family:&quot;Poppins&quot;, sans-serif"><div style="max-width:450px;width:100%;background-color:#ffffff;border-radius:24px;padding:3rem 2.2rem;box-shadow:0 20px 40px rgba(10, 10, 10, 0.05);border:1px solid rgba(10, 10, 10, 0.05)">${svg('shopping-bag', 48, { style: 'color:#0a0a0a;margin-bottom:1.5rem' })}<h2 style="font-size:1.4rem;font-weight:800;color:#0a0a0a;margin-bottom:0.75rem;letter-spacing:-0.5px">My Orders</h2><p style="font-size:0.85rem;color:#6b7280;line-height:1.5;margin-bottom:2rem">You are currently viewing this page as a guest. Please login or register an account to track, view, and manage your orders permanently.</p><div style="display:flex;flex-direction:column;gap:0.75rem"><a href="/login" style="background-color:#0a0a0a;color:#ffffff;border:none;border-radius:100px;padding:0.85rem 1.5rem;font-size:0.85rem;font-weight:700;text-decoration:none;display:block;box-shadow:0 8px 20px rgba(10, 10, 10, 0.15);transition:all 0.2s;text-align:center">Login / Register</a><a href="/" style="background-color:transparent;color:#6b7280;border:1px solid #e5e7eb;border-radius:100px;padding:0.85rem 1.5rem;font-size:0.85rem;font-weight:700;text-decoration:none;display:block;transition:all 0.2s;text-align:center">Back to Home</a></div></div></div>`;
  }
  function shell() {
    return `<div class="profile-page-wrapper" style="min-height:100vh;background-color:#f8fafc;color:#1e293b"><div class="container" style="max-width:1560px"><div class="profile-layout-grid">
      <aside data-aside class="profile-sidebar-card-wrapper"></aside>
      <main data-main class="profile-main-content" style="background-color:#fff;border-radius:24px;padding:2.5rem;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);min-height:600px">
        <div class="mobile-back-button" style="margin-bottom:1.5rem"><button type="button" data-act="back" style="display:flex;align-items:center;gap:0.5rem;background:#f1f5f9;border:none;padding:0.6rem 1rem;border-radius:10px;font-weight:600;font-size:0.9rem;color:#0a0a0a;cursor:pointer;width:fit-content">${svg('chevron-right', 16, { style: 'transform:rotate(180deg)' })} Back to Menu</button></div>
        <div data-msg></div>
        <div data-tab-host></div>
      </main>
    </div></div></div><div data-modal></div>`;
  }

  const MENU = [
    { id: 'profile', name: 'Account Settings', icon: 'user' },
    { id: 'orders', name: 'My Orders', icon: 'package' },
    { id: 'addresses', name: 'Saved Addresses', icon: 'map-pin', count: () => s.addresses.length || 0 },
    { id: 'wishlist', name: 'Wishlist', icon: 'heart', count: () => D.wishlist.items.length || 0 },
    { id: 'security', name: 'Privacy & Security', icon: 'shield' },
  ];
  let asideHtml = '';
  function drawAside() {
    const u = user();
    const aside = root.querySelector('[data-aside]');
    aside.className = `profile-sidebar-card-wrapper ${s.mobileView === 'content' ? 'hide-mobile' : ''}`;
    root.querySelector('[data-main]').className = `profile-main-content ${s.mobileView === 'menu' ? 'hide-mobile' : ''}`;
    const initials = (u.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const avatar = u.avatar && !u.avatar.includes('pravatar') ? `<img src="${esc(u.avatar)}" alt="${esc(u.name)}" style="width:100%;height:100%;object-fit:cover">`
      : `<div style="width:100%;height:100%;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:900;color:#fff;letter-spacing:-1px;user-select:none;font-family:&quot;Poppins&quot;, sans-serif">${esc(initials)}</div>`;
    const html = `<div class="profile-sticky-card">
      <div style="text-align:center;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #f1f5f9">
        <div style="position:relative;width:100px;height:100px;margin:0 auto 1rem">
          <div data-act="avatar" style="width:100%;height:100%;border-radius: 50%;overflow:hidden;cursor:pointer;border:4px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,0.1);position:relative">${avatar}<div class="dv-pf-avatar-hover" style="position:absolute;inset:0;background-color:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:opacity 0.2s">${svg('camera', 20, { color: '#fff' })}</div></div>
          ${s.uploading ? `<div style="position:absolute;inset:0;background-color:rgba(255,255,255,0.8);border-radius: 50%;display:flex;align-items:center;justify-content:center">${svg('refresh-ccw', 20, { color: '#0a0a0a', cls: 'animate-spin' })}</div>` : ''}
        </div>
        <h3 style="font-size:1.1rem;font-weight:700;margin:0 0 0.25rem 0">${esc(u.name)}</h3>
        <p style="font-size:0.8rem;color:#64748b;margin:0">${esc(u.email)}</p>
      </div>
      <nav style="display:flex;flex-direction:column;gap:0.5rem">${MENU.map((m) => {
        const on = s.tab === m.id, count = m.count ? m.count() : 0;
        return `<button data-tab="${m.id}" style="display:flex;align-items:center;justify-content:space-between;padding:1rem;border-radius:12px;border:none;background-color:${on ? '#fdf8f5' : 'transparent'};color:${on ? '#0a0a0a' : '#475569'};cursor:pointer;transition:all 0.2s ease;text-align:left"><div style="display:flex;align-items:center;gap:1rem"><span style="display:flex;color:${on ? '#0a0a0a' : '#94a3b8'}">${svg(m.icon, 20)}</span><span style="font-weight:600;font-size:0.9rem">${m.name}</span></div>${count > 0 ? `<span style="background-color:${on ? '#0a0a0a' : '#e2e8f0'};color:${on ? '#fff' : '#475569'};padding:0.1rem 0.5rem;border-radius:20px;font-size:0.7rem;font-weight:700">${count}</span>` : ''}</button>`;
      }).join('')}</nav>
      <button data-act="logout" style="margin-top:2rem;display:flex;align-items:center;gap:1rem;padding:1rem;border-radius:12px;border:1px solid #fee2e2;background-color:#fef2f2;color:#ef4444;cursor:pointer;width:100%;font-weight:600;font-size:0.9rem">${svg('log-out', 18)} Logout</button>
    </div>`;
    if (html !== asideHtml) { asideHtml = html; aside.innerHTML = html; }
  }

  /* ─── Tabs ─── */
  const label = (text, req) => `<label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.5rem;color:#475569">${text}${req ? ' <span style="color:#ef4444">*</span>' : ''}</label>`;
  const INPUT = 'width:100%;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;background-color:#fff;font-size:0.9rem;outline:none';
  const SUBMIT = 'padding:0.8rem 2rem;background-color:#0a0a0a;color:#fff;border-radius:10px;border:none;font-weight:700;font-size:0.9rem;cursor:pointer;box-shadow:0 4px 12px rgba(10, 10, 10, 0.2)';

  function profileTab() {
    const u = user();
    return `<div style="margin-bottom:2rem"><h2 style="font-size:1.5rem;font-weight:800;margin:0 0 0.5rem 0">Account Settings</h2><p style="color:#64748b;font-size:0.9rem">Update your personal information and profile details.</p></div>
      <form data-form="profile" style="display:flex;flex-direction:column;gap:1.5rem">
        <div class="responsive-grid-2" style="gap:1.5rem"><div class="input-group">${label('Full Name', true)}<input type="text" required placeholder="Enter your full name" data-f="profileName" value="${esc(s.profileName)}" style="${INPUT}"></div><div class="input-group">${label('Email Address')}<input type="email" value="${esc(u.email || '')}" disabled style="width:100%;padding:0.75rem 1rem;border-radius:10px;border:1px solid #e2e8f0;background-color:#f8fafc;font-size:0.9rem;color:#94a3b8;outline:none;cursor:not-allowed"></div></div>
        <div class="responsive-grid-2" style="gap:1.5rem"><div class="input-group">${label('Phone Number')}<input type="text" placeholder="Not provided" style="${INPUT}"></div><div class="input-group">${label('Date of Birth')}<input type="date" style="${INPUT}"></div></div>
        <div style="border-top:1px solid #f1f5f9;padding-top:1.5rem;margin-top:1rem"><button type="submit" style="${SUBMIT}">Save Changes</button></div>
      </form>`;
  }

  const statusColor = (st, map, fallback) => map[st] || fallback;
  const isGift = (item) => item.isFreeGift || (item.price === 0 && ((item.name || '').toLowerCase().includes('gift') || String(item.productId || '').includes('gift')));
  function ordersTab() {
    const q = s.search.toLowerCase();
    const list = s.orders.filter((o) => (!s.search || o._id.toLowerCase().includes(q) || String(o.orderNumber || '').toLowerCase().includes(q) || (o.itemsList || []).some((i) => i.name.toLowerCase().includes(q))) && (s.statusFilter === 'All' || o.status === s.statusFilter));
    const filterMenu = s.filterOpen ? `<div data-act="filter-close" style="position:fixed;inset:0;z-index:10"></div><div data-filter-menu style="position:absolute;top:100%;right:0;margin-top:0.5rem;width:200px;background-color:#fff;border-radius:16px;padding:0.5rem;box-shadow:0 10px 25px rgba(0,0,0,0.1);border:1px solid #f1f5f9;z-index:11;overflow:hidden">${['All', 'Processing', 'Shipped', 'Delivered'].map((st) => `<button data-status="${st}" class="dv-pf-filter-opt${s.statusFilter === st ? ' dv-on' : ''}" style="display:flex;width:100%;padding:0.75rem 1rem;border-radius:10px;border:none;background-color:${s.statusFilter === st ? '#fdf8f5' : 'transparent'};color:${s.statusFilter === st ? '#0a0a0a' : '#475569'};font-size:0.85rem;font-weight:600;cursor:pointer;text-align:left;transition:all 0.2s">${st === 'All' ? 'All Orders' : st}</button>`).join('')}</div>` : '';
    let body;
    if (!list.length) {
      body = `<div style="text-align:center;padding:5rem 2rem;background-color:#f8fafc;border-radius:20px">${svg('shopping-bag', 48, { color: '#cbd5e1', style: 'margin-bottom:1rem' })}<h4 style="font-weight:700;margin:0 0 0.5rem 0">No orders found</h4><p style="font-size:0.85rem;color:#64748b;margin-bottom:1.5rem">Looks like you haven't placed any orders yet.</p><a href="/products" style="display:inline-flex;align-items:center;gap:0.5rem;color:#0a0a0a;font-weight:700;text-decoration:none;font-size:0.9rem">Start Shopping ${svg('arrow-right', 16)}</a></div>`;
    } else {
      body = `<div style="display:flex;flex-direction:column;gap:2rem">${list.map((o) => {
        const total = o.total || 0;
        const bg = statusColor(o.status, { Delivered: '#f0fdf4', Shipped: '#fce7eb', Packed: '#fdf2f4' }, '#fffbeb');
        const border = statusColor(o.status, { Delivered: '#bbf7d0', Shipped: '#f8b4c0', Packed: '#fed7df' }, '#fef08a');
        const border2 = statusColor(o.status, { Delivered: '#bbf7d0', Shipped: '#bfdbfe', Packed: '#bae6fd' }, '#fef08a');
        const dot = statusColor(o.status, { Delivered: '#360910', Shipped: '#54111c', Packed: '#781928' }, '#f59e0b');
        const meta = (t, v, extra = '') => `<div${extra}><span style="font-size:0.75rem;color:#64748b;font-weight:600;text-transform:uppercase">${t}</span>${v}</div>`;
        const items = (o.itemsList || []).map((item, i, arr) => {
          const key = `${o._id}-${item.name}`;
          const rv = s.ratings[key] || {};
          const rating = rv.rating || 0, comment = rv.comment || '';
          const last = i === arr.length - 1;
          const free = item.isFreeGift || item.price === 0;
          return `<div style="display:flex;flex-direction:column;gap:1rem;padding-bottom:${last ? '0' : '1.5rem'};border-bottom:${last ? 'none' : '1px solid #f1f5f9'};margin-bottom:${last ? '0' : '1.5rem'}">
            <div style="display:flex;gap:1.5rem;align-items:flex-start"><div style="width:80px;height:80px;border-radius:12px;overflow:hidden;border:1px solid #f1f5f9;background-color:#f8fafc;flex-shrink:0"><img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:100%;height:100%;object-fit:contain"></div>
              <div style="flex:1"><h4 style="margin:0 0 0.25rem 0;font-size:0.95rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">${isGift(item) ? '<span style="background-color:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:800;display:inline-flex;align-items:center;gap:0.2rem">🎁 FREE GIFT</span>' : ''}${esc(item.name)}</h4>
                ${item.size || item.color ? `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.4rem;align-items:center">${item.size ? `<span style="display:inline-flex;align-items:center;gap:0.25rem;background-color:#fff7ed;color:#9a3412;border:1px solid #fed7aa;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:0.2px">📐 Size: ${esc(item.size)}</span>` : ''}${item.color ? `<span style="display:inline-flex;align-items:center;gap:0.25rem;background-color:#fce7eb;color:#360910;border:1px solid #f8b4c0;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:0.2px">🎨 Color: ${esc(item.color)}</span>` : ''}</div>` : ''}
                <div style="display:flex;gap:1.5rem;font-size:0.8rem;color:#64748b;font-weight:500"><span>Qty: <strong>${esc(item.qty || 1)}</strong></span><span>Price: <strong style="color:${free ? '#059669' : '#1e293b'}">${free ? 'FREE (₹0)' : `₹${item.price != null ? Number(item.price).toLocaleString() : ''}`}</strong></span></div></div></div>
            <div style="background-color:rgba(255, 255, 255, 0.5);border-radius:12px;padding:1rem;border:1px solid ${border2};margin-top:0.5rem">
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1rem;margin-bottom:0.5rem"><span style="font-size:0.8rem;font-weight:700;color:#0a0a0a">${rv.submitted ? '✓ Rated &amp; Reviewed:' : 'Rate &amp; Review this product:'}</span>
                <div style="display:flex;gap:0.2rem">${[1, 2, 3, 4, 5].map((k) => `<svg data-star="${k}" data-key="${esc(key)}" width="20" height="20" viewBox="0 0 24 24" fill="${rating >= k ? '#0a0a0a' : 'none'}" stroke="${rating >= k ? '#0a0a0a' : '#cbd5e1'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:${rv.submitted ? 'default' : 'pointer'};transition:all 0.2s"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}</div></div>
              ${!rv.submitted ? `<div class="order-review-form-row"><input type="text" placeholder="Write a short review comment..." data-comment="${esc(key)}" value="${esc(comment)}" style="flex:1;padding:0.5rem 0.75rem;border-radius:8px;border:1px solid #cbd5e1;font-size:0.8rem;outline:none"><button data-rate-submit="${esc(key)}" data-order="${esc(o._id)}" data-name="${esc(item.name)}"${!rating || rv.submitting ? ' disabled' : ''} style="padding:0.5rem 1rem;background-color:${rating ? '#0a0a0a' : '#cbd5e1'};color:#fff;border:none;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:${rating ? 'pointer' : 'not-allowed'};transition:all 0.2s">${rv.submitting ? 'Submitting...' : 'Submit'}</button></div>`
                : `<p style="margin:0.25rem 0 0 0;font-size:0.8rem;color:#475569;font-style:italic">"${esc(comment || 'No comment added.')}"</p>`}
            </div></div>`;
        }).join('');
        return `<div class="dv-pf-order-card" style="background-color:${bg};border-radius:16px;border:1px solid ${border};overflow:hidden;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);transition:transform 0.2s, box-shadow 0.2s, background-color 0.2s">
          <div class="order-card-header" style="background-color:rgba(255, 255, 255, 0.45);border-bottom:1px solid ${border};backdrop-filter:blur(4px)">
            ${meta('Order Placed', `<div style="font-size:0.85rem;color:#1e293b;font-weight:700">${esc(new Date(o.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}</div>`)}
            ${meta('Total Amount', `<div style="font-size:0.85rem;color:#0a0a0a;font-weight:800">₹${total.toLocaleString('en-IN')}</div>`)}
            ${meta('Ship To', `<div style="font-size:0.85rem;color:#1e293b;font-weight:700">${esc(o.user)}</div>`)}
            ${meta('Order ID', `<div style="font-size:0.85rem;color:#64748b;font-weight:700">#${esc(o.orderNumber || o._id.split('_')[1] || o._id)}</div>`, ' style="text-align:right"')}
          </div>
          ${o.isPartialCod || o.paymentMethod === 'Cash on Delivery' ? `<div style="background-color:#fef3c7;border-bottom:1px solid #fde68a;padding:0.5rem 1.5rem;font-size:0.78rem;color:#92400e;font-weight:700;display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:space-between;align-items:center"><span>💵 Cash on Delivery (30% Paid Online: ₹${(o.advanceAmount || Math.round(total * 0.3)).toLocaleString('en-IN')})</span><span>70% Remaining Due on Delivery: ₹${(o.remainingAmount || (total - Math.round(total * 0.3))).toLocaleString('en-IN')}</span></div>` : ''}
          <div style="padding:1.5rem">${items}</div>
          <div class="order-card-footer" style="background-color:rgba(255, 255, 255, 0.45);border-top:1px solid ${border2};backdrop-filter:blur(4px)"><div style="display:flex;align-items:center;gap:0.5rem"><span style="width:8px;height:8px;border-radius: 50%;background-color:${dot}"></span><span style="font-size:0.8rem;font-weight:700;color:#475569">Status: ${esc(o.status)}</span></div><button data-details="${esc(o._id)}" class="dv-pf-details-btn" style="padding:0.5rem 1.25rem;background-color:#ffffff;border:1px solid #d1d5db;border-radius:8px;font-size:0.8rem;font-weight:700;color:#374151;cursor:pointer;display:flex;align-items:center;gap:0.25rem;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:all 0.15s">View Details &amp; Invoice ${svg('chevron-right', 14)}</button></div>
        </div>`;
      }).join('')}</div>`;
    }
    return `<div style="margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between"><h2 style="font-size:1.3rem;font-weight:800;margin:0">My Orders</h2></div>
      <div class="orders-search-filter-row"><div style="position:relative;flex:1"><input type="text" placeholder="Search your order here" data-f="search" value="${esc(s.search)}" style="width:100%;padding:0.8rem 1rem 0.8rem 2.8rem;border-radius:12px;border:1px solid #e2e8f0;background-color:#fff;font-size:0.9rem;outline:none;box-shadow:0 2px 4px rgba(0,0,0,0.02)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:1rem;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
        <div style="position:relative"><button data-act="filter" style="display:flex;align-items:center;gap:0.75rem;padding:0.8rem 1.2rem;border-radius:12px;border:1px solid #e2e8f0;background-color:#fff;font-size:0.9rem;font-weight:700;color:#475569;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.02)">${svg('settings', 18, { color: s.statusFilter !== 'All' ? '#0a0a0a' : '#94a3b8' })}${s.statusFilter === 'All' ? 'Filters' : esc(s.statusFilter)}</button>${filterMenu}</div></div>
      ${body}`;
  }

  function wishlistTab() {
    const list = D.wishlist.items;
    const head = '<div style="margin-bottom:2rem"><h2 style="font-size:1.5rem;font-weight:800;margin:0 0 0.5rem 0">Wishlist</h2><p style="color:#64748b;font-size:0.9rem">Items you have saved to purchase later.</p></div>';
    if (!list || !list.length) return head + `<div style="text-align:center;padding:5rem 2rem;background-color:#f8fafc;border-radius:20px">${svg('heart', 48, { color: '#cbd5e1', style: 'margin-bottom:1rem' })}<h4 style="font-weight:700;margin:0 0 0.5rem 0">Wishlist is empty</h4><p style="font-size:0.85rem;color:#64748b;margin-bottom:1.5rem">Save items to your wishlist and they will appear here.</p><a href="/products" style="display:inline-flex;align-items:center;gap:0.5rem;color:#0a0a0a;font-weight:700;text-decoration:none;font-size:0.9rem">Browse Products ${svg('arrow-right', 16)}</a></div>`;
    return head + `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:2rem">${list.map((item) => `<div data-wish-card style="background-color:#fff;border-radius:20px;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 4px 15px rgba(0,0,0,0.03);position:relative">
      <div style="position:relative;height:240px;background-color:#f8fafc;overflow:hidden"><img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:100%;height:100%;object-fit:contain;padding:1.5rem">
        <button data-trash class="dv-pf-trash" style="position:absolute;top:0.75rem;right:0.75rem;width:36px;height:36px;border-radius: 50%;border:none;background-color:rgba(255,255,255,0.9);color:#ef4444;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.1);backdrop-filter:blur(4px);transition:all 0.2s">${svg('trash-2', 16)}</button>
        <div style="position:absolute;bottom:0.75rem;left:0.75rem;background-color:#1e293b;color:#fff;padding:0.4rem 0.8rem;border-radius:10px;font-size:0.8rem;font-weight:800;box-shadow:0 4px 10px rgba(0,0,0,0.1)">₹${item.price != null ? Number(item.price).toLocaleString() : ''}</div></div>
      <div style="padding:1.25rem"><div style="margin-bottom:1rem"><h4 style="font-size:0.95rem;font-weight:700;margin:0 0 0.25rem 0;color:#1e293b;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${esc(item.name)}</h4></div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:0.75rem"><a href="/product/${esc(item.id)}" class="dv-pf-view" style="display:flex;align-items:center;justify-content:center;padding:0.7rem;background-color:#0a0a0a;color:#fff;border-radius:12px;text-decoration:none;font-size:0.85rem;font-weight:700;box-shadow:0 4px 12px rgba(10, 10, 10, 0.2);transition:all 0.2s">View Details</a><button data-bag="${esc(item.id || item._id)}" class="dv-pf-bag" style="width:42px;height:42px;border-radius:12px;border:1px solid #e2e8f0;background-color:#fff;color:#475569;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s">${svg('shopping-bag', 20)}</button></div></div>
    </div>`).join('')}</div>`;
  }

  function securityTab() {
    return `<div style="margin-bottom:2rem"><h2 style="font-size:1.5rem;font-weight:800;margin:0 0 0.5rem 0">Privacy &amp; Security</h2><p style="color:#64748b;font-size:0.9rem">Manage your password and account security settings.</p></div>
      <form data-form="password" style="display:flex;flex-direction:column;gap:1.5rem">
        <div class="input-group">${label('Current Password')}<input type="password" data-f="currentPassword" value="${esc(s.currentPassword)}" placeholder="••••••••••••" style="${INPUT}"></div>
        <div class="input-group">${label('New Password')}<input type="password" data-f="newPassword" value="${esc(s.newPassword)}" placeholder="At least 6 characters" style="${INPUT}"></div>
        <div style="padding:1.25rem;background-color:#f0f9ff;border:1px solid #e0f2fe;border-radius:12px;display:flex;gap:1rem;align-items:center"><div style="color:#0ea5e9">${svg('shield-check', 24)}</div><div style="font-size:0.85rem;color:#0369a1;line-height:1.4"><strong>Two-Factor Authentication</strong> is not enabled yet. We recommend enabling it for better security.</div></div>
        <div style="border-top:1px solid #f1f5f9;padding-top:1.5rem;margin-top:1rem"><button type="submit" style="${SUBMIT}">Update Password</button></div>
      </form>`;
  }

  const ADDR_INPUT = 'width:100%;padding:0.6rem 0.85rem;border-radius:8px;border:1.5px solid #e2e8f0;background-color:#fff;font-size:0.88rem;outline:none;box-sizing:border-box';
  const ADDR_LABEL = 'display:block;font-size:0.78rem;font-weight:700;color:#475569;margin-bottom:0.4rem';
  function addressForm() {
    const f = s.addrForm, editing = s.editingId;
    const pill = (lbl, icon, on, act) => `<button type="button" data-label="${act}" style="display:inline-flex;align-items:center;padding:0.4rem 1rem;border-radius:20px;border:2px solid ${on ? '#0a0a0a' : '#e2e8f0'};background-color:${on ? '#0a0a0a' : '#fff'};color:${on ? '#fff' : '#475569'};font-weight:700;font-size:0.8rem;cursor:pointer;transition:all 0.15s">${svg(icon, 14, { style: 'margin-right:6px' })}${esc(lbl)}</button>`;
    const other = f.label !== 'Home' && f.label !== 'Office';
    const field = (lbl, attrs, key) => `<div><label style="${ADDR_LABEL}">${lbl}</label><input ${attrs} data-a="${key}" value="${esc(f[key])}" class="dv-pf-input" style="${ADDR_INPUT}"></div>`;
    const stateMenu = s.stateOpen ? `<div data-act="state-close" style="position:fixed;inset:0;z-index:998"></div><div style="position:absolute;top:100%;left:0;right:0;margin-top:4px;background-color:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.12);z-index:999;max-height:220px;display:flex;flex-direction:column;overflow:hidden;min-width:200px"><div style="padding:0.5rem;border-bottom:1px solid #f1f5f9"><input type="text" placeholder="Search state..." data-f="stateSearch" value="${esc(s.stateSearch)}" style="width:100%;padding:0.35rem 0.6rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;box-sizing:border-box"></div><div style="overflow-y:auto;flex:1">${STATES.filter((x) => x.toLowerCase().includes(s.stateSearch.toLowerCase())).map((x) => `<div data-state="${esc(x)}" class="dv-pf-state-opt${f.state === x ? ' dv-on' : ''}" style="padding:0.55rem 0.85rem;font-size:0.85rem;cursor:pointer;background-color:${f.state === x ? '#f0fdf4' : 'transparent'};color:${f.state === x ? '#16a34a' : '#374151'};font-weight:${f.state === x ? 700 : 500}">${esc(x)}</div>`).join('')}</div></div>` : '';
    return `<div data-addr-form style="background-color:#ffffff;border:2px solid ${editing ? '#0284c7' : '#0a0a0a'};border-radius:24px;padding:2rem 1.75rem;margin-bottom:2rem;box-shadow:0 20px 40px rgba(10, 10, 10, 0.08);scroll-margin-top:120px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #f1f5f9"><div><span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${editing ? '#0284c7' : '#16a34a'};background-color:${editing ? '#e0f2fe' : '#dcfce7'};padding:0.25rem 0.75rem;border-radius:100px;margin-bottom:0.4rem">${svg(editing ? 'edit-2' : 'plus', 12)}${editing ? 'Editing Saved Address' : 'New Address Form'}</span><h3 style="font-size:1.25rem;font-weight:800;margin:0;color:#1e293b">${editing ? 'Edit Address Details' : 'Add New Delivery Address'}</h3></div><button data-act="addr-cancel" class="dv-pf-x" style="width:36px;height:36px;border-radius: 50%;border:none;background-color:#f1f5f9;color:#64748b;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s">${svg('x', 18)}</button></div>
      ${s.addrError ? `<div style="background-color:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:0.85rem 1rem;margin-bottom:1.25rem;font-size:0.85rem;color:#be123c;font-weight:600;display:flex;align-items:center;gap:0.5rem">${svg('alert-triangle', 16)} ${esc(s.addrError)}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div><label style="${ADDR_LABEL}">Address Label *</label><div style="display:flex;flex-direction:column;gap:0.75rem"><div style="display:flex;gap:0.5rem;flex-wrap:wrap">${pill('Home', 'home', f.label === 'Home', 'Home')}${pill('Office', 'briefcase', f.label === 'Office', 'Office')}${pill(other ? f.label : 'Other', 'map-pin', other, 'other')}</div>${other ? `<div data-custom-label><input type="text" placeholder="Enter custom label (e.g. Vacation Home, Gym)" data-a="label" value="${esc(f.label)}" class="dv-pf-input" style="width:100%;max-width:300px;padding:0.5rem 0.75rem;border-radius:8px;border:1.5px solid #e2e8f0;background-color:#fff;font-size:0.85rem;font-weight:600;outline:none;box-sizing:border-box"></div>` : ''}</div></div>
        <div class="dv-pf-grid2">${field('First Name *', 'type="text" placeholder="First name"', 'firstName')}${field('Last Name', 'type="text" placeholder="Last name"', 'lastName')}</div>
        <div class="dv-pf-grid2">${field('Phone *', 'type="tel" placeholder="10-digit mobile"', 'phone')}${field('Email', 'type="email" placeholder="email@example.com"', 'email')}</div>
        ${field('Street Address / Flat / Building *', 'type="text" placeholder="House no, Street name, Area"', 'street')}
        <div class="dv-pf-grid2"><div><label style="${ADDR_LABEL}">PIN Code *</label><input type="text" inputmode="numeric" maxlength="6" placeholder="670001" data-a="pincode" value="${esc(f.pincode)}" class="dv-pf-input" style="${ADDR_INPUT}">${pin.message ? `<div style="font-size:0.72rem;margin-top:0.3rem;color:${pin.status === 'error' ? '#dc2626' : '#6b7280'}">${esc(pin.message)}</div>` : ''}</div>${field('City / Town *', 'type="text" placeholder="Kochi"', 'city')}</div>
        <div class="dv-pf-grid2"><div style="position:relative"><label style="${ADDR_LABEL}">State *</label><div data-act="state-toggle" style="padding:0.6rem 0.85rem;border-radius:8px;border:1.5px solid ${s.stateOpen ? '#0a0a0a' : '#e2e8f0'};background-color:#fff;font-size:0.88rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;color:${f.state ? '#111827' : '#9ca3af'};user-select:none"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.state || 'Select State')}</span>${svg('chevron-down', 14, { color: '#9ca3af', style: `transform:${s.stateOpen ? 'rotate(180deg)' : 'none'};transition:transform 0.15s;flex-shrink:0` })}</div>${stateMenu}</div><div><label style="${ADDR_LABEL}">District *</label><div data-district></div></div></div>
        <div style="display:flex;gap:0.75rem;padding-top:0.5rem"><button type="button" data-act="addr-save" class="dv-pf-grow-sm" style="display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;flex:1;padding:0.75rem;background-color:#0a0a0a;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer;box-shadow:0 4px 12px rgba(10,10,10,0.2);transition:all 0.2s">${svg('check', 16)}${editing ? 'Save Changes' : 'Save Address'}</button><button type="button" data-act="addr-cancel" style="padding:0.75rem 1.25rem;background-color:#fff;color:#64748b;border:1.5px solid #e2e8f0;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer">Cancel</button></div>
      </div></div>`;
  }
  function addressesTab() {
    let cards;
    if (!s.addresses.length && !s.showAddrForm) {
      cards = `<div style="text-align:center;padding:4rem 2rem;background-color:#f8fafc;border-radius:20px;border:2px dashed #e2e8f0">${svg('map-pin', 48, { color: '#cbd5e1', style: 'margin-bottom:1rem' })}<h4 style="font-weight:700;margin:0 0 0.5rem 0;color:#475569">No saved addresses</h4><p style="font-size:0.85rem;color:#94a3b8;margin-bottom:1.5rem">Add an address to checkout faster next time.</p><button data-act="addr-add" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.7rem 1.5rem;background-color:#0a0a0a;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer">${svg('plus', 16)} Add First Address</button></div>`;
    } else {
      cards = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1.25rem;margin-bottom:1.5rem">${s.addresses.map((a) => {
        const editing = s.editingId === a.id;
        return `<div style="background-color:${editing ? '#f0f9ff' : a.isDefault ? '#fdf8f2' : '#fff'};border:2px solid ${editing ? '#0284c7' : a.isDefault ? '#f5c97b' : '#e2e8f0'};border-radius:18px;padding:1.25rem;position:relative;transition:all 0.25s ease;box-shadow:${editing ? '0 0 0 4px rgba(2, 132, 199, 0.15)' : a.isDefault ? '0 4px 20px rgba(245,201,123,0.2)' : '0 2px 8px rgba(0,0,0,0.04)'}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.85rem"><div style="display:flex;align-items:center;gap:0.6rem"><span style="display:inline-flex;align-items:center;gap:0.3rem;background-color:${a.isDefault ? '#fef3c7' : '#f1f5f9'};color:${a.isDefault ? '#92400e' : '#475569'};border:1px solid ${a.isDefault ? '#fde68a' : '#e2e8f0'};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:800">${svg(a.label === 'Home' ? 'home' : a.label === 'Office' ? 'briefcase' : 'map-pin', 12)}${esc(a.label)}</span>${a.isDefault ? `<span style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.7rem;font-weight:700;color:#b45309">${svg('star', 11, { color: '#f59e0b', fill: '#f59e0b' })} Default</span>` : ''}</div>${editing ? `<span style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.7rem;font-weight:800;color:#0284c7;background-color:#e0f2fe;padding:2px 8px;border-radius:20px">${svg('edit-2', 10)} Editing...</span>` : ''}</div>
          <p style="font-size:0.88rem;font-weight:700;color:#1e293b;margin:0 0 0.3rem 0">${esc(a.firstName)} ${esc(a.lastName)}</p>
          <p style="font-size:0.8rem;color:#64748b;line-height:1.6;margin:0 0 0.2rem 0">${esc(a.street)}<br>${esc(a.city)}, ${a.district ? `${esc(a.district)}, ` : ''}${esc(a.state)} — ${esc(a.pincode)}</p>
          ${a.phone ? `<p style="display:flex;align-items:center;gap:0.35rem;font-size:0.78rem;color:#94a3b8;margin:0.35rem 0 0 0">${svg('phone', 12, { style: 'color:#64748b' })}${esc(a.phone)}</p>` : ''}
          <div style="display:flex;gap:0.5rem;margin-top:1rem;padding-top:0.75rem;border-top:1px solid #f1f5f9">${!a.isDefault ? `<button data-default="${esc(a.id)}" style="flex:1;padding:0.45rem;background-color:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem">${svg('star', 12)} Set Default</button>` : ''}<button data-edit="${esc(a.id)}" style="flex:1;padding:0.45rem;background-color:${editing ? '#0284c7' : '#f0f9ff'};color:${editing ? '#fff' : '#0369a1'};border:1px solid ${editing ? '#0284c7' : '#bae6fd'};border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem">${svg('edit-2', 12)} ${editing ? 'Editing' : 'Edit'}</button><button data-delete="${esc(a.id)}" style="padding:0.45rem 0.65rem;background-color:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:8px;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem">${svg('trash-2', 12)}</button></div>
        </div>`;
      }).join('')}</div>`;
    }
    return `<div class="dv-pf-addr-head"><div><h2 style="font-size:1.5rem;font-weight:800;margin:0 0 0.25rem 0">Saved Addresses</h2><p style="color:#64748b;font-size:0.88rem;margin:0">Save addresses for faster checkout.</p></div><button data-act="addr-add" class="dv-pf-addr-add dv-pf-grow" style="display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.65rem 1.25rem;background-color:#0a0a0a;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:0.85rem;cursor:pointer;box-shadow:0 4px 12px rgba(10,10,10,0.15);transition:all 0.2s">${svg('plus', 16)} Add Address</button></div>
      ${s.showAddrForm ? addressForm() : ''}${cards}`;
  }

  const TABS = { profile: profileTab, orders: ordersTab, wishlist: wishlistTab, security: securityTab, addresses: addressesTab };
  let tabEl = null, tabKey = null, tabHtml = '', switching = null;
  let district = null;

  // Redraws the open tab in place, keeping focus and caret in the field being typed in
  function drawContent() {
    if (mode !== 'page' || !tabEl || switching) return;
    const html = TABS[s.tab]();
    if (html === tabHtml) return;
    const a = document.activeElement;
    const sel = a && tabEl.contains(a) && a.matches('input') ? ['data-f', 'data-a', 'data-comment'].map((k) => a.hasAttribute(k) ? `[${k}="${CSS.escape(a.getAttribute(k))}"]` : null).find(Boolean) : null;
    const caret = sel && a.type !== 'date' && a.type !== 'email' ? a.selectionStart : null;
    tabHtml = html;
    tabEl.innerHTML = html;
    if (sel) { const el = tabEl.querySelector(sel); if (el) { el.focus(); if (caret !== null) try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    mountDistrict();
    liftCards();
    const menu = tabEl.querySelector('[data-filter-menu]');
    if (menu && s.filterOpen && !menu._shown) { menu._shown = true; framer(menu, { opacity: [0, 1], y: [10, 0], scale: [0.95, 1] }); }
  }
  // Wishlist cards grow in when shown and rise on hover (framer initial / whileHover y: -5)
  function liftCards() {
    tabEl.querySelectorAll('[data-wish-card]').forEach((c) => {
      c.style.opacity = '0'; c.style.transform = 'scale(0.9)';
      framer(c, { opacity: [0, 1], scale: [0.9, 1] });
      c.addEventListener('pointerenter', () => animate(c, { y: -5 }, SPRING));
      c.addEventListener('pointerleave', () => animate(c, { y: 0 }, SPRING));
    });
  }
  function mountDistrict() {
    const host = tabEl && tabEl.querySelector('[data-district]');
    if (!host) { district = null; return; }
    district = D.searchableSelect(host, {
      value: s.addrForm.district || '', options: G.getDistricts(s.addrForm.state), placeholder: 'Select District', searchPlaceholder: 'Search district...',
      emptyText: 'No matching districts found', disabled: !s.addrForm.state, disabledText: 'Select state first',
      onChange: (d) => { s.addrForm = { ...s.addrForm, district: d }; drawContent(); },
    });
  }
  // AnimatePresence mode="wait": the old tab slides out left, the new one in from the right
  function showTab(first) {
    const host = root.querySelector('[data-tab-host]');
    const enter = () => {
      tabKey = s.tab;
      tabEl = document.createElement('div');
      tabHtml = TABS[s.tab]();
      tabEl.innerHTML = tabHtml;
      tabEl.style.opacity = '0'; tabEl.style.transform = 'translateX(10px)';
      host.replaceChildren(tabEl);
      mountDistrict();
      liftCards();
      framer(tabEl, { opacity: [0, 1], x: [10, 0] }).then(() => { if (tabEl) tabEl.style.transform = ''; });
    };
    if (first || !tabEl) return enter();
    const old = tabEl;
    const token = switching = {};
    framer(old, { opacity: 0, x: -10 }).then(() => { if (switching !== token) return; switching = null; enter(); });
  }

  function drawAll() {
    const u = user();
    if (D.auth.loading && !u) return;
    if (!u) {
      if (mode !== 'guest') { mode = 'guest'; root.innerHTML = guestCard(); tabEl = null; }
      return;
    }
    if (mode !== 'page') {
      mode = 'page';
      root.innerHTML = shell();
      asideHtml = '';
      msgEl = null;
      drawAside();
      showTab(true);
      drawMessage();
      drawModal();
      return;
    }
    drawAside();
    if (tabKey !== s.tab) showTab(false); else drawContent();
  }

  /* ─── Order details modal ─── */
  let modalEl = null;
  function drawModal() {
    const host = root.querySelector('[data-modal]');
    if (!host) return;
    const o = s.selectedOrder;
    if (!o) {
      if (modalEl) {
        const el = modalEl; modalEl = null;
        el.style.pointerEvents = 'none';
        framer(el.firstElementChild, { opacity: 0 });
        framer(el.lastElementChild, { opacity: 0, scale: 0.95, y: 30 }).then(() => el.remove());
      }
      return;
    }
    const m = isMobile();
    const steps = ['Processing', 'Packed', 'Shipped', 'Delivered'];
    const active = (st) => o.status === st || st === 'Processing' || (st === 'Packed' && ['Packed', 'Shipped', 'Delivered'].includes(o.status)) || (st === 'Shipped' && ['Shipped', 'Delivered'].includes(o.status)) || (st === 'Delivered' && o.status === 'Delivered');
    const width = o.status === 'Delivered' ? (m ? '75%' : '100%') : o.status === 'Shipped' ? (m ? '50%' : '66%') : o.status === 'Packed' ? (m ? '25%' : '33%') : '0%';
    const subtotal = o.itemsList ? o.itemsList.reduce((n, i) => n + i.price * i.qty, 0) : 0;
    const discount = o.discount !== undefined && o.discount !== null ? o.discount : Math.max(0, subtotal + (o.shippingCharge || 0) - o.total);
    const sm = (a, b) => (m ? a : b);
    const pill = { Delivered: ['#dcfce7', '#166534'], Shipped: ['#dbeafe', '#1e40af'], Packed: ['#e0f2fe', '#0369a1'] }[o.status] || ['#fef3c7', '#92400e'];
    const html = `<div data-act="modal-close" style="position:absolute;inset:0;background-color:rgba(15, 23, 42, 0.4);backdrop-filter:blur(8px);opacity:0"></div>
      <div style="width:100%;max-width:700px;max-height:${sm('92vh', '90vh')};background-color:#fff;border-radius:${sm('16px', '28px')};overflow:hidden;position:relative;z-index:2001;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);display:flex;flex-direction:column;opacity:0;transform:translateY(30px) scale(0.95)">
        <div style="padding:${sm('1rem 1.25rem', '1.5rem 2rem')};border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;background-color:#fff"><div><h3 style="font-size:${sm('1.05rem', '1.2rem')};font-weight:800;margin:0">Order Details</h3></div><button data-act="modal-close" style="width:${sm('32px', '36px')};height:${sm('32px', '36px')};border-radius: 50%;border:none;background-color:#f8fafc;color:#64748b;display:flex;align-items:center;justify-content:center;cursor:pointer">${svg('x', m ? 16 : 20)}</button></div>
        <div class="order-modal-body" style="overflow-y:auto;flex:1">
          <div style="background-color:#f8fafc;border-radius:16px;padding:${sm('1rem', '1.5rem')};margin-bottom:${sm('1.25rem', '2rem')}">
            <div style="display:flex;justify-content:space-between;margin-bottom:${sm('1rem', '1.5rem')};align-items:center"><span style="font-size:${sm('0.78rem', '0.85rem')};font-weight:700;color:#475569">Order Status</span><span style="padding:0.3rem 0.8rem;border-radius:100px;font-size:${sm('0.7rem', '0.75rem')};font-weight:800;background-color:${pill[0]};color:${pill[1]}">${esc(o.status)}</span></div>
            <div style="position:relative;display:flex;justify-content:space-between;padding:${sm('0', '0 1rem')}"><div style="position:absolute;top:12px;left:${sm('12.5%', '1rem')};right:${sm('12.5%', '1rem')};height:2px;background-color:#e2e8f0;z-index:0"></div><div style="position:absolute;top:12px;left:${sm('12.5%', '1rem')};width:${width};height:2px;background-color:#0a0a0a;z-index:1;transition:width 0.5s ease"></div>
              ${steps.map((st) => { const on = active(st); return `<div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:${sm('0.35rem', '0.5rem')};width:25%"><div style="width:24px;height:24px;border-radius: 50%;background-color:${on ? '#0a0a0a' : '#fff'};border:2px solid ${on ? '#0a0a0a' : '#e2e8f0'};display:flex;align-items:center;justify-content:center;color:#fff">${on ? svg('check', 12) : ''}</div><span style="font-size:${sm('0.62rem', '0.7rem')};font-weight:700;color:${on ? '#1e293b' : '#94a3b8'};text-align:center;letter-spacing:${sm('-0.3px', 'normal')}">${st}</span></div>`; }).join('')}
            </div>
          </div>
          <div style="margin-bottom:${sm('1.5rem', '2rem')}"><h4 style="font-size:${sm('0.88rem', '0.95rem')};font-weight:800;margin-bottom:${sm('0.75rem', '1rem')}">Items Ordered</h4><div style="display:flex;flex-direction:column;gap:${sm('0.75rem', '1rem')}">${(o.itemsList || []).map((item) => {
            const free = item.isFreeGift || item.price === 0;
            return `<div style="display:flex;gap:${sm('0.75rem', '1rem')};align-items:center"><div style="width:${sm('50px', '60px')};height:${sm('50px', '60px')};border-radius:10px;overflow:hidden;border:1px solid #f1f5f9;background-color:#f8fafc;flex-shrink:0"><img src="${esc(item.image)}" alt="${esc(item.name)}" style="width:100%;height:100%;object-fit:contain"></div><div style="flex:1;min-width:0"><h5 style="font-size:${sm('0.78rem', '0.85rem')};font-weight:700;margin:0 0 0.15rem 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isGift(item) ? '<span style="background-color:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:1px 6px;border-radius:4px;font-size:0.65rem;font-weight:800;margin-right:0.35rem">🎁 FREE GIFT</span>' : ''}${esc(item.name)}</h5>${item.size || item.color ? `<div style="display:flex;gap:${sm('0.2rem', '0.4rem')};flex-wrap:wrap;margin-bottom:0.2rem;align-items:center">${item.size ? `<span style="display:inline-flex;align-items:center;background-color:#fff7ed;color:#9a3412;border:1px solid #fed7aa;padding:1px 5px;border-radius:20px;font-size:${sm('0.62rem', '0.68rem')};font-weight:700">📐 Size: ${esc(item.size)}</span>` : ''}${item.color ? `<span style="display:inline-flex;align-items:center;background-color:#fce7eb;color:#360910;border:1px solid #f8b4c0;padding:1px 5px;border-radius:20px;font-size:${sm('0.62rem', '0.68rem')};font-weight:700">🎨 Color: ${esc(item.color)}</span>` : ''}</div>` : ''}<p style="font-size:${sm('0.68rem', '0.75rem')};color:#64748b;margin:0">Qty: ${esc(item.qty || 1)} • ${free ? '<span style="color:#059669;font-weight:700">FREE (₹0)</span>' : `₹${item.price != null ? Number(item.price).toLocaleString() : ''}`}</p></div><div style="font-weight:800;font-size:${sm('0.82rem', '0.9rem')};white-space:nowrap;color:${free ? '#059669' : '#0f172a'}">${free ? 'FREE' : `₹${(item.price * (item.qty || 1)).toLocaleString()}`}</div></div>`;
          }).join('')}</div></div>
          <div class="order-modal-grid"><div><h4 style="font-size:${sm('0.78rem', '0.85rem')};font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:${sm('0.5rem', '0.75rem')}">Shipping Address</h4><p style="font-size:${sm('0.78rem', '0.85rem')};color:#475569;line-height:1.5;margin:0">${esc(o.address && o.address.street)}<br>${esc(o.address && o.address.city)}, ${esc(o.address && o.address.state)}<br>${esc(o.address && o.address.pincode)}, ${esc(o.address && o.address.country)}</p></div>
            <div style="background-color:#f8fafc;border-radius:${sm('12px', '16px')};padding:${sm('0.75rem', '1rem')};flex:1">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem"><span style="font-size:${sm('0.75rem', '0.8rem')};color:#64748b">Subtotal</span><span style="font-size:${sm('0.75rem', '0.8rem')};font-weight:700">₹${subtotal.toLocaleString()}</span></div>
              ${discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem"><span style="font-size:${sm('0.75rem', '0.8rem')};color:#360910;font-weight:600">Discount ${o.couponCode ? `(${esc(o.couponCode)})` : ''}</span><span style="font-size:${sm('0.75rem', '0.8rem')};font-weight:700;color:#360910">-₹${discount.toLocaleString()}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem"><span style="font-size:${sm('0.75rem', '0.8rem')};color:#64748b">Shipping</span><span style="font-size:${sm('0.75rem', '0.8rem')};font-weight:700;color:${o.shippingCharge > 0 ? '#1e293b' : '#360910'}">${o.shippingCharge > 0 ? `₹${o.shippingCharge.toLocaleString()}` : 'FREE'}</span></div>
              <div style="display:flex;justify-content:space-between;margin-top:${sm('0.5rem', '0.75rem')};padding-top:${sm('0.5rem', '0.75rem')};border-top:1px dashed #e2e8f0"><span style="font-size:${sm('0.85rem', '0.9rem')};font-weight:800">Total Paid</span><span style="font-size:${sm('0.85rem', '0.9rem')};font-weight:800;color:#0a0a0a">₹${o.total != null ? o.total.toLocaleString() : ''}</span></div>
            </div></div>
        </div>
        <div style="padding:${sm('1rem 1.25rem', '1.5rem 2rem')};border-top:1px solid #f1f5f9;display:flex;flex-direction:${sm('column-reverse', 'row')};justify-content:flex-end;gap:${sm('0.5rem', '1rem')};background-color:#fff"><button data-act="invoice" style="padding:${sm('0.65rem 1.25rem', '0.7rem 1.5rem')};border-radius:12px;border:1px solid #0a0a0a;background-color:#fff;color:#0a0a0a;font-weight:700;font-size:${sm('0.8rem', '0.85rem')};cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;width:${sm('100%', 'auto')}">${svg('credit-card', 16)} Download Invoice</button><button data-act="modal-close" style="padding:${sm('0.65rem 1.25rem', '0.7rem 1.5rem')};border-radius:12px;border:1px solid #e2e8f0;background-color:#fff;color:#475569;font-weight:700;font-size:${sm('0.8rem', '0.85rem')};cursor:pointer;text-align:center;width:${sm('100%', 'auto')}">Close View</button></div>
      </div>`;
    if (modalEl) { modalEl.innerHTML = html; modalEl.firstElementChild.style.opacity = '1'; modalEl.lastElementChild.style.cssText += ';opacity:1;transform:none'; return; }
    modalEl = document.createElement('div');
    modalEl.className = 'dv-pf-modal-wrap';
    modalEl.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center';
    modalEl.innerHTML = html;
    host.appendChild(modalEl);
    framer(modalEl.firstElementChild, { opacity: [0, 1] });
    framer(modalEl.lastElementChild, { opacity: [0, 1], scale: [0.95, 1], y: [30, 0] });
  }

  // Invoice PDF (jsPDF + autoTable), as generated on the React page
  async function invoice(order) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let settings = null;
    try { settings = JSON.parse(localStorage.getItem('vaugun_invoice_settings')); } catch (e) {}
    settings = order.companyDetails || settings || { companyName: 'DAIVIKA Store', companyStreet: 'Mullonkal building, Therthally, Alakode', companyCity: 'Kannur', companyState: 'Kerala', companyPin: '670571', companyEmail: 'support@daivika.in', companyPhone: '+91 7736030808, +91 7736030809' };
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
      const gift = isGift(item);
      if (gift && !name.includes('FREE GIFT')) name = `[FREE GIFT 🎁] ${name}`;
      const meta = [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : '', window.DaivikaGst ? window.DaivikaGst.itemNote(item) : ''].filter(Boolean).join(' | ');
      if (meta && !name.includes('(')) name += `\n(${meta})`;
      return [name, item.qty || 1, gift ? 'FREE (INR 0)' : `INR ${item.price != null ? item.price.toLocaleString() : ''}`, gift ? 'INR 0' : `INR ${(item.price * (item.qty || 1)).toLocaleString()}`];
    });
    const opts = { startY: 100, head: [['Item Details', 'Qty', 'Unit Price', 'Total']], body, headStyles: { fillColor: [10, 10, 10] }, margin: { left: 20, right: 20 } };
    if (window.jspdfAutoTable && window.jspdfAutoTable.autoTable) window.jspdfAutoTable.autoTable(doc, opts); else doc.autoTable(opts);
    const subtotal = order.itemsList ? order.itemsList.reduce((n, i) => n + i.price * (i.qty || 1), 0) : 0;
    const discount = order.discount !== undefined && order.discount !== null ? order.discount : Math.max(0, subtotal + (order.shippingCharge || 0) - order.total);
    let y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: INR ${subtotal.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
    if (discount > 0) { y += 5; doc.text(`${order.couponCode ? `Coupon Discount (${order.couponCode})` : 'Discount'}: -INR ${discount.toLocaleString('en-IN')}`, 190, y, { align: 'right' }); }
    y += 5;
    doc.text(`Shipping: ${order.shippingCharge > 0 ? 'INR ' + order.shippingCharge.toLocaleString('en-IN') : 'FREE'}`, 190, y, { align: 'right' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 10, 10);
    doc.text(`Total Due: INR ${order.total != null ? order.total.toLocaleString('en-IN') : ''}`, 190, y + 10, { align: 'right' });
    if (window.DaivikaGst) window.DaivikaGst.addToPdf(doc, order, settings, y + 22);
    doc.save(`Invoice_${order.invoiceNumber || order._id}.pdf`);
    setMessage('success', 'Invoice downloaded successfully!', 3000);
  }

  /* ─── Actions ─── */
  function openAddressForm(addr) {
    s.editingId = addr ? addr.id : null;
    s.addrForm = addr ? { label: addr.label, firstName: addr.firstName, lastName: addr.lastName, phone: addr.phone, email: addr.email, street: addr.street, city: addr.city, state: addr.state, district: addr.district || '', pincode: addr.pincode } : { ...emptyAddr(), email: (user() && user().email) || '' };
    s.addrError = '';
    pin.lookup('');
    autoCity = '';
    const wasOpen = s.showAddrForm;
    s.showAddrForm = true;
    drawContent();
    const f = tabEl.querySelector('[data-addr-form]');
    if (f && !wasOpen) framer(f, { opacity: [0, 1], y: [-15, 0], scale: [0.98, 1] });
    setTimeout(() => { const el = tabEl && tabEl.querySelector('[data-addr-form]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
  }
  function closeAddressForm() {
    const f = tabEl.querySelector('[data-addr-form]');
    s.showAddrForm = false; s.addrError = ''; s.editingId = null;
    if (f) {
      const clone = f.cloneNode(true);
      f.replaceWith(clone);
      framer(clone, { opacity: 0, y: -15, scale: 0.98 }).then(() => { clone.remove(); drawContent(); });
      tabHtml = null;
      return;
    }
    drawContent();
  }
  function saveAddress() {
    const f = s.addrForm;
    if (!f.label || !f.firstName || !f.phone || !f.street || !f.city || !f.state || !f.district || !f.pincode) { s.addrError = 'Please fill all required fields (*).'; return drawContent(); }
    if (f.phone.replace(/\D/g, '').length < 10) { s.addrError = 'Enter a valid 10-digit phone number.'; return drawContent(); }
    s.addrError = '';
    const existing = loadAddresses();
    if (s.editingId) saveAddresses(existing.map((a) => (a.id === s.editingId ? { ...a, ...f } : a)));
    else saveAddresses([...existing, { id: `addr_${Date.now()}`, ...f, isDefault: existing.length === 0 }]);
    drawAside();
    closeAddressForm();
  }

  root.addEventListener('click', async (e) => {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab) { s.tab = tab.dataset.tab; s.mobileView = 'content'; window.scrollTo({ top: 0, behavior: 'instant' }); syncOrders(); drawAll(); return; }
    const act = t.closest('[data-act]');
    const a = act && act.dataset.act;
    if (a === 'back') { s.mobileView = 'menu'; window.scrollTo({ top: 0, behavior: 'instant' }); return drawAside(); }
    if (a === 'logout') return D.auth.logout();
    if (a === 'avatar') return fileInput.click();
    if (a === 'msg-close') { clearTimeout(msgTimer); s.message = { type: '', text: '' }; return drawMessage(); }
    if (a === 'filter') { s.filterOpen = !s.filterOpen; return drawContent(); }
    if (a === 'filter-close') { s.filterOpen = false; return drawContent(); }
    const st = t.closest('[data-status]');
    if (st) { s.statusFilter = st.dataset.status; s.filterOpen = false; return drawContent(); }
    const star = t.closest('[data-star]');
    if (star) {
      const key = star.dataset.key;
      if ((s.ratings[key] || {}).submitted) return;
      s.ratings = { ...s.ratings, [key]: { ...s.ratings[key], rating: Number(star.dataset.star) } };
      return drawContent();
    }
    const rs = t.closest('[data-rate-submit]');
    if (rs && !rs.disabled) return rateItem(rs.dataset.order, rs.dataset.name, rs.dataset.rateSubmit);
    const det = t.closest('[data-details]');
    if (det) { s.selectedOrder = s.orders.find((o) => o._id === det.dataset.details); return drawModal(); }
    if (a === 'modal-close') { s.selectedOrder = null; return drawModal(); }
    if (a === 'invoice' && s.selectedOrder) return invoice(s.selectedOrder);
    // The React page asks for confirmation in a dialog it never shows, so the bin button does nothing
    if (t.closest('[data-trash]')) return;
    const bag = t.closest('[data-bag]');
    if (bag) { const item = D.wishlist.items.find((i) => String(i.id || i._id) === bag.dataset.bag); if (item) D.cart.add(item); return; }
    if (a === 'addr-add') return openAddressForm(null);
    if (a === 'addr-cancel') return closeAddressForm();
    if (a === 'addr-save') return saveAddress();
    const ed = t.closest('[data-edit]');
    if (ed) return openAddressForm(s.addresses.find((x) => x.id === ed.dataset.edit));
    const del = t.closest('[data-delete]');
    if (del) {
      const list = loadAddresses().filter((x) => x.id !== del.dataset.delete);
      if (list.length && !list.some((x) => x.isDefault)) list[0].isDefault = true;
      saveAddresses(list); drawAside(); return drawContent();
    }
    const def = t.closest('[data-default]');
    if (def) { saveAddresses(loadAddresses().map((x) => ({ ...x, isDefault: x.id === def.dataset.default }))); return drawContent(); }
    const lb = t.closest('[data-label]');
    if (lb) {
      const other = s.addrForm.label !== 'Home' && s.addrForm.label !== 'Office';
      s.addrForm = { ...s.addrForm, label: lb.dataset.label === 'other' ? (other ? s.addrForm.label : 'Friend / Family') : lb.dataset.label };
      drawContent();
      const custom = tabEl.querySelector('[data-custom-label]');
      if (custom && !other && lb.dataset.label === 'other') { custom.style.overflow = 'hidden'; const h = custom.scrollHeight; animate(custom, { opacity: [0, 1], height: [0, h] }, OPACITY).then(() => { custom.style.height = ''; custom.style.overflow = ''; }); }
      return;
    }
    if (a === 'state-toggle') { s.stateOpen = !s.stateOpen; drawContent(); const i = tabEl.querySelector('[data-f="stateSearch"]'); if (i) i.focus(); return; }
    if (a === 'state-close') { s.stateOpen = false; s.stateSearch = ''; return drawContent(); }
    const so = t.closest('[data-state]');
    if (so) { const v = so.dataset.state; s.addrForm = { ...s.addrForm, state: v, district: v === s.addrForm.state ? s.addrForm.district : '' }; s.stateOpen = false; s.stateSearch = ''; return drawContent(); }
  });

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f) { s[t.dataset.f] = t.value; if (t.dataset.f === 'search' || t.dataset.f === 'stateSearch') drawContent(); return; }
    if (t.dataset.comment) { const k = t.dataset.comment; s.ratings = { ...s.ratings, [k]: { ...s.ratings[k], comment: t.value } }; return; }
    if (t.dataset.a) {
      const k = t.dataset.a;
      if (k === 'pincode') {
        const p = t.value.replace(/\D/g, '').slice(0, 6);
        s.addrForm = { ...s.addrForm, pincode: p };
        t.value = p;
        pin.lookup(p, (found) => {
          const f = s.addrForm;
          const keepCity = f.city.trim() && f.city !== autoCity;
          if (found.city && !keepCity) autoCity = found.city;
          s.addrForm = { ...f, ...(found.state ? { state: found.state, district: found.district || '' } : {}), ...(found.city && !keepCity ? { city: found.city } : {}) };
          drawContent();
        });
        return;
      }
      s.addrForm = { ...s.addrForm, [k]: t.value };
    }
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target.dataset.form;
    if (form === 'profile') {
      if (!s.profileName || !s.profileName.trim()) return setMessage('error', 'Please enter your full name.', 4000);
      setMessage('info', 'Saving profile updates...');
      const r = await D.auth.updateProfile(s.profileName.trim());
      setMessage(r.success ? 'success' : 'error', r.success ? 'Profile information updated successfully.' : (r.error || 'Failed to update profile'), 3000);
    }
    if (form === 'password') {
      if (!s.currentPassword || !s.newPassword) return setMessage('error', 'Please fill in both current and new password fields.');
      if (s.newPassword.length < 6) return setMessage('error', 'New password must be at least 6 characters long.');
      if (s.currentPassword === s.newPassword) return setMessage('error', 'New password must be different from your current password.');
      setMessage('info', 'Verifying credentials and updating password...');
      const r = await D.auth.updatePassword(s.currentPassword, s.newPassword);
      if (r && r.success) { s.currentPassword = ''; s.newPassword = ''; drawContent(); setMessage('success', 'Password updated successfully!', 5000); }
      else setMessage('error', (r && r.error) || 'Failed to update password. Please check your current password.', 5000);
    }
  });

  async function rateItem(orderId, productName, key) {
    const r = s.ratings[key] || {};
    const rating = r.rating || 0, comment = r.comment || '';
    s.ratings = { ...s.ratings, [key]: { rating, comment, submitting: true } };
    drawContent();
    try {
      const u = user();
      const res = await fetch(`${D.API}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: (u && u.name) || 'Customer', email: u && u.email, productName, rating, comment, orderId }) });
      const data = await res.json();
      if (data.success) { s.ratings = { ...s.ratings, [key]: { rating, comment, submitted: true } }; drawContent(); setMessage('success', 'Review submitted successfully!'); }
      else setMessage('error', data.message || 'Failed to submit review');
    } catch (err) { console.error(err); setMessage('error', 'Server error submitting review'); }
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { s.message = { type: '', text: '' }; drawMessage(); }, 3000);
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('error', 'Please select a valid image file');
    s.uploading = true; drawAside();
    setMessage('info', 'Updating your profile picture...');
    const r = await D.auth.updateAvatar(file);
    s.uploading = false; drawAside();
    setMessage(r.success ? 'success' : 'error', r.success ? 'Profile picture updated!' : (r.error || 'Upload failed'), 4000);
  });

  // React effects keyed on the user: name → form, user → addresses, email / phone → orders
  let lastName = null, lastUser = null, lastContact = null;
  D.on('auth', () => {
    const u = user();
    if (u && u.name && u.name !== lastName) s.profileName = u.name;
    lastName = u ? u.name : null;
    if (u !== lastUser) { lastUser = u; s.addresses = loadAddresses(); }
    const contact = u ? `${u.email}|${u.phone}` : null;
    if (contact !== lastContact) { lastContact = contact; if (u) syncOrders(); }
    drawAll();
  });
  D.on('wishlist', () => { if (mode === 'page') drawAll(); });
  window.addEventListener('resize', () => { if (s.selectedOrder) drawModal(); });
})();
