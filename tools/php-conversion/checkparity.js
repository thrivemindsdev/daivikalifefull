// Checkout parity (React :3000 vs Blade :8090) with two live products in the cart: the form, state chosen
// (shipping), coupon box, Cash on Delivery, the missing-details alert and a logged-in shopper with a saved
// address. Nothing is ordered: non-GET API calls are blocked and Razorpay is never opened.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
const USER = { _id: 'u1', id: 'u1', name: 'Test Shopper', email: 'shopper@example.com', phone: '9876543210', role: 'user' };
const ADDRS = [{ id: 'addr_1', label: 'Home', firstName: 'Test', lastName: 'Shopper', phone: '9876543210', email: USER.email, street: '12 Temple Road', city: 'Kochi', state: 'Kerala', district: 'Ernakulam', pincode: '682001', isDefault: true }];

const STEPS = {
  form: { run: null },
  state: { run: async (p) => { await p.locator('text=Select State').first().click(); await p.waitForTimeout(500); await p.keyboard.type('Kerala'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); } },
  coupon: { run: async (p) => { await p.click('button:has-text("Apply Coupon")'); await p.waitForTimeout(800); await p.fill('input[placeholder^="Enter Code"]', 'FIRSTBUY'); await p.click('button:has-text("Apply")'); await p.waitForTimeout(600); } },
  alert: { run: async (p) => { await p.fill('input[data-f="phone"], input[placeholder^="10-digit mobile"]', '98765'); await p.evaluate(() => { const f = document.querySelector('form'); f.noValidate = true; f.requestSubmit(); }); await p.waitForTimeout(900); }, viewport: true },
  user: { user: true, run: null },
};

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}%${A.height !== B.height ? ` (h ${A.height} vs ${B.height})` : ''}`;
}

(async () => {
  const live = (await (await fetch('https://daivikalife.com/api/products')).json()).data;
  const cart = live.slice(0, 2).map((p, i) => ({ ...p, id: p._id, cartId: p._id, quantity: i + 1, originalPrice: Number(p.price), price: Number(p.price), mrp: Number(p.mrp), selectedVariant: null, selectedColor: null, selectedTexture: null, isFreeGift: false }));
  const browser = await chromium.launch();
  const only = process.argv.slice(2);
  for (const [name, step] of Object.entries(STEPS)) {
    if (only.length && !only.includes(name)) continue;
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
      const res = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (u.includes('/api/auth/me')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: USER }) });
          if (u.includes('/api/notifications')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
          if (/\/api\/orders(\?|$)/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
          if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(([cart, loggedIn, addrs]) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          localStorage.setItem('drop_cart', cart);
          if (loggedIn) { localStorage.setItem('vaugun_token', 'test-token'); localStorage.setItem('daivika_addresses_shopper@example.com', addrs); }
          sessionStorage.setItem('daivika_gift_timer_expiry', String(Date.now() + 300500));
          const si = window.setInterval;
          window.setInterval = (fn, ms, ...a) => (ms === 1000 ? 0 : si(fn, ms, ...a));
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, [JSON.stringify(cart), !!step.user, JSON.stringify(ADDRS)]);
        const page = await ctx.newPage();
        page.setDefaultTimeout(20000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
        await page.goto(BASE[site] + '/checkout', { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(6000);
        if (step.run) { try { await step.run(page); } catch (e) { errors.push(`${site} step failed: ${e.message.split(String.fromCharCode(10))[0]}`); } }
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
        await page.waitForTimeout(500);
        const file = path.join(OUT, `co_${name}_${vpName}_${site}.png`);
        await page.screenshot({ path: file, fullPage: !step.viewport });
        const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
        res[site] = { file, text, errors, url: page.url() };
        await ctx.close();
      }
      const R = res.react, B = res.blade;
      console.log(`${name.padEnd(7)} ${vpName.padEnd(7)} text ${R.text === B.text ? 'SAME' : 'DIFF'} px ${pxDiff(R.file, B.file, path.join(OUT, `co_${name}_${vpName}_DIFF.png`))}${new URL(R.url).pathname !== new URL(B.url).pathname ? ` url ${R.url} vs ${B.url}` : ''}${B.errors.length || R.errors.length ? ' errors ' + JSON.stringify([...R.errors, ...B.errors]) : ''}`);
      if (R.text !== B.text) { let k = 0; while (R.text[k] === B.text[k]) k++; console.log('   react: …' + R.text.slice(Math.max(0, k - 80), k + 160), '\n   blade: …' + B.text.slice(Math.max(0, k - 80), k + 160)); }
    }
  }
  await browser.close();
})();
