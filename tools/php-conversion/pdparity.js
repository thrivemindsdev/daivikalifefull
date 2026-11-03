// Product page parity (React :3000 vs Blade :8090) at 1440 / 768 / 375 px: text, styles and screenshots of
// the product area, the tabs and the related products. The gift countdown and random related products
// are frozen so both sides match. Usage: node pdparity.js [desktop|tablet|mobile ...] [-- <product id> ...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const OUT = path.join(__dirname, 'pages');
const ALL = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const args = process.argv.slice(2);
const split = args.indexOf('--');
const vpArgs = split === -1 ? args : args.slice(0, split);
const IDS = split === -1 ? ['cmvz8uoff0005vfqrrk9pjwk8', 'cmw0c9bpo0004i33pyru9030q'] : args.slice(split + 1);
const VIEWPORTS = Object.fromEntries(Object.entries(ALL).filter(([k]) => !vpArgs.length || vpArgs.includes(k)));
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;
fs.mkdirSync(OUT, { recursive: true });

async function open(browser, site, id, vp, mobile, extra) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
    if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
    return r.continue();
  });
  await ctx.addInitScript((id) => {
    try {
      localStorage.setItem('daivika_coupon_popup_seen', '1');
      sessionStorage.setItem('daivika_pdp_gift_expiry_' + id, String(Date.now() + 300500));
    } catch (e) {}
    Math.random = () => 0.5;
    const si = window.setInterval;
    window.setInterval = (fn, ms, ...a) => (ms === 1000 || ms === 3000 ? 0 : si(fn, ms, ...a));
    const s = document.createElement('style');
    s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
  }, id);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/razorpay|cashfree|ERR_FAILED|404|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 150)); });
  await page.goto(BASE[site] + '/product/' + id, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(7000);
  if (extra) { await extra(page); }
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += vp.height / 2) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.querySelectorAll('body *').forEach(e => { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') e.style.visibility = 'hidden'; }));
  return { ctx, page, errors };
}

const PARTS = {
  top: () => document.querySelector('.breadcrumbs-container'),
  detail: () => document.querySelector('.product-detail-grid'),
  tabs: () => document.getElementById('product-tabs-section'),
  related: () => document.querySelector('.related-products-grid') && document.querySelector('.related-products-grid').closest('section'),
};
const sig = (fnSrc) => {
  const root = eval(`(${fnSrc})()`);
  if (!root) return null;
  const els = [root, ...root.querySelectorAll('*')].filter(e => (!e.closest('svg') || e.tagName === 'svg') && !['SCRIPT', 'STYLE'].includes(e.tagName) && getComputedStyle(e).display !== 'contents');
  return {
    text: root.innerText.replace(/\s+/g, ' ').trim(),
    height: root.getBoundingClientRect().height.toFixed(2),
    styles: els.slice(0, 500).map(e => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return [e.tagName, c.fontSize, c.fontWeight, c.color, c.lineHeight, c.margin, c.padding, c.backgroundColor, c.borderRadius, c.display, Math.round(r.width), Math.round(r.height)].join('|'); }),
  };
};

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}%${A.width !== B.width || A.height !== B.height ? ` (${A.width}x${A.height} vs ${B.width}x${B.height})` : ''}`;
}

const SCENARIOS = {
  plain: process.env.ONLY && process.env.ONLY !== 'plain' ? undefined : null,
  specs: async (p) => { await p.click('button:has-text("Specifications")'); await p.waitForTimeout(800); },
  reviews: async (p) => { await p.click('button.pd-tab-btn:has-text("Customer Reviews")'); await p.waitForTimeout(800); await p.click('button:has-text("WRITE A REVIEW")'); await p.waitForTimeout(800); },
};

(async () => {
  const browser = await chromium.launch();
  for (const id of IDS) {
    for (const [scName, sc] of Object.entries(SCENARIOS)) {
      if (process.env.ONLY && process.env.ONLY !== scName) continue;
      console.log(`\n### ${id} ${scName}`);
      for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
        if (scName !== 'plain' && vpName === 'tablet') continue;
        const res = {};
        for (const site of Object.keys(BASE)) {
          const { ctx, page, errors } = await open(browser, site, id, vp, vpName === 'mobile', sc);
          const out = { errors, title: await page.title() };
          for (const [part, fn] of Object.entries(PARTS)) {
            out[part] = await page.evaluate(sig, fn.toString());
            if (!out[part]) continue;
            const handle = await page.evaluateHandle(`(${fn.toString()})()`);
            out[part].file = path.join(OUT, `pd_${id.slice(-6)}_${scName}_${vpName}_${part}_${site}.png`);
            await handle.asElement().screenshot({ path: out[part].file, animations: 'disabled' });
          }
          res[site] = out;
          await ctx.close();
        }
        const R = res.react, B = res.blade;
        if (R.title !== B.title) console.log(`  title: react="${R.title}" blade="${B.title}"`);
        if (R.errors.length || B.errors.length) console.log('  errors react:', JSON.stringify(R.errors), 'blade:', JSON.stringify(B.errors));
        for (const part of Object.keys(PARTS)) {
          const r = R[part], b = B[part];
          if (!r || !b) { console.log(`  ${vpName} ${part}: ${r ? 'missing on blade' : b ? 'missing on react' : 'absent on both'}`); continue; }
          const sd = r.styles.filter((s, k) => s !== b.styles[k]);
          console.log(`  ${vpName.padEnd(7)} ${part.padEnd(7)} h ${r.height}/${b.height} text ${r.text === b.text ? 'SAME' : 'DIFF'} styles ${sd.length ? `DIFF(${sd.length}/${r.styles.length} vs ${b.styles.length})` : 'SAME'} px ${pxDiff(r.file, b.file, path.join(OUT, `pd_${id.slice(-6)}_${scName}_${vpName}_${part}_DIFF.png`))}`);
          if (r.text !== b.text) { let k = 0; while (r.text[k] === b.text[k]) k++; console.log('     react: …' + r.text.slice(Math.max(0, k - 60), k + 160), '\n     blade: …' + b.text.slice(Math.max(0, k - 60), k + 160)); }
          if (sd.length) { const k = r.styles.findIndex((s, k2) => s !== b.styles[k2]); console.log('     first style diff #' + k + '\n     react:', r.styles[k], '\n     blade:', b.styles[k]); }
        }
      }
    }
  }
  await browser.close();
})();
