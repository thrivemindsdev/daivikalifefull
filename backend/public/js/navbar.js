// Navbar behaviour (components/Navbar.jsx): scroll state, account menu, notifications, push prompt,
// product search, side menu, WhatsApp assistant and the phone bottom bar.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const ICONS = window.DaivikaIcons || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, size, color = 'currentColor', extra = '') => {
    const i = ICONS[name];
    return i ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true" ${extra}>${i.inner}</svg>` : '';
  };
  const DEFAULT_LOGO = '/logo-light.png?v=daivika_v3';
  const isPhone = () => window.innerWidth <= 1024;
  const go = (url) => { window.location.href = url; };

  // Show / hide with the framer-motion values the React version used
  function popIn(el, from, options) {
    el.hidden = false;
    animate(el, Object.fromEntries(Object.entries(from).map(([k, v]) => [k, [v, k === 'opacity' || k === 'scale' ? 1 : 0]])), options);
  }
  function popOut(el, to, options) {
    if (el.hidden) return Promise.resolve();
    return animate(el, to, options).then(() => { el.hidden = true; });
  }

  /* ─── Scrolled state ─── */
  const header = $('#dv-header');
  const onScroll = () => header.classList.toggle('dv-scrolled', window.scrollY > 50);
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();


  /* ─── Account menu ─── */
  const userMenus = $$('[data-nav-user-menu]');
  let userMenuOpen = false;
  const menuBtn = (attrs, iconHtml, label, extraStyle = '') => `<button type="button" class="dv-menu-item${attrs.includes('logout') ? ' dv-danger' : ''}" ${attrs} style="display:flex;align-items:center;gap:0.75rem;width:100%;padding:0.65rem 0.85rem;border:none;border-radius:10px;cursor:pointer;color:#0f172a;font-size:0.85rem;font-weight:700;text-align:left;transition:all 0.2s;${extraStyle}">${iconHtml}<span>${label}</span></button>`;

  function renderUserMenus() {
    const user = D.auth.user;
    userMenus.forEach((menu) => {
      const desktop = menu.hasAttribute('data-desktop');
      if (user) {
        const dash = user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard';
        menu.innerHTML = `
          <div style="padding:0.85rem 1rem;border-bottom:1px solid #f1f5f9;margin-bottom:0.4rem;background:linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 100%);border-radius:14px">
            <div style="font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Welcome Back</div>
            <div style="font-size:0.98rem;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${esc(user.name || 'Valued Member')}</div>
            <div style="font-size:0.74rem;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user.email || user.phone)}</div>
          </div>
          ${desktop && ['admin', 'staff', 'vendor'].includes(user.role) ? `<button type="button" class="dv-menu-admin" data-go="${user.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard'}" style="display:flex;align-items:center;gap:0.75rem;width:100%;padding:0.65rem 0.85rem;border:none;background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);border-radius:10px;cursor:pointer;color:#92400e;font-size:0.85rem;font-weight:800;text-align:left;margin-bottom:0.4rem;box-shadow:0 2px 6px rgba(245, 158, 11, 0.2);transition:all 0.2s">${icon('shield', 18, '#d97706')}<span>${dash}</span></button>` : ''}
          ${menuBtn('data-go="/profile"', icon('user', 18, '#360910'), 'My Profile')}
          ${menuBtn('data-go="/wishlist"', icon('heart', 18, '#dc2626'), 'My Wishlist')}
          <div style="height:1px;background-color:#f1f5f9;margin:0.4rem 0"></div>
          ${menuBtn('data-logout', icon('log-out', 18, '#ef4444'), 'Logout', 'color:#ef4444;font-weight:800')}`;
      } else {
        menu.innerHTML = `
          <div style="padding:0.85rem 1rem;border-bottom:1px solid #f1f5f9;margin-bottom:0.5rem;background:linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);border-radius:14px">
            <div style="font-size:0.94rem;font-weight:800;color:#0f172a">Welcome, Guest 👋</div>
            <div style="font-size:0.74rem;color:#64748b;margin-top:2px">Login for faster checkout &amp; tracking</div>
          </div>
          <button type="button" data-go="/login" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.7rem;border:none;background-color:#360910;color:#ffffff;border-radius:12px;cursor:pointer;font-size:0.85rem;font-weight:800;box-shadow:0 4px 14px rgba(54, 9, 16, 0.3);margin-bottom:0.4rem;transition:all 0.2s">${icon('log-in', 16, '#ffffff')}<span>Login / Register</span></button>
          ${menuBtn('data-go="/wishlist"', icon('heart', 18, '#dc2626'), 'My Wishlist')}`;
      }
    });
  }

  function setUserMenu(open) {
    if (open === userMenuOpen) return;
    userMenuOpen = open;
    userMenus.forEach((m) => (open
      ? popIn(m, { opacity: 0, y: 10, scale: 0.95 }, { duration: 0.2, ease: 'easeOut' })
      : popOut(m, { opacity: 0, y: 10, scale: 0.95 }, { duration: 0.2, ease: 'easeOut' })));
  }
  $$('[data-nav-user-toggle]').forEach((b) => b.addEventListener('click', () => setUserMenu(!userMenuOpen)));
  ['mousedown', 'touchstart'].forEach((type) => document.addEventListener(type, (e) => {
    if (userMenuOpen && !$$('[data-nav-user-wrap]').some((w) => w.contains(e.target))) setUserMenu(false);
    if (notifOpen && !$$('[data-nav-notif-wrap]').some((w) => w.contains(e.target))) setNotif(false);
  }));
  userMenus.forEach((menu) => menu.addEventListener('click', (e) => {
    const target = e.target.closest('[data-go],[data-logout]');
    if (!target) return;
    setUserMenu(false);
    if (target.hasAttribute('data-logout')) { D.auth.logout(); go('/'); } else go(target.dataset.go);
  }));

  /* ─── Account-dependent links (side menu, bottom bar) ─── */
  function renderAccountLinks() {
    const user = D.auth.user;
    $('[data-nav-drawer-name]').textContent = user ? (user.name || 'Member') : 'Guest';
    $$('[data-nav-account-link]').forEach((a) => { a.href = user ? '/profile' : '/login'; });
    $('[data-nav-drawer-account]').textContent = user ? 'My Profile' : 'Log in';
    const dash = $('[data-nav-dashboard-link]');
    const staff = user && ['admin', 'staff', 'vendor'].includes(user.role);
    dash.hidden = !staff;
    dash.style.display = staff ? 'flex' : '';
    if (staff) {
      dash.href = user.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard';
      $('[data-nav-dashboard-label]').textContent = user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard';
    }
  }

  /* ─── Notifications ─── */
  let notifications = [];
  let notifOpen = false;
  const popovers = $$('[data-nav-notif-popover]');
  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('vaugun_token')}` });
  const relTime = (d) => {
    if (!d) return 'Just now';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(d).toLocaleDateString();
  };

  function renderNotifications() {
    const unread = notifications.filter((n) => !n.read).length;
    $$('[data-nav-unread]').forEach((b) => { b.textContent = unread; b.style.display = unread > 0 ? 'flex' : 'none'; });
    const list = notifications.length ? notifications.map((n) => {
      const isUnread = !n.read;
      const bg = n.type === 'welcome' ? 'radial-gradient(circle, #3d0b10 0%, #1f0407 100%)' : n.type === 'promotion' ? 'radial-gradient(circle, #4a0d14 0%, #2b060b 100%)' : 'radial-gradient(circle, #2d1808 0%, #170d04 100%)';
      const ic = n.type === 'welcome' ? 'sparkles' : n.type === 'promotion' ? 'tag' : n.type === 'order_status' ? 'package' : 'bell';
      return `<div class="dv-notif-row${isUnread ? ' dv-unread' : ''}" data-notif-id="${esc(n._id)}" data-notif-link="${esc(n.link || '')}" style="padding:0.85rem 1.25rem;display:flex;align-items:flex-start;gap:0.75rem;border-left:${isUnread ? '3.5px solid #c5831a' : '3.5px solid transparent'};border-bottom:1px solid rgba(212, 175, 55, 0.15);cursor:pointer;transition:all 0.2s ease;position:relative">
        <div style="width:36px;height:36px;border-radius: 50%;background:${bg};border:1px solid rgba(212, 175, 55, 0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0, 0, 0, 0.15)">${icon(ic, 17, '#fcd34d')}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
            <h5 style="margin:0;font-size:0.84rem;font-weight:${isUnread ? 800 : 600};color:#2a0508;line-height:1.3">${esc(n.title)}</h5>
            <span style="font-size:0.67rem;color:#92400e;font-weight:600;white-space:nowrap">${relTime(n.createdAt)}</span>
          </div>
          <p style="margin:3px 0 0 0;font-size:0.77rem;color:#652a0e;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.message)}</p>
        </div>
        ${isUnread ? '<span style="width:8px;height:8px;border-radius: 50%;background-color:#c5831a;box-shadow:0 0 6px #fcd34d;flex-shrink:0;margin-top:6px"></span>' : ''}
      </div>`;
    }).join('') : `<div style="padding:2.5rem 1.5rem;text-align:center">
        <div style="width:64px;height:64px;margin:0 auto 0.85rem;border-radius: 50%;background:radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(61, 11, 16, 0.06) 70%, transparent 100%);border:1.5px solid rgba(212, 175, 55, 0.45);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(197, 131, 26, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)">${icon('bell', 28, '#c5831a')}</div>
        <div style="font-size:0.94rem;font-weight:800;color:#2a0508;letter-spacing:0.2px;font-family:&quot;Poppins&quot;, sans-serif">No notifications yet</div>
        <div style="font-size:0.77rem;color:#78350f;margin-top:4px;font-weight:500">You&#39;re completely up to date with divine grace!</div>
        <div style="margin-top:0.8rem;display:flex;align-items:center;justify-content:center;gap:0.4rem">
          <span style="width:24px;height:1px;background:linear-gradient(to right, transparent, rgba(197, 131, 26, 0.4))"></span>
          <span style="color:#c5831a;font-size:0.7rem">✦ ॐ ✦</span>
          <span style="width:24px;height:1px;background:linear-gradient(to left, transparent, rgba(197, 131, 26, 0.4))"></span>
        </div>
      </div>`;

    popovers.forEach((p) => {
      const mobile = p.hasAttribute('data-mobile');
      p.style.cssText = `position:${mobile ? 'fixed' : 'absolute'};top:${mobile ? '60px' : 'calc(100% + 12px)'};left:${mobile ? '16px' : 'auto'};right:${mobile ? '16px' : '-10px'};margin:${mobile ? '0 auto' : '0'};width:${mobile ? 'calc(100vw - 32px)' : '370px'};max-width:${mobile ? '390px' : '370px'};max-height:${mobile ? 'calc(100vh - 120px)' : '480px'};background:linear-gradient(180deg, #fffdf8 0%, #faf3e2 100%);border-radius:20px;box-shadow:0 25px 65px rgba(40, 6, 11, 0.35), 0 0 25px rgba(212, 175, 55, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9);border:1.5px solid rgba(212, 175, 55, 0.55);z-index:999999;overflow:hidden;display:flex;flex-direction:column;font-family:&quot;Poppins&quot;, sans-serif`;
      p.innerHTML = `
        <div style="height:4px;background:linear-gradient(90deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%);box-shadow:0 1px 4px rgba(252, 211, 77, 0.4)"></div>
        <div style="padding:0.95rem 1.25rem;border-bottom:1.5px solid rgba(212, 175, 55, 0.45);display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg, #2b060b 0%, #3d0b10 50%, #200407 100%);box-shadow:0 2px 8px rgba(0, 0, 0, 0.25)">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div style="width:30px;height:30px;border-radius: 50%;background:linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(61, 11, 16, 0.8) 100%);border:1px solid rgba(212, 175, 55, 0.45);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0, 0, 0, 0.3)">${icon('bell', 15, '#fcd34d')}</div>
            <div><div style="font-size:0.88rem;font-weight:800;color:#fde68a;letter-spacing:0.6px;display:flex;align-items:center;gap:0.35rem"><span>Notifications</span><span style="color:#c5831a;font-size:0.75rem">✦</span></div></div>
            ${unread > 0 ? `<span style="background:linear-gradient(135deg, #c5831a 0%, #fcd34d 100%);color:#28060b;font-size:0.64rem;font-weight:900;padding:2px 8px;border-radius:20px;box-shadow:0 2px 6px rgba(0, 0, 0, 0.25)">${unread} new</span>` : ''}
          </div>
          ${unread > 0 ? `<button type="button" class="dv-notif-markall" data-notif-markall style="background:none;border:none;color:#fde68a;font-size:0.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity 0.2s">${icon('check-check', 13, '#fcd34d')}<span>Mark all read</span></button>` : ''}
        </div>
        <div style="overflow-y:auto;flex:1;padding:0.4rem 0">${list}</div>
        <div style="padding:0.75rem 1.15rem;border-top:1px solid rgba(212, 175, 55, 0.3);background:linear-gradient(180deg, #f7efe1 0%, #ede1cc 100%);text-align:center">
          <button type="button" class="dv-notif-settings" data-notif-settings style="background:linear-gradient(135deg, rgba(61, 11, 16, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%);border:1px solid rgba(212, 175, 55, 0.45);border-radius:8px;padding:0.45rem 1.1rem;font-size:0.76rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0, 0, 0, 0.04);transition:all 0.2s">${icon('bell', 13, 'currentColor')}<span>Notification Settings &amp; Push Alerts</span><span style="font-size:0.65rem;color:#c5831a">✦</span></button>
        </div>`;
      if (!notifOpen) p.hidden = true;
    });
  }

  function setNotif(open) {
    if (open === notifOpen) return;
    notifOpen = open;
    popovers.forEach((p) => (open
      ? popIn(p, { opacity: 0, y: 10, scale: 0.95 }, { duration: 0.22, ease: 'easeOut' })
      : popOut(p, { opacity: 0, y: 10, scale: 0.95 }, { duration: 0.22, ease: 'easeOut' })));
  }
  $$('[data-nav-notif-toggle]').forEach((b) => b.addEventListener('click', () => setNotif(!notifOpen)));

  async function fetchNotifications() {
    if (!D.auth.user) return;
    try {
      const res = await fetch(`${D.API}/notifications`, { headers: authHeader() });
      const json = await res.json();
      if (res.ok && json.success) { notifications = json.data || []; renderNotifications(); }
    } catch (e) { console.error('Error fetching notifications:', e); }
  }
  async function markRead(body) {
    try {
      const res = await fetch(`${D.API}/notifications/read`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok && json.success) {
        notifications = notifications.map((n) => (body.markAllRead || n._id === body.notificationId ? { ...n, read: true } : n));
        renderNotifications();
      }
    } catch (e) { console.error('Error marking notification as read:', e); }
  }
  popovers.forEach((p) => p.addEventListener('click', (e) => {
    if (e.target.closest('[data-notif-markall]')) return markRead({ markAllRead: true });
    if (e.target.closest('[data-notif-settings]')) { setNotif(false); return showPushModal(); }
    const row = e.target.closest('[data-notif-id]');
    if (!row) return;
    const n = notifications.find((x) => x._id === row.dataset.notifId);
    if (n && !n.read) markRead({ notificationId: n._id });
    if (row.dataset.notifLink) { setNotif(false); go(row.dataset.notifLink); }
  }));

  /* ─── Push notification prompt ─── */
  const pushModal = $('[data-nav-push-modal]');
  const pushCard = $('[data-nav-push-card]');
  let pushTimer = null;
  function showPushModal() {
    pushModal.hidden = false;
    animate(pushModal, { opacity: [0, 1] });
    animate(pushCard, { scale: [0.95, 1], opacity: [0, 1], y: [15, 0] }, { type: 'spring', damping: 25, stiffness: 350 });
  }
  function hidePushModal() {
    animate(pushCard, { scale: 0.95, opacity: 0, y: 10 }, { type: 'spring', damping: 25, stiffness: 350 });
    animate(pushModal, { opacity: 0 }).then(() => { pushModal.hidden = true; });
  }
  const vapidKey = () => (window.DaivikaConfig || {}).vapidPublicKey;
  const toKey = (b64) => {
    const base64 = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  };
  async function subscribePush(ask) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (ask && (await Notification.requestPermission()) !== 'granted') return;
      if (!ask && Notification.permission !== 'granted') return;
      if (!vapidKey()) return;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey()) });
      await fetch(`${D.API}/notifications/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ subscription: sub }) });
    } catch (e) { console.error('Failed to register push notifications:', e); }
  }
  $('[data-nav-push-allow]').addEventListener('click', () => { hidePushModal(); localStorage.removeItem('show_notification_prompt'); subscribePush(true); });
  $('[data-nav-push-later]').addEventListener('click', () => { hidePushModal(); localStorage.removeItem('show_notification_prompt'); });

  function schedulePushPrompt() {
    clearTimeout(pushTimer);
    if (!('Notification' in window)) return;
    const user = D.auth.user;
    if (Notification.permission === 'granted') { if (user) subscribePush(false); return; }
    if (Notification.permission !== 'default') return;
    // Logged-in shoppers who just logged in see it after 1.5 s; visitors after 10 s
    const prompt = localStorage.getItem('show_notification_prompt') === 'true';
    if (prompt || !user) pushTimer = setTimeout(showPushModal, user ? 1500 : 10000);
  }

  let pollTimer = null;
  D.on('auth', (auth) => {
    if (auth.loading) return;
    renderUserMenus();
    renderAccountLinks();
    clearInterval(pollTimer);
    if (auth.user) {
      fetchNotifications();
      pollTimer = setInterval(() => { if (document.visibilityState === 'visible') fetchNotifications(); }, 60000);
    } else {
      notifications = [];
      renderNotifications();
    }
    schedulePushPrompt();
  });
  renderUserMenus();
  renderNotifications();
  if (!D.auth.token) schedulePushPrompt();

  /* ─── Product search ─── */
  let products = Object.values(D.cart.latestProducts);
  let fetchingProducts = false;
  const inputs = $$('[data-nav-search-input]');
  const results = $$('[data-nav-search-results]');
  let query = '';
  let searchOpen = false;
  const productImage = (p) => (typeof p.image === 'string' ? p.image : (p.image && p.image.url) || DEFAULT_LOGO);
  const matches = (p, q) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));

  function renderResults() {
    const q = query.trim().toLowerCase();
    results.forEach((box) => {
      const mobile = box.hasAttribute('data-mobile');
      // Phones list up to 8 matches once two letters are typed; one letter matches names only (as in React)
      const items = q.length < 1 ? products.slice(0, 5)
        : mobile ? (q.length >= 2 ? products.filter((p) => matches(p, q)).slice(0, 8) : products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5))
        : products.filter((p) => matches(p, q)).slice(0, 5);
      const title = q.length < 1 ? 'Popular Products' : 'Top Matches';
      if (mobile) {
        box.innerHTML = `<div style="padding:0.5rem 0.85rem;background-color:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center"><span style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${title}</span></div>
          <div style="max-height:260px;overflow-y:auto">${items.length ? items.map((p) => `<div data-product="${esc(p._id || p.id)}" style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.95rem;border-bottom:1px solid #f3f4f6;cursor:pointer">
            <div style="width:32px;height:32px;border-radius:6px;overflow:hidden;flex-shrink:0"><img src="${esc(productImage(p))}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover"></div>
            <div style="flex:1;min-width:0"><h5 style="margin:0;font-size:0.78rem;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</h5><p style="margin:0;font-size:0.68rem;color:#6b7280">₹${esc(p.price)}</p></div>
          </div>`).join('') : `<div style="padding:1rem;text-align:center;font-size:0.78rem;color:#64748b">No products found matching "${esc(query)}"</div>`}</div>`;
      } else {
        box.innerHTML = `<div style="padding:0.75rem 1.25rem;border-bottom:1px solid #f3f4f6;background-color:#fafafa;display:flex;justify-content:space-between;align-items:center"><span style="font-size:0.72rem;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:1px;white-space:nowrap">${title}</span></div>
          <div style="max-height:300px;overflow-y:auto">${items.length ? items.map((p) => `<div class="dv-search-row" data-product="${esc(p._id || p.id)}" style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.25rem;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background-color 0.2s">
            <div style="width:42px;height:42px;border-radius:8px;overflow:hidden;flex-shrink:0;background-color:#f9fafb;border:1px solid #f1f5f9"><img src="${esc(productImage(p))}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover"></div>
            <div style="flex:1;min-width:0"><h4 style="margin:0 0 0.2rem 0;font-size:0.85rem;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</h4><p style="margin:0;font-size:0.72rem;color:#64748b;text-transform:capitalize">${esc(p.category)}</p></div>
            <div style="font-weight:800;font-size:0.88rem;color:#0f172a;flex-shrink:0;white-space:nowrap">₹${esc(p.price)}</div>
          </div>`).join('') : `<div style="padding:1.5rem;text-align:center;color:#6b7280;font-size:0.8rem">No matches found for "${esc(query)}"</div>`}</div>
          <a href="${query ? `/products?search=${encodeURIComponent(query)}` : '/products'}" class="dv-search-all" style="padding:0.75rem;text-align:center;border-top:1px solid #f3f4f6;background-color:#fafafa;display:block;text-decoration:none;font-size:0.78rem;font-weight:800;transition:all 0.2s">View All Results ${icon('chevron-right', 12, 'currentColor', 'style="display:inline;vertical-align:middle"')}</a>`;
      }
    });
  }

  function setSearch(open) {
    if (open === searchOpen) return;
    searchOpen = open;
    results.forEach((box) => {
      const mobile = box.hasAttribute('data-mobile');
      if (!mobile) box.style.display = 'flex';
      if (open) {
        box.hidden = false;
        if (mobile) animate(box, { opacity: [0, 1], y: [5, 0] });
        else animate(box, { opacity: [0, 1], y: [15, 0], scale: [0.95, 1] }, { type: 'spring', stiffness: 280, damping: 26 });
      } else {
        (mobile ? animate(box, { opacity: 0, y: 5 }) : animate(box, { opacity: 0, y: 15, scale: 0.95 }, { type: 'spring', stiffness: 280, damping: 26 }))
          .then(() => { if (!searchOpen) box.hidden = true; });
      }
    });
  }

  async function ensureProducts() {
    if (products.length || fetchingProducts) return;
    fetchingProducts = true;
    try {
      const json = await (await fetch(`${D.API}/products`)).json();
      if (json.success) { products = json.data.map((p) => ({ ...p, id: p._id })); renderResults(); restartTypewriter(); }
    } catch (e) { console.error('Failed to fetch live products for navbar search:', e); }
    fetchingProducts = false;
  }

  inputs.forEach((input) => {
    input.addEventListener('focus', () => { renderResults(); setSearch(true); ensureProducts(); });
    input.addEventListener('blur', () => setTimeout(() => { if (!inputs.includes(document.activeElement)) setSearch(false); }, 250));
    input.addEventListener('input', () => { query = input.value; inputs.forEach((i) => { if (i !== input) i.value = query; }); renderResults(); });
  });
  results.forEach((box) => box.addEventListener('mousedown', (e) => {
    const row = e.target.closest('[data-product]');
    if (row) { e.preventDefault(); go(`/product/${row.dataset.product}`); }
  }));
  $$('[data-nav-search-form]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (query.trim()) go(`/products?search=${encodeURIComponent(query.trim())}`);
  }));

  // Typewriter placeholder: random real product names, or the defaults until products load
  let typeTimer = null;
  function restartTypewriter() {
    clearTimeout(typeTimer);
    let terms = products.filter((p) => p && p.name).map((p) => `'${p.name.slice(0, 24).trim()}'`);
    for (let i = terms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [terms[i], terms[j]] = [terms[j], terms[i]]; }
    terms = terms.slice(0, 15);
    if (!terms.length) terms = ['"1 Mukhi Rudraksha"', '"Original Karungali Mala"', '"Sacred Tulasi Japa Mala"', '"Panchaloha Bangle"', '"Brass Pooja Diya"', '"Red Sandalwood Mala"', '"Energised Gemstones"', '"Pure Dhoop & Incense"'];
    let term = 0, char = 0, deleting = false;
    const tick = () => {
      const current = terms[term % terms.length];
      inputs.forEach((i) => { i.placeholder = `Search ${current.substring(0, char)}|`; });
      let speed = deleting ? 35 : 65;
      if (!deleting && char === current.length) { speed = 1800; deleting = true; } else if (deleting && char === 0) { deleting = false; term++; speed = 400; } else if (deleting) char--; else char++;
      typeTimer = setTimeout(tick, speed);
    };
    typeTimer = setTimeout(tick, 300);
  }
  D.on('products', (map) => { products = Object.values(map).map((p) => ({ ...p, id: p._id || p.id })); renderResults(); restartTypewriter(); });
  restartTypewriter();

  /* ─── Side menu ─── */
  const drawer = $('[data-nav-drawer]');
  const backdrop = $('[data-nav-drawer-backdrop]');
  const panel = $('[data-nav-drawer-panel]');
  const DRAWER = { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.35 };
  let drawerOpen = false;
  function setDrawer(open) {
    if (open === drawerOpen) return;
    drawerOpen = open;
    if (open) {
      drawer.hidden = false;
      animate(backdrop, { opacity: [0, 1] });
      animate(panel, { x: ['-100%', 0] }, DRAWER);
    } else {
      animate(backdrop, { opacity: 0 });
      animate(panel, { x: '-100%' }, DRAWER).then(() => { if (!drawerOpen) drawer.hidden = true; });
    }
  }
  $$('[data-nav-open-menu]').forEach((b) => b.addEventListener('click', () => setDrawer(true)));
  $$('[data-nav-close-menu]').forEach((b) => b.addEventListener('click', () => setDrawer(false)));
  backdrop.addEventListener('click', () => setDrawer(false));
  $('[data-nav-drawer-account]').addEventListener('click', () => go(D.auth.user ? '/profile' : '/login'));

  /* ─── WhatsApp assistant ─── */
  const WHATSAPP = '917510821228';
  const SUGGESTIONS = [
    { label: '🛍️ Order Status & Tracking', text: 'Hi! I would like to get tracking information for my Daivika order.', response: 'I can certainly help you track your order! Let me connect you directly with our order dispatch and tracking desk.' },
    { label: '📦 Product Specification & Details Help', text: 'Hi! I need assistance regarding product specifications or details for Daivika items.', response: 'We want to make sure you get the exact product details! Let me assist you right away.' },
    { label: '🔄 Returns & Exchanges', text: 'Hello! I would like to initiate a return or exchange for my purchase.', response: 'No worries! We offer hassle-free returns. Let me route you to our returns support team to guide you through.' },
    { label: '🤝 Bulk / Custom Orders', text: 'Hi, I would like to discuss wholesale supply or custom bulk product orders.', response: 'We would love to collaborate on bulk orders! I will connect you directly with our B2B partnership team.' },
  ];
  const WA_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="margin-right:4px;display:inline-block;vertical-align:middle"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.58 1.973 14.107.95 11.49.95c-5.438 0-9.863 4.37-9.866 9.8-.001 2.028.533 4.019 1.545 5.793l-1.016 3.71 3.818-1.002zm11.378-5.328c-.287-.144-1.7-.84-1.962-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-1.354-.68-2.317-1.2-3.23-2.766-.24-.413.24-.383.687-1.27.072-.144.036-.271-.018-.379-.054-.108-.456-1.104-.624-1.512-.163-.393-.328-.34-.456-.346-.117-.006-.252-.007-.387-.007s-.354.05-.539.252c-.186.202-.708.693-.708 1.693s.729 1.97 1.83 2.115c.11.015 2.13 3.253 5.16 4.561.72.311 1.282.497 1.721.637.724.23 1.383.197 1.904.12.58-.087 1.7-.695 1.939-1.367.239-.672.239-1.248.168-1.367-.072-.12-.264-.216-.551-.36z"/></svg>';
  const waWindow = $('[data-wa-window]');
  const waBody = $('[data-wa-body]');
  const waInput = $('[data-wa-input]');
  const waSend = $('[data-wa-send]');
  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wa = { open: false, typing: false, suggestions: true, messages: [{ sender: 'bot', text: 'Hi there! 👋 Welcome to Daivika Support. How can we assist you with your fashion search or order queries today?', time: now() }] };

  function renderWa() {
    const msgs = wa.messages.map((m) => `<div class="wa-chat-msg-wrapper ${m.sender}"><div class="wa-chat-msg ${m.sender}"><div>${esc(m.text)}</div>${m.ctaLink ? `<a href="${esc(m.ctaLink)}" target="_blank" rel="noopener noreferrer" class="wa-chat-cta-btn">${WA_ICON}${esc(m.ctaLabel)}</a>` : ''}</div><span class="wa-chat-msg-time">${m.time}</span></div>`).join('');
    const typing = wa.typing ? '<div class="wa-chat-msg-wrapper bot"><div class="wa-chat-msg bot"><div class="wa-typing-indicator"><span class="wa-typing-dot"></span><span class="wa-typing-dot"></span><span class="wa-typing-dot"></span></div></div></div>' : '';
    const chevron = icon('chevron-right', 13, 'currentColor', 'style="display:inline-block;opacity:1;transform:none"');
    const options = !wa.typing && wa.suggestions
      ? `<div class="wa-suggestions-container"><span class="wa-suggestion-title">Select a query topic:</span>${SUGGESTIONS.map((s, i) => `<button type="button" class="wa-suggestion-chip" data-wa-suggestion="${i}"><span>${s.label}</span>${chevron}</button>`).join('')}</div>`
      : !wa.typing ? '<div style="display:flex;justify-content:center;margin-top:6px"><button type="button" class="wa-suggestion-chip" data-wa-reset style="width:auto;font-size:11px;border-style:dashed;padding:6px 12px;justify-content:center;gap:4px">🔄 View Topic Options</button></div>' : '';
    waBody.innerHTML = msgs + typing + options + '<div data-wa-end></div>';
    waInput.disabled = wa.typing;
    updateSend();
    if (wa.messages.length > 1) $('[data-wa-end]').scrollIntoView({ behavior: 'smooth' });
  }
  function updateSend() {
    const has = waInput.value.trim() !== '';
    waSend.disabled = !has || wa.typing;
    waSend.style.backgroundColor = has ? '#128c7e' : '#e2e8f0';
    waSend.style.cursor = has ? 'pointer' : 'default';
  }
  function reply(text, ctaText, ctaLabel) {
    wa.suggestions = false;
    wa.typing = true;
    renderWa();
    setTimeout(() => {
      wa.typing = false;
      wa.messages.push({ sender: 'bot', text, time: now(), ctaLink: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(ctaText)}`, ctaLabel });
      renderWa();
    }, 1200);
  }
  waBody.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-wa-suggestion]');
    if (chip) {
      const s = SUGGESTIONS[Number(chip.dataset.waSuggestion)];
      wa.messages.push({ sender: 'user', text: s.label, time: now() });
      reply(s.response, s.text, 'Send Inquiry on WhatsApp 💬');
    } else if (e.target.closest('[data-wa-reset]')) { wa.suggestions = true; renderWa(); }
  });
  waInput.addEventListener('input', updateSend);
  $('[data-wa-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = waInput.value.trim();
    if (!text) return;
    wa.messages.push({ sender: 'user', text, time: now() });
    waInput.value = '';
    reply('I have compiled your message. Click below to instantly launch WhatsApp and send your query to our support agent.', text, 'Send Message via WhatsApp 💬');
  });
  const WA_SPRING = { type: 'spring', stiffness: 300, damping: 25 };
  function openWa() {
    if (wa.open) return;
    wa.open = true;
    waWindow.hidden = false;
    animate(waWindow, { opacity: [0, 1], x: [-30, 0], scale: [0.9, 1] }, WA_SPRING);
    wa.typing = true;
    renderWa();
    setTimeout(() => { wa.typing = false; renderWa(); }, 1200);
  }
  $('[data-wa-close]').addEventListener('click', () => {
    wa.open = false;
    animate(waWindow, { opacity: 0, x: -30, scale: 0.9 }, WA_SPRING).then(() => { if (!wa.open) waWindow.hidden = true; });
  });
  $$('[data-nav-open-chat]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); setDrawer(false); openWa(); }));

  /* ─── Phone bottom bar ─── */
  const bottom = $('[data-nav-bottom]');
  function setBottomActive(id, active) {
    const btn = bottom && $(`[data-nav-bottom-item="${id}"]`, bottom);
    if (!btn) return;
    btn.dataset.active = active ? 'true' : 'false';
    btn.style.color = active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
    $('[data-nav-bottom-pill]', btn).hidden = !active;
    const svg = $('svg', btn);
    svg.setAttribute('stroke', active ? '#ffffff' : 'rgba(255, 255, 255, 0.75)');
    svg.setAttribute('stroke-width', active ? '2.5' : '2');
    btn.lastElementChild.style.fontWeight = active ? 800 : 600;
  }
  if (bottom) {
    animate(bottom, { y: [80, 0], opacity: [0, 1], scale: [0.9, 1] }, { type: 'spring', stiffness: 420, damping: 28 });
    $$('[data-nav-bottom-item]', bottom).forEach((btn) => {
      btn.addEventListener('pointerdown', () => animate(btn, { scale: 0.88 }));
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => btn.addEventListener(t, () => animate(btn, { scale: 1 })));
      btn.addEventListener('click', () => {
        const id = btn.dataset.navBottomItem;
        if (id === 'home') go('/');
        else if (id === 'shop') go('/products');
        else if (id === 'cart') D.cart.open();
        else go(D.auth.user ? '/profile' : '/login');
      });
    });
  }

  /* ─── Cart count ─── */
  D.on('cart', (cart) => {
    const count = cart.count();
    $$('[data-nav-cart-count]').forEach((b) => { b.textContent = count; b.style.display = count > 0 ? 'flex' : 'none'; });
    setBottomActive('cart', cart.isOpen || location.pathname === '/cart');
  });
  $$('[data-nav-open-cart]').forEach((b) => b.addEventListener('click', () => D.cart.open()));
})();
