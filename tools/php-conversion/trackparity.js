// Order tracking parity (React :3000 vs Blade :8090): empty page, saved orders list, clicking a saved order,
// and the "mobile number needed" error. Nothing is sent to the live store.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
fs.mkdirSync(OUT, { recursive: true });
const ORDERS = [
  { _id: 'ord_123', orderNumber: 'DVK0012', status: 'Shipped', total: 1890, date: '01 Nov 2026', paymentMethod: 'Razorpay', phone: '9876543210', itemsList: [{ name: 'Karungali Mala', qty: 1, size: '8mm', price: 1890, image: '/logo.png' }, { name: 'Anti-Fog Spray (Free Gift)', qty: 1, price: 0, isFreeGift: true, image: '/logo.png' }] },
  { _id: 'ord_456', status: 'Processing', total: 750, date: '29 Oct 2026', itemsList: [] },
];

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}% (${A.width}x${A.height} vs ${B.width}x${B.height})`;
}

(async () => {
  const browser = await chromium.launch();
  for (const scenario of ['empty', 'orders', 'clicked', 'error']) {
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
      const f = {}, t = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(([orders]) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          if (orders) localStorage.setItem('vaugun_orders', orders);
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, [scenario === 'empty' || scenario === 'error' ? null : JSON.stringify(ORDERS)]);
        const page = await ctx.newPage();
        await page.goto(BASE[site] + '/order-tracking', { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(3500);
        if (scenario === 'clicked') { await page.locator('text=Order #DVK0012').click(); await page.waitForTimeout(1500); await page.evaluate(() => scrollTo(0, 0)); }
        if (scenario === 'error') { await page.fill('input[aria-label="Order ID or invoice number"]', 'DVK9999'); await page.click('button:has-text("Track Package")'); await page.waitForTimeout(800); }
        await page.mouse.move(0, 0);
        const box = await page.evaluate(() => { const c = document.querySelector('nav[aria-label="Breadcrumb"]').parentElement; const r = c.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.ceil(r.height) }; });
        f[site] = path.join(OUT, `track_${scenario}_${vpName}_${site}.png`);
        await page.screenshot({ path: f[site], clip: box, fullPage: true });
        t[site] = await page.evaluate(() => document.querySelector('nav[aria-label="Breadcrumb"]').parentElement.innerText.replace(/\s+/g, ' ').trim());
        await ctx.close();
      }
      console.log(`${scenario} ${vpName}: px=${pxDiff(f.react, f.blade, path.join(OUT, `track_${scenario}_${vpName}_DIFF.png`))} text ${t.react === t.blade ? 'SAME' : 'DIFF'}`);
      if (t.react !== t.blade) console.log('  react:', t.react.slice(0, 600), '\n  blade:', t.blade.slice(0, 600));
    }
  }
  await browser.close();
})();
