// Home animations, React (:3000) vs Blade (:8090): splash (fresh session), tab switch, banner change.
// Samples computed styles over time; nothing is sent to the live store.
const { chromium } = require('playwright');
const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;

async function open(browser, site, { fresh }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
    if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
    return r.continue();
  });
  await ctx.addInitScript((fresh) => {
    try { localStorage.setItem('daivika_coupon_popup_seen', '1'); if (!fresh) sessionStorage.setItem('daivika_initial_loaded', 'true'); } catch (e) {}
  }, fresh);
  const page = await ctx.newPage();
  return { ctx, page };
}

// Samples elements every ~100 ms for `ms`, starting when `start` returns true in the page
const sampler = `(async ({ ms, start }) => {
  const t0 = performance.now(); const out = [];
  const q = { loader: () => [...document.querySelectorAll('div')].find(d => { const c = getComputedStyle(d); return c.zIndex === '99999' && c.position === 'fixed' && c.backgroundColor === 'rgb(250, 248, 245)'; }),
    shine: () => { const l = q.loader(); return l && [...l.querySelectorAll('div')].find(d => (d.style.background || '').includes('linear-gradient(110deg')); },
    bar: () => { const l = q.loader(); return l && [...l.querySelectorAll('div')].find(d => getComputedStyle(d).backgroundColor === 'rgb(166, 124, 82)'); },
    logo: () => { const l = q.loader(); return l && l.firstElementChild; } };
  while (performance.now() - t0 < ms) {
    const row = { t: Math.round(performance.now() - t0) };
    for (const k of Object.keys(q)) { const e = q[k](); row[k] = e ? (k === 'loader' ? getComputedStyle(e).transform : k === 'logo' ? getComputedStyle(e).opacity + ' ' + getComputedStyle(e).transform : getComputedStyle(e).transform) : '-'; }
    row.body = document.body.style.overflow;
    out.push(row);
    await new Promise(r => setTimeout(r, 150));
  }
  return out;
})`;

(async () => {
  const browser = await chromium.launch();
  const what = process.argv[2] || 'splash';
  for (const site of Object.keys(BASE)) {
    if (what === 'splash') {
      const { ctx, page } = await open(browser, site, { fresh: true });
      page.goto(BASE[site] + '/', { waitUntil: 'commit' });
      await page.waitForFunction(() => [...document.querySelectorAll('div')].some(d => getComputedStyle(d).zIndex === '99999'), null, { timeout: 120000, polling: 20 });
      const rows = await page.evaluate(`${sampler}({ ms: ${Number(process.env.MS || 4200)} })`);
      console.log(`\n${site}`); rows.forEach(r => console.log(`  ${String(r.t).padStart(5)} loader=${r.loader} logo=${r.logo} bar=${r.bar} shine=${r.shine} body=${r.body}`));
      await ctx.close();
    }
    if (what === 'tabs') {
      const { ctx, page } = await open(browser, site, { fresh: false });
      await page.goto(BASE[site] + '/', { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(6000);
      const btn = page.locator('button:has-text("TRENDING")');
      await btn.scrollIntoViewIfNeeded();
      const rows = await page.evaluate(async () => {
        const tabs = [...document.querySelectorAll('button')].filter(b => /^(NEW ARRIVALS|TRENDING|COMBOS)$/.test(b.innerText.trim()));
        const grid = () => document.querySelector('.home-product-grid').parentElement;
        const line = () => tabs.map(b => b.querySelector('div')).find(Boolean);
        const out = []; const t0 = performance.now();
        tabs[1].click();
        while (performance.now() - t0 < 1100) {
          const g = grid(), l = line();
          out.push(`${Math.round(performance.now() - t0)} panel=${getComputedStyle(g).opacity}/${getComputedStyle(g).transform} first=${(g.querySelector('h3,h4,.product-card-title') || {}).innerText || ''} line=${l ? Math.round(l.getBoundingClientRect().left) + '/' + Math.round(l.getBoundingClientRect().width) : '-'}`);
          await new Promise(r => setTimeout(r, 50));
        }
        return out;
      });
      console.log(`\n${site}`); rows.forEach(r => console.log('  ' + r.slice(0, 200)));
      await ctx.close();
    }
  }
  await browser.close();
})();
