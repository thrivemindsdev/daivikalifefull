// Address form helpers shared by the profile and checkout pages:
//   Daivika.searchableSelect(host, options)  components/SearchableSelect.jsx
//   Daivika.pincodeLookup(onChange)          hooks/usePincodeLookup.js
(function () {
  const D = window.Daivika;
  const { animate } = window.Motion;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const svg = (name, size, color, style = '') => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true" style="${style}">${i.inner}</svg>`;
  };

  // Dropdown with a search box. options: { value, options, placeholder, searchPlaceholder, emptyText,
  // disabled, disabledText, accent, onChange }. Returns { update(changes) }.
  function searchableSelect(host, initial) {
    const o = { value: '', options: [], placeholder: 'Select...', searchPlaceholder: 'Search...', emptyText: 'No matches found', disabled: false, disabledText: '', accent: '#0a0a0a', onChange() {}, ...initial };
    let open = false, query = '', menu = null, backdrop = null;
    host.style.position = 'relative';
    host.innerHTML = '<div role="button"></div>';
    const button = host.firstChild;

    function drawButton() {
      button.tabIndex = o.disabled ? -1 : 0;
      button.style.cssText = `width:100%;padding:0.65rem 0.85rem;border-radius:6px;border:1px solid ${open ? o.accent : '#d1d5db'};background-color:${o.disabled ? '#f9fafb' : '#fff'};color:${o.value ? '#111827' : '#9ca3af'};font-size:0.9rem;cursor:${o.disabled ? 'not-allowed' : 'pointer'};display:flex;align-items:center;justify-content:space-between;user-select:none;height:39px;box-sizing:border-box`;
      button.innerHTML = `<span style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${esc(o.value || (o.disabled && o.disabledText) || o.placeholder)}</span>${svg('chevron-down', 14, '#6b7280', `transform:${open ? 'rotate(180deg)' : 'none'};transition:transform 0.15s;flex-shrink:0`)}`;
    }
    const filtered = () => { const q = query.trim().toLowerCase(); return q ? o.options.filter((x) => x.toLowerCase().includes(q)) : o.options; };
    function drawList() {
      const list = menu.querySelector('[data-list]');
      const items = filtered();
      list.innerHTML = items.length ? items.map((opt) => `<div data-opt="${esc(opt)}" class="dv-ss-opt${o.value === opt ? ' dv-on' : ''}" style="padding:0.55rem 1rem;font-size:0.82rem;font-weight:${o.value === opt ? 700 : 500};color:${o.value === opt ? '#0a0a0a' : '#374151'};background-color:${o.value === opt ? '#fdfbf9' : 'transparent'};cursor:pointer;text-align:left">${esc(opt)}</div>`).join('')
        : `<div style="padding:1rem;text-align:center;font-size:0.8rem;color:#6b7280">${esc(o.emptyText)}</div>`;
    }
    function show() {
      open = true; query = '';
      drawButton();
      backdrop = document.createElement('div');
      backdrop.style.cssText = 'position:fixed;inset:0;z-index:9998;background-color:transparent';
      backdrop.addEventListener('click', close);
      host.appendChild(backdrop);
      menu = document.createElement('div');
      menu.style.cssText = 'position:absolute;top:100%;left:0;right:0;margin-top:0.5rem;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);z-index:9999;max-height:240px;display:flex;flex-direction:column;overflow:hidden;min-width:220px';
      menu.innerHTML = `<div style="padding:0.5rem 0.75rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:0.5rem;background-color:#f9fafb">${svg('search', 13, '#9ca3af', 'flex-shrink:0')}<input type="text" placeholder="${esc(o.searchPlaceholder)}" style="width:100%;border:none;background-color:transparent;outline:none;font-size:0.85rem;color:#111827;padding:0.2rem 0"></div><div data-list style="overflow-y:auto;flex:1;padding:0.25rem 0"></div>`;
      host.appendChild(menu);
      drawList();
      const input = menu.querySelector('input');
      input.addEventListener('input', () => { query = input.value; drawList(); });
      input.addEventListener('keydown', (e) => {
        const items = filtered();
        if (e.key === 'Enter' && items.length) { e.preventDefault(); choose(items[0]); }
        if (e.key === 'Escape') close();
      });
      menu.addEventListener('click', (e) => { const opt = e.target.closest('[data-opt]'); if (opt) choose(opt.dataset.opt); });
      animate(menu, { opacity: [0, 1], y: [5, 0] }, { duration: 0.15 });
      setTimeout(() => input.focus(), 30);
    }
    function close() {
      if (!open) return;
      open = false; query = '';
      drawButton();
      if (backdrop) backdrop.remove();
      const m = menu; menu = null;
      if (m) { m.style.pointerEvents = 'none'; animate(m, { opacity: 0, y: 5 }, { duration: 0.15 }).then(() => m.remove()); }
    }
    function choose(opt) { o.onChange(opt); close(); }
    button.addEventListener('click', () => { if (!o.disabled) (open ? close() : show()); });
    button.addEventListener('keydown', (e) => { if (!o.disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open ? close() : show(); } });
    drawButton();
    return { update(changes) { Object.assign(o, changes); drawButton(); if (menu) drawList(); }, close };
  }

  // PIN code → state, district, city. onChange() is called whenever status / message change.
  function pincodeLookup(onChange = () => {}) {
    const st = { status: 'idle', message: '' };
    let latest = '';
    const set = (status, message) => { st.status = status; st.message = message; onChange(st); };
    st.lookup = async (value, onFound) => {
      const pin = String(value || '').replace(/\D/g, '').slice(0, 6);
      latest = pin;
      if (pin.length !== 6) { set('idle', ''); return; }
      set('loading', 'Finding your location...');
      try {
        const res = await fetch(`${D.API}/public/pincode/${pin}`);
        const json = await res.json().catch(() => ({}));
        if (latest !== pin) return;
        if (!res.ok || !json.success || !json.data) {
          set(res.status === 404 ? 'error' : 'idle', res.status === 404 ? 'PIN code not found. Please check it or fill in the address manually.' : '');
          return;
        }
        if (onFound) onFound(json.data);
        set('success', json.data.state && !json.data.district ? 'State filled in — please select your district.' : '');
      } catch (e) { if (latest === pin) set('idle', ''); }
    };
    return st;
  }

  D.searchableSelect = searchableSelect;
  D.pincodeLookup = pincodeLookup;
})();
