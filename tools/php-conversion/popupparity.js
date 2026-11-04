// Welcome popup (after 10 s on a first visit) and floating cart bar: React :3000 vs Blade :8095
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
const OUT = path.join(__dirname, 'popup');
fs.mkdirSync(OUT, { recursive: true });
const ITEM = { _id: 'cmvz1knro0005ac1m4n26niu7', id: 'cmvz1knro0005ac1m4n26niu7', cartId: 'cmvz1knro0005ac1m4n26niu7', name: 'Tulasi Silver Cap Mala 8mm (Ayyappa Mala)', image: '/logo.png', price: 13500, originalPrice: 13500, mrp: 18000, quantity: 2, isFreeGift: false };

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}%`;
}

(async () => {
  const browser = await chromium.launch();
  for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
    const f = {}, t = {};
    for (const site of Object.keys(BASE)) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
      await ctx.route('**/*', async r => {
        const u = r.request().url();
        if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
        if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
        return r.continue();
      });
      await ctx.addInitScript(([cart]) => {
        if (!sessionStorage.getItem('init')) { localStorage.clear(); localStorage.setItem('drop_cart', cart); sessionStorage.setItem('init', '1'); }
        const s = document.createElement('style');
        s.textContent = '*{animation-play-state:paused!important}';
        document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
      }, [JSON.stringify([ITEM])]);
      const page = await ctx.newPage();
      await page.goto(BASE[site] + '/faq', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      f[`fc_${site}`] = path.join(OUT, `${vpName}_floating_${site}.png`);
      await page.screenshot({ path: f[`fc_${site}`], clip: { x: 0, y: vp.height - 200, width: vp.width, height: 200 } });
      await page.waitForTimeout(9500);
      f[`pop_${site}`] = path.join(OUT, `${vpName}_popup_${site}.png`);
      await page.screenshot({ path: f[`pop_${site}`] });
      t[site] = await page.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => x.textContent.startsWith('Flat')); return h ? h.closest('div[style*="max-width"]').innerText.replace(/\s+/g, ' ').trim() : 'none'; });
      await page.locator('button:has-text("COPY")').click(); await page.waitForTimeout(300);
      t[site] += ' | ' + await page.locator('button:has-text("COPIED")').count() + ' ' + await page.evaluate(() => localStorage.getItem('daivika_pending_coupon'));
      await page.locator('button[aria-label="Close popup"]').click(); await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(11500);
      t[site] += ' | reopened:' + await page.locator('text=PROMO CODE').count();
      await ctx.close();
    }
    console.log(`${vpName}: floating=${pxDiff(f.fc_react, f.fc_blade, path.join(OUT, `${vpName}_floating_DIFF.png`))} popup=${pxDiff(f.pop_react, f.pop_blade, path.join(OUT, `${vpName}_popup_DIFF.png`))} text ${t.react === t.blade ? 'SAME' : 'DIFF'}`);
    if (t.react !== t.blade) console.log('  react:', t.react, '\n  blade:', t.blade);
  }
  await browser.close();
})();
