// Cart drawer parity (React :3000 vs Blade :8095): empty cart and a cart with an item + free gift
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
const OUT = path.join(__dirname, 'cart');
fs.mkdirSync(OUT, { recursive: true });
const ITEM = { _id: 'cmvz1knro0005ac1m4n26niu7', id: 'cmvz1knro0005ac1m4n26niu7', cartId: 'cmvz1knro0005ac1m4n26niu7', name: 'Tulasi Silver Cap Mala 8mm (Ayyappa Mala)', image: '/logo.png', price: 13500, originalPrice: 13500, mrp: 18000, quantity: 2, isFreeGift: false, category: 'mala' };
const GIFT = { _id: 'g1', id: 'g1', cartId: 'gift_g1_for_cmvz1knro0005ac1m4n26niu7', name: 'DAIVIKA Anti-Fog Spray (Free Gift 🎁)', image: '/logo.png', price: 0, originalPrice: 399, mrp: 399, quantity: 1, isFreeGift: true, freeGiftParentCartId: 'cmvz1knro0005ac1m4n26niu7', parentProductName: 'Tulasi Silver Cap Mala 8mm (Ayyappa Mala)' };

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
    for (const scenario of ['empty', 'items']) {
      const files = {}, texts = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(([cart]) => {
          localStorage.setItem('daivika_coupon_popup_seen', '1');
          localStorage.setItem('drop_cart', cart);
          const s = document.createElement('style');
          s.textContent = '*{animation-play-state:paused!important}';
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }, [JSON.stringify(scenario === 'items' ? [ITEM, GIFT] : [])]);
        const page = await ctx.newPage();
        await page.goto(BASE[site] + '/faq', { waitUntil: 'load' }); await page.waitForTimeout(2500);
        await page.waitForTimeout(1200);
        await page.locator('button[aria-label="Cart"]:visible, button:has(svg.lucide-shopping-bag):visible').first().click();
        await page.waitForTimeout(1500);
        files[site] = path.join(OUT, `${vpName}_${scenario}_${site}.png`);
        await page.screenshot({ path: files[site] });
        texts[site] = await page.evaluate(() => { const p = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Sacred Cart')); return p ? p.closest('div[style*="position: fixed"], [data-cart-panel]').innerText.replace(/\s+/g, ' ').trim() : 'none'; });
        // Quantity + then close
        if (scenario === 'items') {
          await page.locator('button[aria-label="Increase quantity"]').first().click(); await page.waitForTimeout(600);
          texts[site] += ' || after+: ' + await page.evaluate(() => { const p = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Sacred Cart')); return p.closest('div[style*="position: fixed"], [data-cart-panel]').innerText.replace(/\s+/g, ' ').trim().slice(0, 200); });
          texts[site] += ' || stored qty: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('drop_cart'))[0].quantity);
        }
        await ctx.close();
      }
      console.log(`${vpName} ${scenario}: px=${pxDiff(files.react, files.blade, path.join(OUT, `${vpName}_${scenario}_DIFF.png`))} text ${texts.react === texts.blade ? 'SAME' : 'DIFF'}`);
      if (texts.react !== texts.blade) console.log('   react:', texts.react.slice(0, 500), '\n   blade:', texts.blade.slice(0, 500));
    }
  }
  await browser.close();
})();
