// Profile page parity (React :3000 vs Blade :8090) with a mocked logged-in shopper, mocked orders and saved
// addresses: every tab, the order details modal, the address form and the guest card, at 1440 and 375 px.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
const USER = { _id: 'u1', id: 'u1', name: 'Test Shopper', email: 'shopper@example.com', phone: '9876543210', role: 'user' };
const ORDERS = [
  { _id: 'ord_1001', orderNumber: 'DVK1001', status: 'Shipped', date: '2026-10-28T10:00:00.000Z', total: 2280, shippingCharge: 0, user: 'Test Shopper', email: USER.email, phone: USER.phone, paymentMethod: 'Razorpay', paymentStatus: 'Paid',
    address: { street: '12 Temple Road', city: 'Kochi', state: 'Kerala', pincode: '682001', country: 'India' },
    itemsList: [{ name: 'Karungali Mala 8mm', qty: 2, price: 1140, size: '8mm', image: '/logo.png' }, { name: 'Anti-Fog Spray (Free Gift)', qty: 1, price: 0, isFreeGift: true, image: '/logo.png' }] },
  { _id: 'ord_1002', status: 'Processing', date: '2026-10-30T10:00:00.000Z', total: 750, shippingCharge: 60, discount: 50, couponCode: 'DAIVIKA10', user: 'Test Shopper', email: USER.email, phone: USER.phone, paymentMethod: 'Cash on Delivery', paymentStatus: 'Partially Paid', isPartialCod: true,
    address: { street: '5 Beach Lane', city: 'Kannur', state: 'Kerala', pincode: '670001', country: 'India' }, itemsList: [{ name: 'Rudraksha Bracelet', qty: 1, price: 740, color: 'Brown', image: '/logo.png' }] },
];
const ADDRS = [{ id: 'addr_1', label: 'Home', firstName: 'Test', lastName: 'Shopper', phone: '9876543210', email: USER.email, street: '12 Temple Road', city: 'Kochi', state: 'Kerala', district: 'Ernakulam', pincode: '682001', isDefault: true },
  { id: 'addr_2', label: 'Office', firstName: 'Test', lastName: 'Shopper', phone: '9876543210', email: USER.email, street: 'Infopark Phase 2', city: 'Kakkanad', state: 'Kerala', district: 'Ernakulam', pincode: '682030', isDefault: false }];

const STEPS = {
  guest: { user: false, run: null },
  account: { run: null },
  orders: { run: async (p) => { await p.click('button:has-text("My Orders")'); await p.waitForTimeout(1500); } },
  modal: { run: async (p) => { await p.click('button:has-text("My Orders")'); await p.waitForTimeout(1500); await p.locator('button:has-text("View Details")').first().click(); await p.waitForTimeout(1200); } },
  addresses: { run: async (p) => { await p.click('button:has-text("Saved Addresses")'); await p.waitForTimeout(1200); } },
  addrForm: { run: async (p) => { await p.click('button:has-text("Saved Addresses")'); await p.waitForTimeout(1200); await p.locator('button:has-text("Edit")').first().click(); await p.waitForTimeout(1200); await p.evaluate(() => scrollTo(0, 0)); } },
  wishlist: { run: async (p) => { await p.locator('.profile-sticky-card button', { hasText: 'Wishlist' }).click(); await p.waitForTimeout(1500); } },
  security: { run: async (p) => { await p.click('button:has-text("Privacy & Security")'); await p.waitForTimeout(1200); } },
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
  const wish = live.slice(0, 2).map(p => ({ ...p, id: p._id }));
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
          if (/\/api\/orders(\?|$)/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: ORDERS }) });
          if (/\/api\/reviews(\?|$)/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
          if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(([loggedIn, wish, addrs]) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          if (loggedIn) localStorage.setItem('vaugun_token', 'test-token');
          localStorage.setItem('wishlist', wish);
          localStorage.setItem('daivika_addresses_shopper@example.com', addrs);
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, [step.user !== false, JSON.stringify(wish), JSON.stringify(ADDRS)]);
        const page = await ctx.newPage();
        page.setDefaultTimeout(20000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
        await page.goto(BASE[site] + '/profile', { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(5000);
        if (step.run && vpName === 'mobile' && name !== 'guest') { /* phones start on the menu */ }
        if (step.run) await step.run(page);
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
        await page.waitForTimeout(500);
        const file = path.join(OUT, `prof_${name}_${vpName}_${site}.png`);
        await page.screenshot({ path: file, fullPage: name !== 'modal' });
        const text = await page.evaluate(() => (document.querySelector('.profile-page-wrapper') || document.querySelector('main')).innerText.replace(/\s+/g, ' ').trim());
        res[site] = { file, text, errors };
        await ctx.close();
      }
      const R = res.react, B = res.blade;
      console.log(`${name.padEnd(9)} ${vpName.padEnd(7)} text ${R.text === B.text ? 'SAME' : 'DIFF'} px ${pxDiff(R.file, B.file, path.join(OUT, `prof_${name}_${vpName}_DIFF.png`))}${B.errors.length ? ' blade errors ' + JSON.stringify(B.errors) : ''}`);
      if (R.text !== B.text) { let k = 0; while (R.text[k] === B.text[k]) k++; console.log('   react: …' + R.text.slice(Math.max(0, k - 60), k + 160), '\n   blade: …' + B.text.slice(Math.max(0, k - 60), k + 160)); }
    }
  }
  await browser.close();
})();
