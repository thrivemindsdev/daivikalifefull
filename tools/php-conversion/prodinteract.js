// Products page interactions, React (:3000) vs Blade (:8090): sort menu, sidebar filters, subcategory /
// category navigation, live search suggestions and the phone filter panel. Compares text and screenshots
// of the catalogue area after each step. Only GET requests reach the live API.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;

const STEPS = {
  sortOpen: { vp: 'desktop', route: '/products?category=rudraksha', run: async (p) => { await p.click('button:has-text("Sort:")'); await p.waitForTimeout(900); }, shot: 'top' },
  sortHigh: { vp: 'desktop', route: '/products?category=rudraksha', run: async (p) => { await p.click('button:has-text("Sort:")'); await p.waitForTimeout(500); await p.click('button:has-text("Price: High to Low")'); await p.waitForTimeout(900); }, shot: 'catalog' },
  discount: { vp: 'desktop', route: '/products?category=bracelet', run: async (p) => { await p.click('aside label:has-text("30% or more")'); await p.waitForTimeout(900); }, shot: 'catalog' },
  priceGo: { vp: 'desktop', route: '/products?category=bracelet', run: async (p) => { await p.fill('aside input[aria-label="Minimum price"]', '1000'); await p.fill('aside input[aria-label="Maximum price"]', '3000'); await p.click('aside .pfs-price-form button'); await p.waitForTimeout(900); }, shot: 'catalog' },
  collapse: { vp: 'desktop', route: '/products?category=bracelet', run: async (p) => { await p.locator('aside .pfs-section-head', { hasText: 'Price' }).click(); await p.waitForTimeout(600); }, shot: 'aside' },
  pickCategory: { vp: 'desktop', route: '/products', run: async (p) => { await p.click('aside label:has-text("Ring")'); await p.waitForTimeout(1500); }, shot: 'catalog' },
  suggest: { vp: 'desktop', route: '/products', run: async (p) => { await p.click('input.store-search-input'); await p.keyboard.type('karungali', { delay: 30 }); await p.waitForTimeout(900); }, shot: 'top' },
  noMatch: { vp: 'desktop', route: '/products', run: async (p) => { await p.click('input.store-search-input'); await p.keyboard.type('zzzz', { delay: 30 }); await p.waitForTimeout(900); }, shot: 'catalog' },
  drawer: { vp: 'mobile', route: '/products?category=mala', run: async (p) => { await p.click('button:has-text("Filters")'); await p.waitForTimeout(900); }, shot: 'viewport' },
  drawerPick: { vp: 'mobile', route: '/products?category=mala', run: async (p) => { await p.click('button:has-text("Filters")'); await p.waitForTimeout(600); await p.click('[role="dialog"] label:has-text("In stock only")'); await p.waitForTimeout(600); }, shot: 'viewport' },
};
const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}%${A.width !== B.width || A.height !== B.height ? ` (${A.width}x${A.height} vs ${B.width}x${B.height})` : ''}`;
}

(async () => {
  const browser = await chromium.launch();
  const only = process.argv.slice(2);
  for (const [name, step] of Object.entries(STEPS)) {
    if (only.length && !only.includes(name)) continue;
    const res = {};
    for (const site of Object.keys(BASE)) {
      const mobile = step.vp === 'mobile';
      const ctx = await browser.newContext({ viewport: VPS[step.vp], deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      await ctx.route('**/*', async r => {
        const u = r.request().url();
        if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
        if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
        return r.continue();
      });
      await ctx.addInitScript(() => {
        try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {}
        const si = window.setInterval;
        window.setInterval = (fn, ms, ...a) => (ms === 3000 ? 0 : si(fn, ms, ...a));
        const s = document.createElement('style');
        s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
        document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
      await page.goto(BASE[site] + step.route, { waitUntil: 'load', timeout: 120000 });
      await page.waitForTimeout(6000);
      await step.run(page);
      await page.mouse.move(0, 0);
      const file = path.join(OUT, `pi_${name}_${site}.png`);
      const box = await page.evaluate((shot) => {
        const c = document.querySelector('h1').closest('.container');
        const pick = shot === 'aside' ? document.querySelector('aside.store-filter-sidebar') : shot === 'top' ? c : c;
        if (shot === 'viewport') return null;
        const r = pick.getBoundingClientRect();
        return { x: Math.max(0, r.left), y: r.top + scrollY, width: Math.min(r.width, innerWidth), height: shot === 'top' ? Math.min(r.height, 700) : r.height };
      }, step.shot);
      if (step.shot !== 'viewport') {
        await page.evaluate(() => document.querySelectorAll('body *').forEach(e => { const p = getComputedStyle(e).position; if ((p === 'fixed' || p === 'sticky') && !e.closest('aside') && !e.closest('[role="dialog"]')) e.style.visibility = 'hidden'; }));
      }
      await page.screenshot(box ? { path: file, clip: box, fullPage: true } : { path: file });
      const t = await page.evaluate((shot) => {
        const el = shot === 'viewport' ? (document.querySelector('[role="dialog"]') || document.body) : document.querySelector('h1').closest('.container');
        return el.innerText.replace(/\s+/g, ' ').trim();
      }, step.shot);
      res[site] = { file, text: t, url: page.url().replace(/^https?:\/\/[^/]+/, ''), errors };
      await ctx.close();
    }
    const R = res.react, B = res.blade;
    console.log(`${name.padEnd(13)} url ${R.url === B.url ? 'SAME' : `DIFF ${R.url} vs ${B.url}`} text ${R.text === B.text ? 'SAME' : 'DIFF'} px ${pxDiff(R.file, B.file, path.join(OUT, `pi_${name}_DIFF.png`))}${B.errors.length ? ' blade errors ' + JSON.stringify(B.errors) : ''}`);
    if (R.text !== B.text) { let k = 0; while (R.text[k] === B.text[k]) k++; console.log('   react: …' + R.text.slice(Math.max(0, k - 60), k + 140), '\n   blade: …' + B.text.slice(Math.max(0, k - 60), k + 140)); }
  }
  await browser.close();
})();
