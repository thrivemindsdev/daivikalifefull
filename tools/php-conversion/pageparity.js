// Compare converted Blade pages (:8095) with the Next.js pages (:3000).
// Usage: node pageparity.js /privacy-policy /refund-policy ...
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
const OUT = path.join(__dirname, 'pages');
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;
fs.mkdirSync(OUT, { recursive: true });

const SECTIONS = {
  header: () => document.querySelector('.subpage-header-wrapper'),
  body: () => { const h = document.querySelector('.subpage-header-wrapper'); return h && (h.parentElement.querySelector('main > .container') || h.nextElementSibling); },
  footer: () => document.querySelector('footer.footer-root'),
};
const animated = () => { const h = document.querySelector('.subpage-header-wrapper'); const b = h && (h.parentElement.querySelector('main > .container') || h.nextElementSibling); const h2 = b && b.querySelector('h2'); return h2 && (h2.closest('section') ? h2.closest('section').parentElement : h2.parentElement.parentElement); };

async function open(browser, site, route, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
    if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
    return r.continue();
  });
  await ctx.addInitScript(() => { try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
  page.on('console', m => { if (m.type() === 'error' && !/razorpay|cashfree|ERR_FAILED/i.test(m.text())) errors.push(m.text().slice(0, 150)); });
  await page.goto(BASE[site] + route, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  return { ctx, page, errors };
}

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
  for (const route of process.argv.slice(2)) {
    const tag = route.replace(/\W+/g, '_');
    console.log(`\n### ${route}`);
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const shots = {}, texts = {}, styles = {};
      for (const site of Object.keys(BASE)) {
        const { ctx, page, errors } = await open(browser, site, route, vp);
        await page.waitForTimeout(2200);
        await page.mouse.move(0, 0);
        for (const name of Object.keys(SECTIONS)) {
          const el = (await page.evaluateHandle(`(${SECTIONS[name].toString()})()`)).asElement();
          if (!el) { shots[`${name}_${site}`] = null; continue; }
          await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
          const f = path.join(OUT, `${tag}_${vpName}_${name}_${site}.png`);
          await el.screenshot({ path: f, animations: 'disabled' });
          shots[`${name}_${site}`] = f;
        }
        texts[site] = await page.evaluate(`(${SECTIONS.body.toString()})()?.innerText || ''`);
        styles[site] = await page.evaluate(() => (() => { const h = document.querySelector('.subpage-header-wrapper'); const b = h && (h.parentElement.querySelector('main > .container') || h.nextElementSibling); return b ? [...b.querySelectorAll('h1, h2, h3, p, section, svg, span, a, div')] : []; })().map(e => { const s = getComputedStyle(e); return [e.tagName, s.fontSize, s.fontWeight, s.color, s.lineHeight, s.margin, s.padding, s.whiteSpace, s.backgroundColor, s.borderRadius, Math.round(e.getBoundingClientRect().height)].join('|'); }));
        if (vpName === 'desktop') console.log(`  ${site} title="${await page.title()}" errors=${JSON.stringify(errors)}`);
        await ctx.close();
      }
      const parts = Object.keys(SECTIONS).map(n => `${n}=${shots[`${n}_react`] && shots[`${n}_blade`] ? pxDiff(shots[`${n}_react`], shots[`${n}_blade`], path.join(OUT, `${tag}_${vpName}_${n}_DIFF.png`)) : 'missing'}`);
      const styleDiffs = styles.react.filter((s, i) => s !== styles.blade[i]);
      console.log(`  ${vpName.padEnd(7)} text ${texts.react === texts.blade ? 'IDENTICAL' : 'DIFFERENT'} | styles ${styles.react.length === styles.blade.length && !styleDiffs.length ? 'IDENTICAL' : `DIFF(${styleDiffs.length}/${styles.react.length} vs ${styles.blade.length})`} | ${parts.join(' ')}`);
      if (texts.react !== texts.blade) console.log('    react:', JSON.stringify(texts.react.slice(0, 300)), '\n    blade:', JSON.stringify(texts.blade.slice(0, 300)));
      if (styleDiffs.length) styleDiffs.slice(0, 4).forEach((s, i) => console.log('    react:', s, '\n    blade:', styles.blade[styles.react.indexOf(s)]));
    }
    // Fade-in timing on a fresh load (desktop)
    for (const site of Object.keys(BASE)) {
      const { ctx, page } = await open(browser, site, route, VIEWPORTS.desktop);
      await page.reload({ waitUntil: 'commit' });
      const samples = [];
      const t0 = Date.now();
      for (const t of [200, 500, 800, 1100, 1400, 1800, 2400]) {
        const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
        samples.push(await page.evaluate(`(() => { const e = (${animated.toString()})(); return e ? (+getComputedStyle(e).opacity).toFixed(2) : '-'; })()`).catch(() => 'n/a'));
      }
      console.log(`  fade ${site.padEnd(5)} ${samples.join(' ')}`);
      await ctx.close();
    }
  }
  await browser.close();
})();
