// Admin and vendor dashboards, Next.js (:3000) vs the static build served by Laravel (:8090), with a mocked
// staff login. Admin API calls go to the live API with a fake token on both sides (so both get the same
// "not authorised" answers); non-GET calls are blocked. Compares the first screen and a few tabs.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
const USERS = {
  admin: { _id: 'a1', id: 'a1', name: 'Store Admin', email: 'admin@example.com', phone: '9000000000', role: 'admin', permissions: [] },
  vendor: { _id: 'v1', id: 'v1', name: 'Test Vendor', email: 'vendor@example.com', phone: '9000000001', role: 'vendor' },
};
const STEPS = [
  ['admin', 'start', null],
  ['admin', 'start2', null],
  ['admin', 'orders', async (p) => { await p.locator('button, a', { hasText: /^Orders$/ }).first().click(); await p.waitForTimeout(2000); }],
  ['admin', 'products', async (p) => { await p.locator('button, a', { hasText: /^Products$/ }).first().click(); await p.waitForTimeout(2000); }],
  ['vendor', 'start', null],
  ['vendor', 'account', async (p) => { await p.locator('button', { hasText: 'Account' }).first().click(); await p.waitForTimeout(1500); }],
  ['guest', 'denied', null],
];

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
  const browser = await chromium.launch();
  for (const [who, name, run] of STEPS) {
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
      const res = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (u.includes('/api/auth/me')) return who === 'guest' ? r.fulfill({ status: 401, contentType: 'application/json', body: '{"success":false}' }) : r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: USERS[who] }) });
          if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript((who) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          localStorage.setItem('vaugun_token', 'test-token');
          // Skip the first-visit guided tour on both sides
          ['a1', 'v1', 'admin', 'vendor'].forEach((id) => { localStorage.setItem(`daivika_tour_seen_admin_${id}`, '1'); localStorage.setItem(`daivika_tour_seen_vendor_${id}`, '1'); });
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, who);
        const page = await ctx.newPage();
        page.setDefaultTimeout(20000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
        await page.goto(BASE[site] + (who === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard'), { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(8000);
        if (run) { try { await run(page); } catch (e) { errors.push(`step failed: ${e.message.split(String.fromCharCode(10))[0]}`); } }
        await page.mouse.move(0, 0);
        await page.waitForTimeout(500);
        const file = path.join(OUT, `dash_${who}_${name}_${vpName}_${site}.png`);
        await page.screenshot({ path: file });
        const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
        const aside = await page.evaluate(() => { const a = document.querySelector('aside'); return a ? Math.round(a.getBoundingClientRect().width) + ' ' + getComputedStyle(a.querySelector('button') || a).fontSize : '-'; });
        res[site] = { file, text, errors, url: new URL(page.url()).pathname, aside };
        await ctx.close();
      }
      const R = res.react, B = res.blade;
      console.log(`${who.padEnd(6)} ${name.padEnd(8)} ${vpName.padEnd(7)} aside ${R.aside}/${B.aside} text ${R.text === B.text ? 'SAME' : 'DIFF'} px ${pxDiff(R.file, B.file, path.join(OUT, `dash_${who}_${name}_${vpName}_DIFF.png`))}${R.url !== B.url ? ` url ${R.url} vs ${B.url}` : ''}${R.errors.length || B.errors.length ? ' errors ' + JSON.stringify({ react: R.errors, blade: B.errors }) : ''}`);
      if (R.text !== B.text) { let k = 0; while (R.text[k] === B.text[k]) k++; console.log('   react: …' + R.text.slice(Math.max(0, k - 80), k + 160), '\n   blade: …' + B.text.slice(Math.max(0, k - 80), k + 160)); }
    }
  }
  await browser.close();
})();
