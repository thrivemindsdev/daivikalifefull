// Home page parity (React :3000 vs Blade :8095): every visible section of the page, compared by text,
// computed styles, height and screenshot at 1440 / 768 / 375 px. The splash is skipped (session flag)
// and the banner autoplay is frozen so both sides show the first slide.
// Usage: node homeparity.js [desktop|tablet|mobile ...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
const OUT = path.join(__dirname, 'pages');
const ALL = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const pick = process.argv.slice(2);
const VIEWPORTS = Object.fromEntries(Object.entries(ALL).filter(([k]) => !pick.length || pick.includes(k)));
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;
fs.mkdirSync(OUT, { recursive: true });

async function open(browser, site, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
    if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
    return r.continue();
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('daivika_coupon_popup_seen', '1'); sessionStorage.setItem('daivika_initial_loaded', 'true'); } catch (e) {}
    // Freeze the 5 s banner autoplay
    const si = window.setInterval;
    window.setInterval = (fn, ms, ...a) => (ms === 5000 ? 0 : si(fn, ms, ...a));
    const s = document.createElement('style');
    s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
  page.on('console', m => { if (m.type() === 'error' && !/razorpay|cashfree|ERR_FAILED|404/i.test(m.text())) errors.push(m.text().slice(0, 150)); });
  await page.goto(BASE[site] + '/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(6000);
  // Scroll through so lazy images load, then back to the top
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += vp.height / 2) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(150); }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.mouse.move(0, 0);
  return { ctx, page, errors };
}

const collect = () => [...document.querySelectorAll('main section')]
  .filter(s => !s.parentElement.closest('section') && s.getBoundingClientRect().height > 0)
  .map((s, i) => {
    s.setAttribute('data-parity', i);
    const sig = [s, ...s.querySelectorAll('*')].filter(e => !e.closest('svg') || e.tagName === 'svg').slice(0, 400).map(e => {
      const c = getComputedStyle(e); const r = e.getBoundingClientRect();
      return [e.tagName, c.fontSize, c.fontWeight, c.color, c.lineHeight, c.margin, c.padding, c.backgroundColor, c.borderRadius, c.display, Math.round(r.width), Math.round(r.height)].join('|');
    });
    const box = s.getBoundingClientRect();
    return { i, text: s.innerText.replace(/\s+/g, ' ').trim(), height: Math.round(box.height), top: (box.top + scrollY).toFixed(2), h2: box.height.toFixed(2), sig };
  });

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
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const res = {};
    for (const site of Object.keys(BASE)) {
      const { ctx, page, errors } = await open(browser, site, vp, vpName === 'mobile');
      const sections = await page.evaluate(collect);
      // Fixed bars (navbar, floating cart) would cover the sections in the screenshots
      await page.evaluate(() => document.querySelectorAll('body *').forEach(e => { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') e.style.visibility = 'hidden'; }));
      for (const s of sections) {
        const el = page.locator(`[data-parity="${s.i}"]`);
        await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
        s.file = path.join(OUT, `home_${vpName}_${s.i}_${site}.png`);
        await el.screenshot({ path: s.file, animations: 'disabled' });
      }
      res[site] = { sections, errors, height: await page.evaluate(() => document.body.scrollHeight) };
      await ctx.close();
    }
    const R = res.react, B = res.blade;
    console.log(`\n## ${vpName}: sections react=${R.sections.length} blade=${B.sections.length}, page height ${R.height} vs ${B.height}`);
    if (R.errors.length || B.errors.length) console.log('  errors react:', JSON.stringify(R.errors), 'blade:', JSON.stringify(B.errors));
    const n = Math.max(R.sections.length, B.sections.length);
    for (let i = 0; i < n; i++) {
      const r = R.sections[i], b = B.sections[i];
      if (!r || !b) { console.log(`  [${i}] missing on ${r ? 'blade' : 'react'}: ${(r || b).text.slice(0, 80)}`); continue; }
      const sd = r.sig.filter((s, k) => s !== b.sig[k]);
      console.log(`  [${i}] ${r.text.slice(0, 40).padEnd(40)} top ${r.top}/${b.top} h ${r.h2}/${b.h2} text ${r.text === b.text ? 'SAME' : 'DIFF'} styles ${sd.length ? `DIFF(${sd.length}/${r.sig.length} vs ${b.sig.length})` : 'SAME'} px ${pxDiff(r.file, b.file, path.join(OUT, `home_${vpName}_${i}_DIFF.png`))}`);
      if (r.text !== b.text) console.log('     react:', r.text.slice(0, 300), '\n     blade:', b.text.slice(0, 300));
      if (sd.length) { const k = r.sig.findIndex((s, k2) => s !== b.sig[k2]); console.log('     first style diff #' + k + '\n     react:', r.sig[k], '\n     blade:', b.sig[k]); }
    }
  }
  await browser.close();
})();
