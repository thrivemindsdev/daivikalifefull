// Wishlist page parity (React :3000 vs Blade :8090): guest view, and a logged-in shopper (mocked /api/auth/me)
// with three saved products, one of them in the cart. Also checks the heart button removes a card.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
fs.mkdirSync(OUT, { recursive: true });
const USER = { _id: 'u1', id: 'u1', name: 'Test Shopper', email: 'shopper@example.com', phone: '9876543210', role: 'user' };

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
  const live = (await (await fetch('https://daivikalife.com/api/products')).json()).data;
  const saved = live.slice(0, 3).map(p => ({ ...p, id: p._id }));
  const first = saved[0];
  const cartItem = { ...first, cartId: first._id + (first.variants && first.variants[0] ? `-${first.variants[0].name}` : ''), quantity: 2, price: Number(first.variants && first.variants[0] ? first.variants[0].price : first.price), originalPrice: Number(first.price), selectedVariant: first.variants && first.variants[0] ? first.variants[0] : null, isFreeGift: false };
  const browser = await chromium.launch();
  for (const scenario of ['guest', 'user']) {
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
      const f = {}, t = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (u.includes('/api/auth/me')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: USER }) });
          if (u.includes('/api/notifications')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
          if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(([user, wish, cart]) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          if (user) localStorage.setItem('vaugun_token', 'test-token');
          localStorage.setItem('wishlist', wish);
          localStorage.setItem('drop_cart', cart);
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, [scenario === 'user', JSON.stringify(scenario === 'user' ? saved : []), JSON.stringify(scenario === 'user' ? [cartItem] : [])]);
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(BASE[site] + '/wishlist', { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(4000);
        await page.mouse.move(0, 0);
        const box = await page.evaluate(() => { const el = [...document.querySelectorAll('h1,h2')].find(h => /My Wishlist|Wishlist Access/.test(h.textContent) && h.offsetParent); const c = el.closest('.container'); const r = c.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY), width: innerWidth, height: Math.min(r.height, 1600) }; });
        f[site] = path.join(OUT, `wishlist_${scenario}_${vpName}_${site}.png`);
        await page.screenshot({ path: f[site], clip: box, fullPage: true });
        t[site] = await page.evaluate(() => { const el = [...document.querySelectorAll('h1,h2')].find(h => /My Wishlist|Wishlist Access/.test(h.textContent) && h.offsetParent); return el.closest('.container').innerText.replace(/\s+/g, ' ').trim(); });
        if (scenario === 'user') {
          await page.locator('.product-card-item button').first().click(); await page.waitForTimeout(1200);
          t[site] += ' || after heart: ' + await page.evaluate(() => document.querySelectorAll('.product-card-item').length + ' cards, saved ' + JSON.parse(localStorage.getItem('wishlist')).length);
        }
        if (errors.length) t[site] += ' ERR ' + errors.join(';');
        await ctx.close();
      }
      console.log(`${scenario} ${vpName}: px=${pxDiff(f.react, f.blade, path.join(OUT, `wishlist_${scenario}_${vpName}_DIFF.png`))} text ${t.react === t.blade ? 'SAME' : 'DIFF'}`);
      if (t.react !== t.blade) console.log('  react:', t.react.slice(0, 700), '\n  blade:', t.blade.slice(0, 700));
    }
  }
  await browser.close();
})();
