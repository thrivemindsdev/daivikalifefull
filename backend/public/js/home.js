// Home page (app/(store)/page.jsx, components/PremiumHero.jsx, components/home/SacredSection.jsx,
// components/PageLoader.jsx). Product sections fill from /api/products as on the React page: skeletons
// while loading, sections with no products hidden afterwards.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const H = window.DaivikaHome;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const svg = (name, size, { color = 'currentColor', fill = 'none', stroke = 2, style = '', extraClass = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}${extraClass ? ' ' + extraClass : ''}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };
  const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
  const keyOf = (p) => String(p._id || p.id);
  const THEMES = H.themes.map((t) => ({ ...t, re: new RegExp(t.match, 'i') }));

  const root = document.querySelector('[data-home]');
  const skeletonHTML = document.querySelector('template[data-home-skeleton]').innerHTML;
  const skeletons = (n) => Array.from({ length: n }, () => skeletonHTML).join('');

  const state = {
    products: [],
    loading: true,
    tab: 'new_arrivals',
    bestsellerIds: [],
    stories: [],
    featureCards: D.read('vaugun_feature_cards', null) || H.featureCards,
  };

  /* ─── Hero banner slider (PremiumHero) ─── */
  const isDummy = (url) => {
    if (!url || typeof url !== 'string') return true;
    const u = url.toLowerCase();
    return u.includes('/assets/b1') || u.includes('/assets/b2') || u.includes('/assets/b3') || u.includes('/assets/slide') || u.includes('unsplash.com');
  };
  const isValidBanner = (b) => Boolean(b && ((b.image && !isDummy(b.image)) || (b.mobileImage && !isDummy(b.mobileImage))));
  const heroMount = root.querySelector('[data-home-hero]');
  const hero = { slides: [], current: 0, timer: null, section: null, box: null, layer: null, dots: null, touchX: null };

  try {
    localStorage.removeItem('vaugun_banners');
    const saved = localStorage.getItem('daivika_banners');
    if (saved && (saved.includes('posters__') || saved.includes('Smart Products'))) localStorage.removeItem('daivika_banners');
    const parsed = D.read('daivika_banners', null);
    const list = Array.isArray(parsed) ? parsed : ((parsed && parsed.data) || []);
    hero.slides = list.filter(isValidBanner).slice(0, 6);
  } catch (e) {}

  const heroMobile = () => innerWidth <= 768;

  function slideLayer(slide) {
    const mobile = slide.mobileImage && !isDummy(slide.mobileImage) ? slide.mobileImage : '';
    const desktop = slide.image && !isDummy(slide.image) ? slide.image : '';
    const alt = esc(slide.title || 'Daivika Banner');
    const picture = `<picture style="display:block;width:100%;height:100%"><source media="(max-width: 768px)" srcset="${esc(mobile || desktop)}"><img src="${esc(desktop || mobile)}" alt="${alt}" loading="eager" fetchpriority="high" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;image-rendering:-webkit-optimize-contrast;transform:translateZ(0);backface-visibility:hidden"></picture>`;
    const layer = html(`<div style="position:absolute;inset:0;width:100%;height:100%;will-change:opacity, transform;transform:translateZ(0)">${slide.link ? `<a href="${esc(slide.link)}" style="display:block;width:100%;height:100%;text-decoration:none;cursor:pointer">${picture}</a>` : picture}</div>`);
    const img = layer.querySelector('img');
    img.addEventListener('error', () => {
      const fallback = img.src.includes(desktop) ? mobile : desktop;
      if (fallback && !img.src.includes(fallback)) { img.src = fallback; return; }
      img.style.display = 'none';
    });
    return layer;
  }

  function startTimer() {
    clearInterval(hero.timer);
    if (hero.slides.length > 1) hero.timer = setInterval(() => goTo((hero.current + 1) % hero.slides.length, false), 5000);
  }

  function goTo(index, manual) {
    if (index === hero.current && hero.layer) { if (manual) startTimer(); return; }
    hero.current = index;
    const old = hero.layer;
    hero.layer = slideLayer(hero.slides[index] || hero.slides[0]);
    hero.box.insertBefore(hero.layer, hero.box.querySelector('.dv-hero-arrow'));
    animate(hero.layer, { opacity: [0, 1] }, { duration: 0.45, ease: 'easeInOut' });
    if (old) animate(old, { opacity: 0 }, { duration: 0.45, ease: 'easeInOut' }).then(() => old.remove());
    drawDots();
    if (manual) startTimer();
  }

  function drawDots() {
    if (!hero.dots) return;
    [...hero.dots.children].forEach((d, i) => d.classList.toggle('dv-on', i === hero.current));
  }

  function renderHero() {
    clearInterval(hero.timer);
    heroMount.innerHTML = '';
    hero.section = hero.box = hero.layer = hero.dots = null;
    if (!hero.slides.length) return;
    if (hero.current >= hero.slides.length) hero.current = 0;
    const section = html(`<section class="daivika-hero-section" style="width:100%;position:relative;background-color:#0a0a0a;overflow:hidden;box-sizing:border-box"><div class="daivika-hero-aspect-container">
      <button type="button" class="dv-hero-arrow" style="border-radius: 50%" aria-label="Previous Slide">${svg('chevron-left', 22, { stroke: 2.5, extraClass: 'dv-l' })}${svg('chevron-left', 18, { stroke: 2.5, extraClass: 'dv-s' })}</button>
      <button type="button" class="dv-hero-arrow dv-next" style="border-radius: 50%" aria-label="Next Slide">${svg('chevron-right', 22, { stroke: 2.5, extraClass: 'dv-l' })}${svg('chevron-right', 18, { stroke: 2.5, extraClass: 'dv-s' })}</button>
      ${hero.slides.length > 1 ? `<div class="dv-hero-dots">${hero.slides.map((_, i) => `<button type="button" class="dv-hero-dot" aria-label="Go to slide ${i + 1}"></button>`).join('')}</div>` : ''}
    </div></section>`);
    hero.section = section;
    hero.box = section.firstChild;
    hero.dots = section.querySelector('.dv-hero-dots');
    hero.layer = slideLayer(hero.slides[hero.current]);
    hero.box.insertBefore(hero.layer, hero.box.firstChild);
    const [prev, next] = section.querySelectorAll('.dv-hero-arrow');
    prev.addEventListener('click', () => goTo((hero.current - 1 + hero.slides.length) % hero.slides.length, true));
    next.addEventListener('click', () => goTo((hero.current + 1) % hero.slides.length, true));
    if (hero.dots) [...hero.dots.children].forEach((d, i) => d.addEventListener('click', () => goTo(i, true)));
    section.addEventListener('touchstart', (e) => { hero.touchX = e.touches[0].clientX; }, { passive: true });
    section.addEventListener('touchend', (e) => {
      if (!hero.touchX) return;
      const diff = hero.touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) goTo((hero.current + 1) % hero.slides.length, true);
        else goTo((hero.current - 1 + hero.slides.length) % hero.slides.length, true);
      }
      hero.touchX = null;
    });
    drawDots();
    heroMount.appendChild(section);
    startTimer();
    preloadSlides();
  }

  // First slide straight away, the rest a little later
  function preloadSlides() {
    const src = (s) => (heroMobile() ? (s.mobileImage || s.image) : (s.image || s.mobileImage));
    const first = src(hero.slides[0]);
    if (first) { const img = new Image(); img.fetchPriority = 'high'; img.src = first; }
    setTimeout(() => hero.slides.slice(1).forEach((s) => { const u = src(s); if (u) new Image().src = u; }), 1200);
  }

  function setSlides(list) {
    const valid = list.filter(isValidBanner);
    if (!valid.length) return;
    const next = valid.slice(0, 6);
    if (JSON.stringify(next) === JSON.stringify(hero.slides)) return;
    hero.slides = next;
    renderHero();
  }

  async function loadBanners() {
    try {
      localStorage.removeItem('vaugun_banners');
      const res = await fetch(`${D.API}/public/banners?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const list = Array.isArray(data) ? data : ((data && data.data) || []);
      const valid = list.filter(isValidBanner);
      if (valid.length) {
        try { localStorage.setItem('daivika_banners', JSON.stringify(valid)); } catch (e) {}
        setSlides(valid);
      }
    } catch (e) { console.warn('Banners endpoint offline.'); }
  }

  renderHero();
  // The admin saved new banners: fetch them again rather than trust the cache
  ['daivika_settings_updated', 'vaugun_settings_updated'].forEach((ev) => window.addEventListener(ev, () => {
    try { localStorage.removeItem('vaugun_banners'); localStorage.removeItem('daivika_banners'); } catch (e) {}
    loadBanners();
  }));

  /* ─── Product lists ─── */
  const time = (p) => new Date(p.createdAt || p.dateAdded || p._id || 0).getTime();
  const text = (v) => (typeof v === 'object' && v ? v.name || v.slug || '' : String(v || ''));
  const matchesTheme = (p, theme) => {
    if (!p) return false;
    const hay = [
      p.name, text(p.category), text(p.subcategory),
      ...(Array.isArray(p.extraCategories) ? p.extraCategories.flatMap((e) => [e && e.category, e && e.subcategory]) : []),
      Array.isArray(p.tags) ? p.tags.join(' ') : p.tags,
    ].filter(Boolean).join(' ');
    return theme.re.test(hay);
  };

  function lists() {
    const all = state.products;
    const newArrivals = [...all].sort((a, b) => time(b) - time(a)).slice(0, 8);
    const score = (p) => Number(p.soldCount || p.ordersCount || 0) + (p.featured ? 20 : 0) + ((p.ratingInfo && p.ratingInfo.count) || 0);
    const trending = [...all].sort((a, b) => score(b) - score(a)).slice(0, 8);
    const combos = all.filter((p) => {
      if (!p) return false;
      const cat = (typeof p.category === 'object' ? ((p.category && (p.category.name || p.category.slug)) || '') : String(p.category || '')).toLowerCase().trim();
      const sub = String(p.subcategory || '').toLowerCase().trim();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : String(p.tags || '').toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const badge = String(p.badge || '').toLowerCase();
      const collection = String(p.collection || '').toLowerCase();
      return cat.includes('combo') || cat.includes('compos') || cat.includes('bundle') || cat.includes('pack')
        || sub.includes('combo') || sub.includes('bundle')
        || tags.includes('combo') || tags.includes('bundle') || tags.includes('pack')
        || name.includes('combo') || name.includes('bundle') || name.includes('2 in 1') || name.includes('3 in 1')
        || badge.includes('combo') || collection.includes('combo')
        || p.isCombo === true || String(p.isCombo) === 'true';
    }).slice(0, 8);

    // Products already shown in an earlier themed section go to the back
    const themed = {};
    const shown = new Set();
    THEMES.forEach((theme) => {
      const m = all.filter((p) => matchesTheme(p, theme));
      themed[theme.id] = [...m.filter((p) => !shown.has(keyOf(p))), ...m.filter((p) => shown.has(keyOf(p)))];
      themed[theme.id].slice(0, 8).forEach((p) => shown.add(keyOf(p)));
    });

    // Ranked by units sold, topped up with trending products while sales are few
    const byId = new Map(all.map((p) => [keyOf(p), p]));
    const ranked = state.bestsellerIds.map((id) => byId.get(String(id))).filter(Boolean);
    let bestsellers = ranked;
    if (ranked.length < 4) {
      const seen = new Set(ranked.map(keyOf));
      bestsellers = [...ranked, ...trending.filter((p) => !seen.has(keyOf(p)))];
    }

    const latest = [...all].sort((a, b) => {
      if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
      return String(b._id || b.id || '').localeCompare(String(a._id || a.id || ''));
    }).slice(0, 8);

    return { tabs: { new_arrivals: newArrivals, trending, combos }, themed, bestsellers, latest };
  }

  // Fills a grid with product cards, keeping the cards it already shows (React keys by product id)
  function fillGrid(grid, products) {
    const old = grid._cards || new Map();
    const cards = new Map();
    const nodes = [];
    products.forEach((p) => {
      const id = keyOf(p);
      let card = old.get(id);
      if (!card) card = D.productCards.create(p);
      if (!card) return;
      cards.set(id, card);
      nodes.push(card);
    });
    grid._cards = cards;
    grid.replaceChildren(...nodes);
  }

  /* ─── Tabs: New arrivals / Trending / Combos ─── */
  const tabsSection = root.querySelector('[data-home-tabs-section]');
  const panelHost = root.querySelector('[data-home-tab-panel]');
  const underline = root.querySelector('[data-home-underline]');
  let panel = panelHost;
  let switching = null;
  let exiting = false;

  function drawPanel(target) {
    if (state.loading) { target.innerHTML = `<div class="home-product-grid">${skeletons(4)}</div>`; return; }
    const products = lists().tabs[state.tab];
    if (!products.length) { target.innerHTML = ''; target._grid = null; return; }
    let grid = target._grid;
    if (!grid || !grid.isConnected) { target.innerHTML = '<div class="home-product-grid"></div>'; grid = target._grid = target.firstChild; }
    fillGrid(grid, products);
  }

  function enterPanel() {
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(15px)';
    animate(panel, { opacity: [0, 1], y: [15, 0] }, { duration: 0.3 });
  }

  function selectTab(id) {
    if (id === state.tab) return;
    const buttons = [...tabsSection.querySelectorAll('[data-home-tab]')];
    const from = underline.getBoundingClientRect();
    state.tab = id;
    buttons.forEach((b) => {
      const on = b.dataset.homeTab === id;
      b.style.fontWeight = on ? '800' : '700';
      b.style.color = on ? '#360910' : '#64748b';
    });
    // The underline glides to the new tab (framer layoutId)
    const button = buttons.find((b) => b.dataset.homeTab === id);
    button.appendChild(underline);
    const to = underline.getBoundingClientRect();
    animate(underline, {
      x: [(from.left + from.width / 2) - (to.left + to.width / 2), 0],
      scaleX: [from.width / to.width, 1],
    }, { type: 'spring', stiffness: 400, damping: 30 });

    // AnimatePresence mode="wait": the old products leave, then the new ones arrive
    const token = switching = {};
    exiting = true;
    animate(panel, { opacity: 0, y: -15 }, { duration: 0.3 }).then(() => {
      if (switching !== token) return;
      exiting = false;
      panel._grid = null;
      drawPanel(panel);
      enterPanel();
    });
  }
  tabsSection.querySelectorAll('[data-home-tab]').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.homeTab)));

  /* ─── Themed sections, bestsellers and stories (SacredSection) ─── */
  const themedHost = root.querySelector('[data-home-themed]');
  const heading = (s, viewAll) => `<div class="dv-home-heading" style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;text-align:left">
      <div style="display:flex;flex-direction:column;gap:0.3rem;max-width:760px;flex:1 1 320px;align-items:flex-start;margin:0">
        <span style="color:#c5831a;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:2.2px;display:inline-flex;align-items:center;gap:0.45rem"><span style="font-size:0.6rem">✦</span>${esc(s.eyebrow)}</span>
        <h2 class="dv-home-h2" style="font-weight:800;color:#0a0a0a;font-family:'Plus Jakarta Sans', 'Poppins', sans-serif;margin:0;letter-spacing:-0.3px;line-height:1.2">${esc(s.title)}</h2>
        ${s.description ? `<p class="dv-home-intro" style="margin:0.25rem 0 0;color:#5f5a55;line-height:1.65">${esc(s.description)}</p>` : ''}
      </div>
      <a data-view-all href="${esc(viewAll)}" hidden style="display:inline-flex;align-items:center;gap:0.35rem;color:#360910;font-weight:700;font-size:0.82rem;text-decoration:none;padding:0.5rem 0.95rem;border-radius:999px;border:1px solid rgba(197,131,26,0.45);background:#fff;white-space:nowrap">View all ${svg('arrow-right', 14)}</a>
    </div>`;

  function productSection(s, background, viewAll, pick) {
    const el = html(`<section class="dv-home-themed" style="background-color:${background};width:100%;box-sizing:border-box"><div style="max-width:1560px;margin:0 auto;width:100%;box-sizing:border-box">${heading(s, viewAll)}<div class="home-product-grid"></div></div></section>`);
    const grid = el.querySelector('.home-product-grid');
    const link = el.querySelector('[data-view-all]');
    return {
      el,
      draw(l) {
        if (state.loading) { el.hidden = false; link.hidden = true; grid._cards = null; grid.innerHTML = skeletons(4); return; }
        const products = pick(l) || [];
        el.hidden = !products.length;
        link.hidden = !products.length;
        fillGrid(grid, products.slice(0, 8));
      },
    };
  }

  const youTubeId = (url = '') => (String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/) || [])[1];
  const isCloudinaryVideo = (url) => /res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(String(url || ''));
  const videoThumb = (url, width) => String(url).replace('/video/upload/', `/video/upload/so_1,f_jpg,c_limit,w_${width}/`).replace(/\.[a-z0-9]+$/i, '.jpg');

  const storiesSlot = document.createElement('div');
  storiesSlot.style.display = 'contents';
  let storiesKey = null;
  function drawStories() {
    const items = (state.stories || []).filter((s) => s && (s.image || youTubeId(s.link) || isCloudinaryVideo(s.link)));
    const key = JSON.stringify(items);
    if (key === storiesKey) return;
    storiesKey = key;
    storiesSlot.innerHTML = '';
    if (!items.length) return;
    const S = H.stories;
    const cards = items.map((s, i) => {
      const yt = youTubeId(s.link);
      const video = isCloudinaryVideo(s.link);
      const img = s.image ? D.optimizedImage(s.image, 600) : video ? videoThumb(s.link, 640) : `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
      const tag = s.link ? 'a' : 'div';
      const attrs = s.link ? ` href="${esc(s.link)}" target="_blank" rel="noopener noreferrer"` : '';
      const play = yt || video || /instagram\.com\/(reel|p)\//.test(s.link || '')
        ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);width:56px;height:56px;border-radius: 50%;background:rgba(54,9,16,0.75);border:1px solid rgba(252,211,77,0.6);display:flex;align-items:center;justify-content:center">${svg('play', 22, { color: '#fcd34d', fill: '#fcd34d' })}</span>` : '';
      const caption = s.title || s.caption
        ? `<div style="position:absolute;left:0;right:0;bottom:0;padding:2.5rem 1rem 1rem;background:linear-gradient(180deg, transparent, rgba(20,2,5,0.92))">${s.title ? `<div style="font-weight:800;font-size:1rem;color:#fde68a">${esc(s.title)}</div>` : ''}${s.caption ? `<div style="font-size:0.8rem;color:rgba(255,255,255,0.82);margin-top:4px;line-height:1.5">${esc(s.caption)}</div>` : ''}</div>` : '';
      return `<${tag} class="story-card"${attrs}><img src="${esc(img)}" alt="${esc(s.title || 'Daivika story')}" loading="lazy">${play}${caption}</${tag}>`;
    }).join('');
    const arrows = items.length > 1
      ? `<div style="display:flex;gap:0.5rem">${[[-1, 'chevron-left', 'Previous'], [1, 'chevron-right', 'Next']].map(([dir, icon, label]) => `<button type="button" data-dir="${dir}" aria-label="${label}" style="width:38px;height:38px;border-radius: 50%;border:1px solid rgba(252,211,77,0.45);background:transparent;color:#fcd34d;cursor:pointer;display:flex;align-items:center;justify-content:center">${svg(icon, 18)}</button>`).join('')}</div>` : '';
    const el = html(`<section class="dv-home-stories" style="background:linear-gradient(180deg, #360910 0%, #28060b 100%);width:100%;box-sizing:border-box">
      <div class="dv-home-stories-inner" style="max-width:1560px;margin:0 auto;box-sizing:border-box">
        <div class="dv-home-heading" style="display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:0.3rem;max-width:760px;flex:1 1 320px">
            <span style="color:#fcd34d;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:2.2px">✦ ${esc(S.eyebrow)}</span>
            <h2 class="dv-home-h2" style="font-weight:800;color:#fff;font-family:'Plus Jakarta Sans', 'Poppins', sans-serif;margin:0;line-height:1.2">${esc(S.title)}</h2>
            <p class="dv-home-intro" style="margin:0.25rem 0 0;color:rgba(253,244,220,0.78);line-height:1.65">${esc(S.description)}</p>
          </div>${arrows}
        </div>
      </div>
      <div class="stories-track" style="max-width:1560px;margin:0 auto">${cards}</div>
    </section>`);
    const track = el.querySelector('.stories-track');
    el.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: Number(b.dataset.dir) * (track.clientWidth * 0.8), behavior: 'smooth' })));
    storiesSlot.appendChild(el);
  }

  const [rituals, ...rest] = THEMES;
  const sections = [
    productSection(rituals, '#FAF8F5', `/products?theme=${rituals.id}`, (l) => l.themed[rituals.id]),
    productSection(H.bestsellers, '#ffffff', '/products', (l) => l.bestsellers),
    ...rest.map((t, i) => productSection(t, i % 2 ? '#ffffff' : '#FAF8F5', `/products?theme=${t.id}`, (l) => l.themed[t.id])),
  ];
  themedHost.append(sections[0].el, sections[1].el, storiesSlot, ...sections.slice(2).map((s) => s.el));

  /* ─── Shop by Collection (only its loading shimmer ever shows), Latest Collection ─── */
  const collections = root.querySelector('[data-home-collections]');
  const latest = root.querySelector('[data-home-latest]');
  const latestGrid = latest.querySelector('[data-home-latest-grid]');

  /* ─── Feature cards ─── */
  const featureRow = root.querySelector('[data-home-features]');
  const FEATURE_ICONS = {
    Flame: 'flame', Truck: 'truck', Sparkles: 'sparkles', Sprout: 'sprout', Star: 'star', Zap: 'activity', ShieldCheck: 'shield-check',
    Gift: 'gift', Headphones: 'headphones', Package: 'shopping-bag', Tag: 'percent', Heart: 'star', Award: 'sparkles',
  };
  function drawFeatures() {
    if (state.loading) return;
    featureRow.classList.remove('dv-loading');
    featureRow.innerHTML = (state.featureCards || []).map((card) => `<div class="premium-feature-card dv-home-feature" style="flex-shrink:0">
        <span style="position:absolute;top:6px;right:8px;font-size:0.6rem;color:rgba(197, 131, 26, 0.4);line-height:1;pointer-events:none;user-select:none">✦</span>
        <div class="feature-icon-box">
          ${card.image ? `<img src="${esc(card.image)}" alt="${esc(card.title || 'Feature')}" style="width:24px;height:24px;object-fit:contain;display:block" onerror="this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='flex'">` : ''}
          <div style="display:${card.image ? 'none' : 'flex'};align-items:center;justify-content:center;width:100%;height:100%">${svg(FEATURE_ICONS[card.icon] || 'sparkles', 20, { color: '#fcd34d', style: 'flex-shrink: 0;' })}</div>
        </div>
        <div style="min-width:0;position:relative;z-index:2">
          <h4 style="font-size:0.84rem;font-weight:800;color:#2a0508;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:&quot;Poppins&quot;, sans-serif;letter-spacing:0.2px">${esc(card.title)}</h4>
          <p style="font-size:0.72rem;color:#78350f;margin:0.2rem 0 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500">${esc(card.desc)}</p>
        </div>
      </div>`).join('');
  }
  const syncFeatureCards = () => { const saved = D.read('vaugun_feature_cards', null); if (saved) { state.featureCards = saved; drawFeatures(); } };
  window.addEventListener('storage', syncFeatureCards);
  window.addEventListener('vaugun_settings_updated', syncFeatureCards);

  /* ─── Redraw everything that depends on the products ─── */
  function draw() {
    const l = state.loading ? null : lists();
    // Tabs section shows while loading or when there are products
    tabsSection.hidden = !state.loading && !state.products.length;
    if (!exiting) drawPanel(panel);
    sections.forEach((s) => s.draw(l));
    collections.hidden = !state.loading;
    latest.hidden = !state.loading && !l.latest.length;
    latest.querySelector('[data-home-latest-head-skel]').hidden = !state.loading;
    latest.querySelector('[data-home-latest-head]').hidden = state.loading;
    if (state.loading) { latestGrid._cards = null; latestGrid.innerHTML = skeletons(4); } else fillGrid(latestGrid, l.latest);
    drawFeatures();
  }

  function setProducts(list) {
    if (!Array.isArray(list) || !list.length) return;
    state.products = list;
    state.loading = false;
    draw();
  }
  function doneLoading() {
    if (!state.loading) return;
    state.loading = false;
    draw();
  }

  D.on('products', (map) => setProducts(Object.values(map)));
  fetch(`${D.API}/products?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).then((json) => {
    if (!json) return;
    setProducts(json.data || json);
  }).catch((e) => console.warn('Direct homepage products fetch fallback error:', e));

  fetch(`${D.API}/public/bestsellers`).then((r) => (r.ok ? r.json() : null)).then((j) => {
    state.bestsellerIds = ((j && j.data) || []).map((r) => r.productId);
    if (!state.loading) draw();
  }).catch(() => {});

  // Settings: announcements, feature cards and the Sacred Stories gallery
  fetch(`${D.API}/public/settings?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).then((json) => {
    if (!json) return;
    const data = json.data || json;
    if (data && data.announcements) localStorage.setItem('vaugun_announcements', JSON.stringify(data.announcements));
    if (data && data.free_shipping_threshold !== undefined) localStorage.setItem('vaugun_free_shipping_threshold', data.free_shipping_threshold);
    if (data && Array.isArray(data.feature_cards) && data.feature_cards.length) {
      localStorage.setItem('vaugun_feature_cards', JSON.stringify(data.feature_cards));
      state.featureCards = data.feature_cards;
      drawFeatures();
    }
    state.stories = Array.isArray(data && data.sacred_stories) ? data.sacred_stories : [];
    drawStories();
  }).catch((e) => console.warn('Could not load announcements from DB on homepage:', e));

  // The banners request also ends the loading state, as on the React page
  loadBanners().finally(doneLoading);

  draw();

  /* ─── Splash (PageLoader) and the page fade-in ─── */
  const loader = document.querySelector('[data-loader]');
  function showPage() {
    root.hidden = false;
    animate(root, { opacity: [0, 1] }, { duration: 0.5 });
    // The tab panel animates in when it mounts (AnimatePresence)
    enterPanel();
  }
  function startSplash() {
  if (loader) {
    const started = Date.now();
    // Scroll stays locked while the splash shows (the cart drawer script unlocks it on load)
    document.body.style.overflow = 'hidden';
    animate(loader.querySelector('[data-loader-logo]'), { scale: [0.95, 1], opacity: [0, 1] }, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    // framer's x replaces the element's skewX transform, so the shine only slides
    animate(loader.querySelector('[data-loader-shine]'), { x: ['-150%', '150%'] }, { duration: 2.2, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' });
    animate(loader.querySelector('[data-loader-bar]'), { scaleX: [0, 1] }, { duration: 2.2, ease: 'easeInOut' });
    // The page appears behind the splash after 300 ms; the splash stays at least 2.2 s, then slides up
    setTimeout(() => {
      try { sessionStorage.setItem('daivika_initial_loaded', 'true'); } catch (e) {}
      showPage();
    }, 300);
    setTimeout(() => {
      document.body.style.overflow = '';
      loader.style.pointerEvents = 'none';
      animate(loader.querySelector('[data-loader-logo]'), { opacity: 0, y: -15 }, { duration: 0.4, ease: 'easeOut' });
      animate(loader, { y: '-100%' }, { duration: 0.95, ease: [0.76, 0, 0.24, 1] }).then(() => loader.remove());
    }, Math.max(0, 2200 - (Date.now() - started)));
  } else {
    showPage();
  }
  }

  startSplash();
})();
