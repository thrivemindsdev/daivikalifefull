// Products page (app/(store)/products/ProductsClient.jsx, components/ProductFilterSidebar.jsx, Breadcrumbs.jsx).
// Filters in the URL change without a page load (history.pushState), as React's router did; sidebar filters
// and sorting are page state only.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const S = window.DaivikaShop;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const svg = (name, size, { color = 'currentColor', fill = 'none', stroke = 2, style = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const THEMES = S.themes.map((t) => ({ ...t, re: new RegExp(t.match, 'i') }));
  const getTheme = (id) => THEMES.find((t) => t.id === id);

  /* ─── Filter rules (same as the React page) ─── */
  const PRICE_RANGES = [
    { id: 'u500', label: 'Under ₹500', min: 0, max: 500 },
    { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
    { id: '1000-2000', label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
    { id: '2000-5000', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
    { id: 'o5000', label: 'Over ₹5,000', min: 5000, max: Infinity },
  ];
  const DISCOUNT_STEPS = [50, 40, 30, 20, 10];
  const RATING_STEPS = [4, 3, 2];
  const EMPTY_SIDEBAR = { priceRange: '', priceMin: '', priceMax: '', minDiscount: 0, minRating: 0, inStockOnly: false };
  const SORTS = [
    { id: 'featured', label: 'Featured' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'name', label: 'Name: A to Z' },
  ];
  const PLACEHOLDERS = ['Search for Karungali malas...', 'Looking for Rudraksha...', 'Find pooja essentials...', 'Discover crystals & gemstones...', 'Search energised adornments...'];

  const productDiscount = (p) => { const mrp = Number(p.mrp), price = Number(p.price); return mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0; };
  const isInStock = (p) => !Array.isArray(p.inventory) || p.inventory.length === 0 || p.inventory.some((i) => Number(i.stock) > 0);
  const storeKey = (g) => { const v = String(g || '').toLowerCase().trim(); return v === 'jewels' || v === 'jewel' ? 'daivika' : v; };
  function isGenderMatch(prodGender, filterGender) {
    if (!filterGender || filterGender === 'all') return true;
    if (!prodGender) return false;
    const pg = storeKey(prodGender), fg = storeKey(filterGender);
    if (pg === 'all' || pg === fg) return true;
    const group = (list) => list.includes(fg) && list.includes(pg);
    return group(['women', 'womens', "women's"]) || group(['men', 'mens', "men's"]) || group(['kids', 'kid', 'children']);
  }
  const isCategoryMatch = (pc, fc) => {
    if (!fc || fc === 'all') return true;
    if (!pc) return false;
    return pc.toLowerCase().trim().replace(/[-_]/g, ' ') === fc.toLowerCase().trim().replace(/[-_]/g, ' ');
  };
  function isSizeMatch(variantName, sizeName) {
    if (!variantName || !sizeName) return false;
    const v = variantName.toLowerCase().trim(), s = sizeName.toLowerCase().trim();
    if (v === s) return true;
    const parts = v.split(/[\/\-\(\)]+/).map((p) => p.trim());
    if (parts.includes(s)) return true;
    if (s === 's' && (parts.includes('small') || v.includes(' small') || v.startsWith('small'))) return true;
    if (s === 'm' && (parts.includes('medium') || v.includes(' medium') || v.startsWith('medium'))) return true;
    if (s === 'l' && (parts.includes('large') || v.includes(' large') || v.startsWith('large')) && !v.includes('xl') && !v.includes('xxl') && !v.includes('extra')) return true;
    if (s === 'xl' && (parts.includes('extra large') || parts.includes('x-large') || v.includes('extra large') || v.includes('xl'))) return true;
    if (s === 'xxl' && (parts.includes('xxl') || parts.includes('2xl') || v.includes('xxl') || v.includes('2xl'))) return true;
    return v.split(/\s+/).includes(s);
  }
  // lib/product-categories.js
  const ckey = (v) => String(v || '').toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const placements = (p) => (p ? [{ category: String(p.category || ''), subcategory: String(p.subcategory || '') }, ...(Array.isArray(p.extraCategories) ? p.extraCategories : []).filter((e) => e && e.category)] : []);
  function productInCategory(p, category, subcategory) {
    const c = ckey(category), s = ckey(subcategory);
    if (!c || c === 'all') return true;
    return placements(p).some((pl) => ckey(pl.category) === c && (!s || s === 'all' || ckey(pl.subcategory) === s));
  }
  const categoryNames = (p) => placements(p).map((pl) => String(pl.category || '').trim()).filter(Boolean);
  const text = (v) => (typeof v === 'object' && v ? v.name || v.slug || '' : String(v || ''));
  function matchesTheme(p, theme) {
    const hay = [p.name, text(p.category), text(p.subcategory),
      ...(Array.isArray(p.extraCategories) ? p.extraCategories.flatMap((e) => [e && e.category, e && e.subcategory]) : []),
      Array.isArray(p.tags) ? p.tags.join(' ') : p.tags].filter(Boolean).join(' ');
    return theme.re.test(hay);
  }
  const lower = (v) => (typeof v === 'string' ? v.toLowerCase() : '');

  /* ─── State ─── */
  const state = {
    products: [], loading: true, categories: [],
    category: 'all', subcategory: 'all', gender: 'all', size: 'all', themeId: '',
    search: '', sortBy: 'featured', sidebar: { ...EMPTY_SIDEBAR },
  };
  function readUrl() {
    const q = new URLSearchParams(location.search);
    state.themeId = q.get('theme') || '';
    state.category = q.get('category') || 'all';
    state.subcategory = q.get('subcategory') || 'all';
    state.gender = q.get('collection') || 'all';
    state.search = q.get('search') || '';
    state.size = q.get('size') || 'all';
  }
  function navigate(url) {
    history.pushState(null, '', url);
    onUrl();
  }
  function onUrl() {
    readUrl();
    input.value = state.search;
    window.scrollTo(0, 0);
    render();
    // React's MetaPixelTracker counted every in-page navigation as a page view
    D.track('PageView', { page_title: document.title, page_location: location.href, page_path: location.pathname });
  }
  const withParams = (fn) => { const q = new URLSearchParams(location.search); fn(q); return `/products?${q.toString()}`; };

  function matchesFilters(p, skip = '') {
    const theme = getTheme(state.themeId);
    if (state.gender !== 'all' && !isGenderMatch(p.gender, state.gender)) return false;
    if (theme && !matchesTheme(p, theme)) return false;
    if (skip !== 'category') {
      const sub = skip !== 'subcategory' && state.subcategory && state.subcategory !== 'all' ? state.subcategory : '';
      if (state.category !== 'all' && !productInCategory(p, state.category, sub)) return false;
      if (state.category === 'all' && sub && !placements(p).some((pl) => pl.subcategory && isCategoryMatch(pl.subcategory, sub))) return false;
    }
    if (skip !== 'size' && state.size && state.size !== 'all' && !(p.variants && p.variants.some((v) => isSizeMatch(v.name, state.size)))) return false;
    if (state.search.trim()) {
      const q = state.search.toLowerCase();
      if (!(lower(p.name).includes(q) || lower(p.description).includes(q) || lower(p.category).includes(q) || (p.code && lower(p.code).includes(q)))) return false;
    }
    const { priceRange, priceMin, priceMax, minDiscount, minRating, inStockOnly } = state.sidebar;
    if (skip !== 'price') {
      const price = Number(p.price) || 0;
      const range = PRICE_RANGES.find((r) => r.id === priceRange);
      if (range && !(price >= range.min && price < range.max)) return false;
      if (priceMin !== '' && price < Number(priceMin)) return false;
      if (priceMax !== '' && price > Number(priceMax)) return false;
    }
    if (skip !== 'discount' && minDiscount && productDiscount(p) < minDiscount) return false;
    if (skip !== 'rating' && minRating && (Number(p.ratingInfo && p.ratingInfo.rating) || 0) < minRating) return false;
    if (skip !== 'stock' && inStockOnly && !isInStock(p)) return false;
    return true;
  }

  function filtered() {
    const result = state.products.filter((p) => matchesFilters(p));
    if (state.sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (state.sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (state.sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  // Categories that have products, in the admin's order (unsaved ones last, A–Z)
  function categoriesList() {
    const names = [...new Set(state.products.filter((p) => state.gender === 'all' || isGenderMatch(p.gender, state.gender)).flatMap(categoryNames).filter(Boolean))];
    const fetched = state.categories;
    const same = (fc, name) => String(fc.name || '').toLowerCase().trim() === String(name || '').toLowerCase().trim();
    if (names.length) {
      const rank = (cat) => { const i = fetched.findIndex((fc) => same(fc, cat.name)); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
      return names.map((n) => fetched.find((fc) => same(fc, n)) || { _id: n, name: n }).sort((a, b) => (rank(a) - rank(b)) || a.name.localeCompare(b.name));
    }
    return state.gender === 'all' ? fetched : fetched.filter((c) => c.gender && (c.gender.toLowerCase() === 'all' || storeKey(c.gender) === storeKey(state.gender)));
  }

  const titleCase = (s) => s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  function categoryName() {
    const theme = getTheme(state.themeId);
    const raw = state.category === 'all'
      ? (state.gender === 'all' ? S.intro.title : `${state.gender.charAt(0).toUpperCase() + state.gender.slice(1)}'s Collection`)
      : ((state.categories.find((c) => c.name.toLowerCase() === state.category.toLowerCase()) || {}).name || state.category);
    return theme && state.category === 'all' ? theme.title : titleCase(raw);
  }

  const activeCount = () => (state.category !== 'all' ? 1 : 0) + (state.subcategory && state.subcategory !== 'all' ? 1 : 0) + (state.size !== 'all' ? 1 : 0)
    + (state.sidebar.priceRange || state.sidebar.priceMin !== '' || state.sidebar.priceMax !== '' ? 1 : 0)
    + (state.sidebar.minDiscount ? 1 : 0) + (state.sidebar.minRating ? 1 : 0) + (state.sidebar.inStockOnly ? 1 : 0);

  function resetFilters() {
    state.sidebar = { ...EMPTY_SIDEBAR };
    navigate('/products');
  }

  /* ─── Header: breadcrumbs, title, intro, page title ─── */
  const crumbsEl = document.querySelector('[data-prod-crumbs]');
  const titleEl = document.querySelector('[data-prod-title]');
  const introEl = document.querySelector('[data-prod-intro]');
  let headerKey = null;
  function renderHeader() {
    const name = categoryName();
    const theme = getTheme(state.themeId);
    const intro = state.category !== 'all' ? '' : theme ? theme.description : state.gender === 'all' ? S.intro.description : '';
    const items = [{ name: 'Products', url: '/products' }];
    if (state.category !== 'all') {
      items.push({ name, url: `/products?category=${state.category}` });
      if (state.subcategory && state.subcategory !== 'all') items.push({ name: state.subcategory, url: `/products?category=${encodeURIComponent(state.category)}&subcategory=${encodeURIComponent(state.subcategory)}` });
    }
    const key = JSON.stringify([name, intro, items]);
    if (key === headerKey) return;
    const first = headerKey === null;
    headerKey = key;
    document.title = state.category === 'all'
      ? 'All Sacred Collections | DAIVIKA by Zodimithra - Authentic Spiritual Wearables'
      : `${name} | DAIVIKA by Zodimithra - Consecrated Spiritual Wearables`;
    const desc = state.category === 'all'
      ? 'Browse DAIVIKA by Zodimithra for authentic Karungali malas, Himalayan Rudraksha, sacred Tulasi beads, Panchaloha, and pure pooja essentials.'
      : `Explore DAIVIKA by Zodimithra's authentic ${name} collection. Consecrated by Vedic rituals for spiritual blessings.`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', desc);
    const og = (p, v) => { const m = document.querySelector(`meta[property="${p}"]`); if (m) m.setAttribute('content', v); };
    og('og:title', document.title); og('og:description', desc);
    // Page schema in <head>, as React's useDocumentSEO added it
    let ld = document.getElementById('ld-json-schema-page');
    if (!ld) { ld = document.createElement('script'); ld.id = 'ld-json-schema-page'; ld.type = 'application/ld+json'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: location.origin },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${location.origin}/products` },
      ...(state.category !== 'all' ? [{ '@type': 'ListItem', position: 3, name, item: `${location.origin}/products?category=${state.category}` }] : []),
    ] });
    if (first) return; // the server already drew them
    titleEl.textContent = name;
    introEl.textContent = intro;
    introEl.hidden = !intro;
    const trail = [{ name: 'Home', url: '/' }, ...items];
    const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `https://daivika.com${it.url}` })) };
    crumbsEl.innerHTML = `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script><nav aria-label="Breadcrumb" style="margin:0.1rem 0 0.35rem;display:flex;align-items:center"><ol style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;list-style:none;padding:0;margin:0;font-size:0.85rem;color:#64748b;font-weight:500">${trail.map((it, i) => {
      const last = i === trail.length - 1;
      return `<li style="display:flex;align-items:center;gap:0.4rem">${i > 0 ? svg('chevron-right', 14, { color: '#94a3b8', style: 'flex-shrink:0' }) : ''}${last
        ? `<span style="color:#0f172a;font-weight:700" aria-current="page">${esc(it.name)}</span>`
        : `<a href="${esc(it.url)}" class="breadcrumb-link" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.25rem;transition:color 0.2s">${i === 0 ? svg('home', 14, { style: 'margin-bottom:1px' }) : ''}${esc(it.name)}</a>`}</li>`;
    }).join('')}</ol></nav>`;
  }
  // Breadcrumb links inside the catalogue stay on the page
  crumbsEl.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a && a.getAttribute('href').startsWith('/products') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(a.getAttribute('href')); }
  });

  /* ─── Filter sidebar ─── */
  function sidebarSizes() {
    const byKey = new Map();
    state.products.forEach((p) => {
      if (!matchesFilters(p, 'size')) return;
      const seen = new Set();
      (Array.isArray(p.variants) ? p.variants : []).forEach((v) => {
        const name = String((v && v.name) || '').trim();
        const k = name.toLowerCase();
        if (!name || seen.has(k)) return;
        seen.add(k);
        const entry = byKey.get(k) || { name, count: 0 };
        entry.count += 1;
        byKey.set(k, entry);
      });
    });
    if (state.size !== 'all' && !byKey.has(state.size.toLowerCase())) byKey.set(state.size.toLowerCase(), { name: state.size, count: 0 });
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
  const countWhere = (skip, test) => state.products.reduce((n, p) => n + (matchesFilters(p, skip) && test(p) ? 1 : 0), 0);

  // One sidebar per place it shows (desktop column, phone panel); each keeps its own open sections
  function makeSidebar(host) {
    const ui = { closed: new Set(), showAllSizes: false, minInput: state.sidebar.priceMin, maxInput: state.sidebar.priceMax, priceMin: state.sidebar.priceMin, priceMax: state.sidebar.priceMax };
    const option = ({ type = 'radio', checked, label, count, disabled, act }) =>
      `<label class="pfs-option${disabled && !checked ? ' pfs-option-disabled' : ''}"><input type="${type}"${checked ? ' checked' : ''}${disabled && !checked ? ' disabled' : ''} data-act="${esc(JSON.stringify(act))}"><span class="pfs-option-label">${label}</span>${count !== undefined ? `<span class="pfs-option-count">${count}</span>` : ''}</label>`;
    const section = (id, title, body) => {
      const open = !ui.closed.has(id);
      return `<div class="pfs-section"><button type="button" class="pfs-section-head" data-section="${id}" aria-expanded="${open}"><span>${title}</span>${svg('chevron-down', 16, { style: `transform:${open ? 'rotate(180deg)' : 'none'};transition:transform 0.2s;opacity:0.6` })}</button>${open ? `<div class="pfs-section-body">${body}</div>` : ''}</div>`;
    };
    function html() {
      const s = state.sidebar;
      if (s.priceMin !== ui.priceMin || s.priceMax !== ui.priceMax) { ui.priceMin = ui.minInput = s.priceMin; ui.priceMax = ui.maxInput = s.priceMax; }
      const cats = categoriesList();
      const selectedCat = cats.find((c) => c.name.toLowerCase() === state.category.toLowerCase());
      const subs = ((selectedCat && selectedCat.subcategories) || []).map((name) => ({ name, count: countWhere('subcategory', (p) => productInCategory(p, state.category, name)) }));
      const n = activeCount();
      let catBody = option({ checked: state.category === 'all', label: 'All Categories', act: ['category', 'all'] });
      cats.forEach((c) => {
        const count = countWhere('category', (p) => productInCategory(p, c.name));
        const selected = state.category.toLowerCase() === c.name.toLowerCase();
        catBody += option({ checked: selected, label: esc(c.name), count, disabled: count === 0, act: ['category', c.name] });
        if (selected && subs.length) {
          catBody += `<div class="pfs-sub">${option({ checked: !state.subcategory || state.subcategory === 'all', label: `All ${esc(c.name)}`, act: ['subcategory', 'all'] })}${subs.map((sub) => option({ checked: String(state.subcategory).toLowerCase() === sub.name.toLowerCase(), label: esc(sub.name), count: sub.count, disabled: sub.count === 0, act: ['subcategory', sub.name] })).join('')}</div>`;
        }
      });
      const priceBody = PRICE_RANGES.map((r) => {
        const count = countWhere('price', (p) => (Number(p.price) || 0) >= r.min && (Number(p.price) || 0) < r.max);
        return option({ type: 'checkbox', checked: s.priceRange === r.id, label: esc(r.label), count, disabled: count === 0, act: ['price', r.id] });
      }).join('') + `<form class="pfs-price-form"><input inputmode="numeric" placeholder="₹ Min" value="${esc(ui.minInput)}" aria-label="Minimum price" data-price="min"><span>to</span><input inputmode="numeric" placeholder="₹ Max" value="${esc(ui.maxInput)}" aria-label="Maximum price" data-price="max"><button type="submit">Go</button></form>`;
      const sizes = sidebarSizes();
      const visible = ui.showAllSizes ? sizes : sizes.slice(0, 8);
      const sizeBody = visible.map((z) => option({ type: 'checkbox', checked: state.size.toLowerCase() === z.name.toLowerCase(), label: esc(z.name), count: z.count, act: ['size', z.name] })).join('')
        + (sizes.length > 8 ? `<button type="button" class="pfs-more" data-more>${ui.showAllSizes ? 'Show less' : `Show ${sizes.length - 8} more`}</button>` : '');
      const discountBody = DISCOUNT_STEPS.map((v) => { const count = countWhere('discount', (p) => productDiscount(p) >= v); return option({ type: 'checkbox', checked: s.minDiscount === v, label: `${v}% or more`, count, disabled: count === 0, act: ['discount', v] }); }).join('');
      const ratingBody = RATING_STEPS.map((v) => { const count = countWhere('rating', (p) => (Number(p.ratingInfo && p.ratingInfo.rating) || 0) >= v); return option({ type: 'checkbox', checked: s.minRating === v, label: `<span style="display:inline-flex;align-items:center;gap:0.25rem">${v}${svg('star', 13, { color: '#f59e0b', fill: '#f59e0b' })} &amp; above</span>`, count, disabled: count === 0, act: ['rating', v] }); }).join('');
      const stockBody = option({ type: 'checkbox', checked: s.inStockOnly, label: 'In stock only', count: countWhere('stock', isInStock), act: ['stock'] });
      return `<div class="pfs-root"><div class="pfs-header"><span class="pfs-title">Filters</span>${n > 0 ? `<button type="button" class="pfs-clear" data-clear>Clear all (${n})</button>` : ''}</div>`
        + section('category', 'Category', catBody) + section('price', 'Price', priceBody)
        + (sizes.length ? section('size', 'Size / Variant', sizeBody) : '')
        + section('discount', 'Discount', discountBody) + section('rating', 'Customer Rating', ratingBody) + section('stock', 'Availability', stockBody) + '</div>';
    }
    function draw() { host.innerHTML = html(); }

    host.addEventListener('change', (e) => {
      const el = e.target.closest('input[data-act]');
      if (!el) return;
      const [kind, value] = JSON.parse(el.dataset.act);
      const s = state.sidebar;
      if (kind === 'category') return navigate(withParams((q) => { q.delete('subcategory'); if (value === 'all') q.delete('category'); else q.set('category', value); }));
      if (kind === 'subcategory') return navigate(withParams((q) => { if (value === 'all') q.delete('subcategory'); else q.set('subcategory', value); }));
      if (kind === 'size') { const next = state.size.toLowerCase() === value.toLowerCase() ? 'all' : value; return navigate(withParams((q) => { if (next === 'all') q.delete('size'); else q.set('size', next); })); }
      if (kind === 'price') state.sidebar = { ...s, priceRange: s.priceRange === value ? '' : value, priceMin: '', priceMax: '' };
      if (kind === 'discount') state.sidebar = { ...s, minDiscount: s.minDiscount === value ? 0 : value };
      if (kind === 'rating') state.sidebar = { ...s, minRating: s.minRating === value ? 0 : value };
      if (kind === 'stock') state.sidebar = { ...s, inStockOnly: !s.inStockOnly };
      render();
    });
    host.addEventListener('input', (e) => {
      const el = e.target.closest('input[data-price]');
      if (!el) return;
      el.value = el.value.replace(/\D/g, '');
      if (el.dataset.price === 'min') ui.minInput = el.value; else ui.maxInput = el.value;
    });
    host.addEventListener('submit', (e) => {
      e.preventDefault();
      state.sidebar = { ...state.sidebar, priceRange: '', priceMin: ui.minInput, priceMax: ui.maxInput };
      render();
    });
    host.addEventListener('click', (e) => {
      const head = e.target.closest('[data-section]');
      if (head) {
        const id = head.dataset.section;
        if (ui.closed.has(id)) ui.closed.delete(id); else ui.closed.add(id);
        draw();
        // Let the chevron turn, as it did when React re-rendered the same element
        const icon = host.querySelector(`[data-section="${id}"] svg`);
        const open = !ui.closed.has(id);
        icon.style.transform = open ? 'none' : 'rotate(180deg)';
        icon.getBoundingClientRect();
        icon.style.transform = open ? 'rotate(180deg)' : 'none';
        return;
      }
      if (e.target.closest('[data-more]')) { ui.showAllSizes = !ui.showAllSizes; draw(); return; }
      if (e.target.closest('[data-clear]')) resetFilters();
    });
    return { draw, host };
  }

  const desktopSidebar = makeSidebar(document.querySelector('[data-prod-sidebar]'));
  let drawerSidebar = null;

  /* ─── Phone / tablet filter panel ─── */
  const drawer = document.querySelector('[data-prod-drawer]');
  const drawerBody = drawer.querySelector('[data-prod-drawer-body]');
  const drawerCount = drawer.querySelector('[data-prod-drawer-count]');
  const isMobile = () => innerWidth < 1024;
  let drawerPrevOverflow = '';
  function openDrawer() {
    drawerBody.innerHTML = '';
    const host = document.createElement('div');
    drawerBody.appendChild(host);
    drawerSidebar = makeSidebar(host);
    drawerPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.hidden = false;
    render();
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    drawerSidebar = null;
    document.body.style.overflow = drawerPrevOverflow;
  }
  document.querySelector('[data-prod-open-filters]').addEventListener('click', openDrawer);
  drawer.querySelector('[data-prod-drawer-backdrop]').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('[data-prod-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawer));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  // The panel only exists on phones and tablets
  window.addEventListener('resize', () => { if (!isMobile()) closeDrawer(); });

  /* ─── Search bar with live suggestions ─── */
  const form = document.querySelector('[data-prod-search]');
  const input = form.querySelector('input');
  let focused = false, suggest = null, suggestKey = null, placeholder = 0;
  setInterval(() => { placeholder = (placeholder + 1) % PLACEHOLDERS.length; input.placeholder = PLACEHOLDERS[placeholder]; }, 3000);
  input.addEventListener('input', () => { state.search = input.value; render(); });
  input.addEventListener('focus', () => { focused = true; renderSuggest(); });
  input.addEventListener('blur', () => setTimeout(() => { focused = false; renderSuggest(); }, 200));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(withParams((q) => { if (state.search.trim()) q.set('search', state.search.trim()); else q.delete('search'); }));
  });

  function renderSuggest(list) {
    const show = focused && state.search.trim().length > 0;
    if (!show) {
      suggestKey = null;
      if (suggest && !suggest._leaving) {
        const el = suggest; el._leaving = true; suggest = null;
        animate(el, { opacity: 0, y: 10 }, { duration: 0.2 }).then(() => el.remove());
      }
      return;
    }
    const items = list || filtered();
    const key = JSON.stringify([state.search, items.slice(0, 5).map((p) => p._id || p.id), items.length]);
    if (suggest && key === suggestKey) return;
    suggestKey = key;
    const body = `<div style="padding:0.75rem 1.25rem;border-bottom:1px solid #f3f4f6;background-color:#fafafa"><span style="font-size:0.75rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Top Products Match</span></div>
      <div style="max-height:380px;overflow-y:auto">${items.length ? items.slice(0, 5).map((p) => `<a href="/product/${esc(p.id)}" class="dv-prod-suggest" style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.25rem;text-decoration:none;border-bottom:1px solid #f3f4f6;transition:all 0.2s">
          <div style="width:45px;height:45px;border-radius:8px;overflow:hidden;flex-shrink:0;background-color:#f9fafb"><img src="${esc(D.optimizedImage(p.image, 100))}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover"></div>
          <div style="flex:1;min-width:0"><h4 style="margin:0 0 0.25rem 0;font-size:0.85rem;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</h4><p style="margin:0;font-size:0.75rem;color:#6b7280">${esc(p.category)}</p></div>
          <div style="font-weight:700;font-size:0.9rem;color:var(--color-primary)">₹${esc(p.price)}</div></a>`).join('')
        : `<div style="padding:2rem;text-align:center;color:#6b7280;font-size:0.9rem">No matches found for "${esc(state.search)}"</div>`}</div>
      ${items.length > 5 ? `<div style="padding:0.75rem;text-align:center;border-top:1px solid #f3f4f6;background-color:#fafafa"><span style="font-size:0.8rem;color:var(--color-primary);font-weight:600">Press Enter to view all ${items.length} results</span></div>` : ''}`;
    if (suggest) { suggest.innerHTML = body; return; }
    suggest = document.createElement('div');
    suggest.style.cssText = 'position:absolute;top:100%;left:0;right:0;margin-top:0.75rem;background-color:#fff;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.08);border:1px solid rgba(var(--color-primary-rgb), 0.08);overflow:hidden;z-index:1000;opacity:0;transform:translateY(10px)';
    suggest.innerHTML = body;
    form.appendChild(suggest);
    animate(suggest, { opacity: [0, 1], y: [10, 0] }, { duration: 0.2 });
  }

  /* ─── Sort dropdown ─── */
  const sortWrap = document.querySelector('[data-prod-sort]');
  const sortBtn = sortWrap.querySelector('[data-prod-sort-btn]');
  const sortChevron = sortBtn.querySelector('.lucide-chevron-down');
  const sortValue = sortWrap.querySelector('[data-prod-sort-value]');
  const SORT_LABEL = { featured: 'Featured', 'price-low': 'Price: Low-High', 'price-high': 'Price: High-Low', name: 'Name: A-Z' };
  const OPACITY = { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] };
  const Y = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 };
  const SCALE = { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 };
  let sortMenu = null;
  const dot = '<div style="width:6px;height:6px;border-radius: 50%;background-color:var(--color-primary)"></div>';
  function openSort() {
    sortChevron.style.transform = 'rotate(180deg)';
    sortMenu = document.createElement('div');
    sortMenu.style.cssText = 'position:absolute;top:115%;right:0;left:0;background-color:#ffffff;border-radius:16px;box-shadow:0 15px 40px rgba(var(--color-primary-rgb), 0.08);padding:0.5rem;z-index:100;border:1px solid rgba(var(--color-primary-rgb), 0.05);box-sizing:border-box;opacity:0;transform:translateY(10px) scale(0.95)';
    sortMenu.innerHTML = SORTS.map((o) => {
      const on = state.sortBy === o.id;
      return `<button data-sort="${o.id}" style="width:100%;padding:0.75rem 1rem;border-radius:10px;border:none;background-color:${on ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent'};color:${on ? 'var(--color-primary)' : '#2D2D2D'};font-size:0.85rem;font-weight:${on ? 800 : 600};text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box">${o.label}${on ? dot : ''}</button>`;
    }).join('');
    sortMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      state.sortBy = b.dataset.sort;
      sortValue.textContent = SORT_LABEL[state.sortBy];
      closeSort();
      render();
    });
    sortWrap.appendChild(sortMenu);
    animate(sortMenu, { opacity: [0, 1] }, OPACITY);
    animate(sortMenu, { y: [10, 0] }, Y);
    animate(sortMenu, { scale: [0.95, 1] }, SCALE);
  }
  function closeSort() {
    if (!sortMenu) return;
    sortChevron.style.transform = 'rotate(0)';
    const el = sortMenu; sortMenu = null;
    el.style.pointerEvents = 'none';
    Promise.all([animate(el, { opacity: 0 }, OPACITY), animate(el, { y: 10 }, Y), animate(el, { scale: 0.95 }, SCALE)]).then(() => el.remove());
  }
  sortBtn.addEventListener('click', () => (sortMenu ? closeSort() : openSort()));
  const outside = (e) => { if (!sortWrap.contains(e.target)) closeSort(); };
  document.addEventListener('mousedown', outside);
  document.addEventListener('touchstart', outside);

  /* ─── Subcategory chips and the product grid ─── */
  const chipsEl = document.querySelector('[data-prod-chips]');
  const main = document.querySelector('[data-prod-main]');
  const applied = document.querySelector('[data-prod-applied]');
  const skeletonHTML = document.querySelector('template[data-prod-skeleton]').innerHTML;
  const cardCache = new Map();
  let gridEl = null;

  function renderChips() {
    if (state.category === 'all') { chipsEl.innerHTML = ''; return; }
    const cat = categoriesList().find((c) => c.name.toLowerCase() === state.category.toLowerCase());
    const chip = (on, label, value, upper) => `<button data-sub="${esc(value)}" style="padding:0.65rem 1.5rem;border-radius:100px;border:1px solid;border-color:${on ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.1)'};background-color:${on ? 'var(--color-primary)' : '#ffffff'};color:${on ? '#ffffff' : '#475569'};font-size:0.8rem;font-weight:700;cursor:pointer;white-space:nowrap;${upper}transition:all 0.25s ease;box-shadow:${on ? '0 6px 16px rgba(var(--color-primary-rgb), 0.15)' : 'none'};outline:none;letter-spacing:0.5px">${esc(label)}</button>`;
    chipsEl.innerHTML = `<div class="hide-scrollbar" style="display:flex;gap:0.65rem;overflow-x:auto;max-width:100%;box-sizing:border-box;padding:0.5rem 0.25rem 1.25rem 0.25rem;margin-bottom:2rem;scrollbar-width:none;-ms-overflow-style:none">`
      + chip(state.subcategory === 'all', `All ${categoryName()}`, 'all', 'text-transform:uppercase;')
      + ((cat && cat.subcategories) || []).map((sub) => chip(state.subcategory.toLowerCase() === sub.toLowerCase(), sub, sub, 'text-transform:uppercase;')).join('')
      + '</div>';
  }
  chipsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) navigate(withParams((q) => { if (b.dataset.sub === 'all') q.delete('subcategory'); else q.set('subcategory', b.dataset.sub); }));
  });

  function renderMain(list) {
    if (state.loading) {
      gridEl = null;
      main.innerHTML = `<div class="dv-prod-grid" style="display:grid;margin-top:1.5rem">${Array.from({ length: 8 }, () => skeletonHTML).join('')}</div>`;
      return;
    }
    if (!list.length) {
      gridEl = null;
      main.innerHTML = `<div class="dv-prod-empty" style="text-align:center;background-color:#ffffff;border-radius:24px;border:1px solid rgba(var(--color-primary-rgb), 0.08);box-shadow:0 10px 30px rgba(0, 0, 0, 0.04);color:#666;display:flex;flex-direction:column;align-items:center;max-width:480px;margin:1rem auto 2rem auto;width:100%;box-sizing:border-box">
          <div class="dv-prod-empty-icon" style="border-radius: 50%;background:linear-gradient(135deg, var(--color-primary) 0%, rgba(var(--color-primary-rgb), 0.6) 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(var(--color-primary-rgb), 0.25);flex-shrink:0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 01-8 0"></path></svg>
          </div>
          <div>
            <h2 style="margin:0 0 0.5rem 0;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.3">No Products Found</h2>
            <p style="margin:0 auto;color:#64748b;line-height:1.6;max-width:340px">No products match your selected filters. Try clearing your filters or search query.</p>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center">
            <button data-reset style="background-color:var(--color-primary);color:#ffffff;border:none;border-radius:100px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(var(--color-primary-rgb), 0.25);transition:all 0.25s ease">Reset Filters</button>
          </div>
        </div>`;
      return;
    }
    if (!gridEl || !gridEl.isConnected) {
      main.innerHTML = `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;font-size:0.88rem;color:#64748b"><span data-count></span></div><div class="dv-prod-grid" style="display:grid;margin-top:1rem"></div></div>`;
      gridEl = main.querySelector('.dv-prod-grid');
    }
    main.querySelector('[data-count]').innerHTML = `Showing <strong style="color:#0f172a">${list.length}</strong> ${list.length === 1 ? 'product' : 'products'}`;
    // React keeps each card (keyed by product id); a new size filter re-selects the card's variant
    const nodes = list.map((p) => {
      const k = `${p._id || p.id}|${state.size}`;
      let card = cardCache.get(k);
      if (!card) { card = D.productCards.create(p, { activeSize: state.size }); if (card) cardCache.set(k, card); }
      return card;
    }).filter(Boolean);
    gridEl.replaceChildren(...nodes);
  }
  main.addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) resetFilters(); });

  function render() {
    const list = filtered();
    renderHeader();
    renderChips();
    renderMain(list);
    desktopSidebar.draw();
    if (drawerSidebar) drawerSidebar.draw();
    drawerCount.textContent = `Show ${list.length} ${list.length === 1 ? 'product' : 'products'}`;
    const n = activeCount();
    applied.hidden = !n;
    applied.textContent = `${n} applied`;
    renderSuggest(list);
  }

  /* ─── Data ─── */
  function setProducts(list) {
    if (!Array.isArray(list) || !list.length) return;
    state.products = list;
    state.loading = false;
    render();
  }
  D.on('products', (map) => setProducts(Object.values(map)));
  fetch(`${D.API}/products?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).then((json) => {
    const list = json && (json.success && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
    setProducts(list || []);
  }).catch((e) => console.warn('ProductsClient: direct product fetch failed', e)).finally(() => { if (state.loading) { state.loading = false; render(); } });

  fetch(`${D.API}/categories`).then((r) => (r.ok ? r.json() : null)).then((data) => {
    const cats = data ? (Array.isArray(data) ? data : (data.data || [])) : [];
    if (cats.length) { state.categories = cats; render(); return; }
    throw new Error('no categories');
  }).catch(() => {
    const names = [...new Set(state.products.flatMap(categoryNames).filter(Boolean))];
    if (names.length) { state.categories = names.map((c) => ({ _id: c, name: c })); render(); }
  });

  // Opened from the navbar's phone search icon
  if (new URLSearchParams(location.search).get('focus') === 'search') {
    setTimeout(() => { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
  }
  window.addEventListener('popstate', onUrl);

  readUrl();
  render();
})();
