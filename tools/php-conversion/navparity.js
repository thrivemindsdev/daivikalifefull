// Navbar parity: React (:3000) vs Blade (:8090) on /faq. Screenshots of header + category strip + bottom bar,
// computed styles of key elements, and the interactive parts (account menu, search, side menu, chat).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://localhost:8090' };
const ROUTE = process.argv[2] || '/faq';
const OUT = path.join(__dirname, 'nav');
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;
fs.mkdirSync(OUT, { recursive: true });

async function open(browser, site, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (BLOCK.test(u) || u.includes('/products/events') || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
    // The Blade dev server has an almost empty database: give its API calls the live store's answers
    if (site === 'blade' && u.startsWith('http://localhost:8090/api/')) {
      try { const res = await r.fetch({ url: u.replace('http://localhost:8090', 'https://daivikalife.com') }); return r.fulfill({ response: res }); } catch (e) { return r.abort(); }
    }
    return r.continue();
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {}
    // Freeze the marquee and typewriter so screenshots line up
    const s = document.createElement('style');
    s.textContent = '*{animation-play-state:paused!important;animation-delay:0s!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/razorpay|cashfree|ERR_FAILED|EventSource|events/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await page.goto(BASE[site] + ROUTE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('input').forEach(i => i.setAttribute('placeholder', 'Search')));
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

const clip = async (page, file, region) => page.screenshot({ path: file, clip: region });

(async () => {
  const browser = await chromium.launch();
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const mobile = vpName !== 'desktop';
    const shots = {};
    const info = {};
    for (const site of Object.keys(BASE)) {
      const { ctx, page, errors } = await open(browser, site, vp, mobile);
      // Top of page: ticker + header + category strip
      const headerBottom = await page.evaluate(() => {
        const strip = [...document.querySelectorAll('img')].find(i => i.closest('[class*="dv-cats"], .hide-nav-scrollbar'));
        const box = (strip ? strip.closest('.hide-nav-scrollbar').parentElement : document.querySelector('header')).getBoundingClientRect();
        return Math.ceil(box.bottom);
      });
      shots[`top_${site}`] = path.join(OUT, `${vpName}_top_${site}.png`);
      await clip(page, shots[`top_${site}`], { x: 0, y: 0, width: vp.width, height: headerBottom });
      if (mobile) {
        shots[`bottom_${site}`] = path.join(OUT, `${vpName}_bottom_${site}.png`);
        await clip(page, shots[`bottom_${site}`], { x: 0, y: vp.height - 90, width: vp.width, height: 90 });
      }
      info[site] = { headerBottom, errors };

      // Account menu
      const userBtn = page.locator('button[title="Account Menu"]:visible').first();
      await userBtn.click(); await page.waitForTimeout(500);
      const menuText = await page.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.offsetParent && /Welcome, Guest/.test(d.textContent) && d.children.length >= 2 && getComputedStyle(d).position === 'absolute').map(d => d.innerText.replace(/\s+/g, ' ').trim())[0] || 'none');
      shots[`menu_${site}`] = path.join(OUT, `${vpName}_menu_${site}.png`);
      await clip(page, shots[`menu_${site}`], { x: Math.max(0, vp.width - 420), y: 0, width: Math.min(420, vp.width), height: Math.min(vp.height, 460) });
      info[site].menu = menuText;
      await page.mouse.click(5, vp.height - 200); await page.waitForTimeout(400);

      // Side menu
      await page.locator('button:has-text("Menu"):visible, button:has(svg.lucide-menu):visible').first().click(); await page.waitForTimeout(800);
      shots[`drawer_${site}`] = path.join(OUT, `${vpName}_drawer_${site}.png`);
      await clip(page, shots[`drawer_${site}`], { x: 0, y: 0, width: Math.min(340, vp.width), height: vp.height });
      info[site].drawer = await page.evaluate(() => { const p = [...document.querySelectorAll('div')].find(d => d.innerText && d.innerText.includes('CRAFTED WITH ELEGANCE') && getComputedStyle(d).position === 'fixed'); return p ? p.innerText.replace(/\s+/g, ' ').trim() : 'none'; });
      // Chat with us
      await page.locator('text=Chat with us').first().click(); await page.waitForTimeout(1800);
      shots[`chat_${site}`] = path.join(OUT, `${vpName}_chat_${site}.png`);
      await page.screenshot({ path: shots[`chat_${site}`] });
      info[site].chat = await page.evaluate(() => document.querySelector('.wa-chat-window')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) || 'none');
      await page.locator('.wa-chat-close-btn').click(); await page.waitForTimeout(600);

      // Search dropdown
      const input = page.locator('input[type="text"]:visible').first();
      await input.click(); await input.fill('mala'); await page.waitForTimeout(900);
      info[site].search = await page.evaluate(() => { const h = [...document.querySelectorAll('span')].find(s => s.textContent.trim() === 'Top Matches' && s.offsetParent); return h ? h.closest('div').parentElement.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) : 'none'; });
      shots[`search_${site}`] = path.join(OUT, `${vpName}_search_${site}.png`);
      await page.screenshot({ path: shots[`search_${site}`] });
      await ctx.close();
    }
    console.log(`\n### ${vpName}`);
    for (const k of ['top', 'bottom', 'menu', 'drawer', 'chat', 'search']) {
      if (shots[`${k}_react`] && shots[`${k}_blade`]) console.log(`  ${k.padEnd(7)} ${pxDiff(shots[`${k}_react`], shots[`${k}_blade`], path.join(OUT, `${vpName}_${k}_DIFF.png`))}`);
    }
    for (const k of ['headerBottom', 'menu', 'drawer', 'chat', 'search', 'errors']) {
      const a = JSON.stringify(info.react[k]), b = JSON.stringify(info.blade[k]);
      console.log(`  ${k.padEnd(12)} ${a === b ? 'SAME' : 'DIFF'}${a === b ? '' : `\n     react: ${a.slice(0, 400)}\n     blade: ${b.slice(0, 400)}`}`);
    }
  }
  await browser.close();
})();
