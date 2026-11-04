// React /faq (Next.js, :3000) vs Blade /faq (Laravel, :8095): sections, styles, animations, head tags.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const SITES = { react: 'http://localhost:3000/faq', blade: 'http://127.0.0.1:8095/faq' };
const OUT = path.join(__dirname, 'faq');
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const BLOCK = /facebook|fbevents|google-analytics|googletagmanager|clarity|hotjar|razorpay|cashfree/i;
fs.mkdirSync(OUT, { recursive: true });

// Locate each section the same way on both pages
const SECTIONS = {
  header: () => document.querySelector('.subpage-header-wrapper'),
  breadcrumbs: () => document.querySelector('nav[aria-label="Breadcrumb"]'),
  tabs: () => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'All')?.parentElement,
  list: () => [...document.querySelectorAll('h3')].find(h => h.textContent.includes('How long does shipping take'))?.closest('button')?.parentElement?.parentElement,
  helpCard: () => [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Still have questions'))?.parentElement?.parentElement,
  footer: () => document.querySelector('footer.footer-root'),
};

async function open(browser, site, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  await ctx.route('**/*', r => {
    const req = r.request(), url = req.url();
    if (BLOCK.test(url)) return r.abort();
    if (url.includes('/api/') && req.method() !== 'GET') return r.abort();
    return r.continue();
  });
  // No welcome popup on top of the page under test
  await ctx.addInitScript(() => { try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
  const failed = [];
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
  await page.goto(SITES[site], { waitUntil: 'networkidle' });
  return { ctx, page, errors, failed };
}

async function sectionShot(page, name, file) {
  const handle = await page.evaluateHandle(`(${SECTIONS[name].toString()})()`);
  const el = handle.asElement();
  if (!el) return null;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.mouse.move(0, 0);
  await el.screenshot({ path: file, animations: 'disabled' });
  return file;
}

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return { pct: +(100 * n / (w * h)).toFixed(2), size: `${A.width}x${A.height} vs ${B.width}x${B.height}` };
}

const sample = async (page, fn, times) => {
  const out = [];
  let t0 = Date.now();
  for (const t of times) { const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait); out.push(await page.evaluate(fn)); }
  return out;
};

(async () => {
  const browser = await chromium.launch();
  const R = { sections: {}, anim: {}, head: {}, errors: {}, a11y: {} };

  // 1. Section screenshots at three widths
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const files = {};
    for (const site of Object.keys(SITES)) {
      const { ctx, page, errors, failed } = await open(browser, site, vp);
      await page.waitForTimeout(1200);
      for (const name of Object.keys(SECTIONS)) {
        const f = path.join(OUT, `${vpName}_${name}_${site}.png`);
        files[`${name}_${site}`] = await sectionShot(page, name, f);
      }
      if (vpName === 'desktop') { R.errors[site] = { errors: [...new Set(errors)], failed: [...new Set(failed)] }; }
      await ctx.close();
    }
    for (const name of Object.keys(SECTIONS)) {
      const a = files[`${name}_react`], b = files[`${name}_blade`];
      R.sections[`${vpName}_${name}`] = a && b ? pxDiff(a, b, path.join(OUT, `${vpName}_${name}_DIFF.png`)) : `missing (react:${!!a} blade:${!!b})`;
    }
  }

  // 2. Animations, head tags, behaviour (desktop)
  for (const site of Object.keys(SITES)) {
    const { ctx, page } = await open(browser, site, VIEWPORTS.desktop);
    const A = R.anim[site] = {};

    // Entrance of the tabs (sampled from a fresh load)
    await page.reload({ waitUntil: 'domcontentloaded' });
    A.tabsEntrance = await sample(page, `(() => { const t = (${SECTIONS.tabs.toString()})(); if (!t) return null; const s = getComputedStyle(t); return s.opacity.slice(0,4) + ' ' + s.transform; })()`, [100, 400, 700, 1000, 1400]);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Initial open item and its panel
    A.initialOpen = await page.evaluate(() => [...document.querySelectorAll('h3')].filter(h => getComputedStyle(h).color !== 'rgb(17, 17, 17)').map(h => h.textContent.trim().slice(0, 30)));

    // Open the 2nd question and sample its panel height, opacity, icon rotation
    const q2 = page.locator('h3', { hasText: 'How can I track my sacred order' });
    await q2.click();
    A.openSecond = await sample(page, `(() => {
      const card = [...document.querySelectorAll('h3')].find(h => h.textContent.includes('How can I track'))?.closest('button')?.parentElement;
      const panel = card?.children[1];
      const icon = card?.querySelector('button > div');
      return { h: panel ? Math.round(panel.getBoundingClientRect().height) : 0, op: panel ? getComputedStyle(panel).opacity.slice(0,4) : '-', rot: icon ? getComputedStyle(icon).transform : '-', bg: getComputedStyle(card).backgroundColor };
    })()`, [0, 100, 250, 500, 800]);
    A.afterOpenSecond = await page.evaluate(() => [...document.querySelectorAll('h3')].filter(h => getComputedStyle(h).color !== 'rgb(17, 17, 17)').map(h => h.textContent.trim().slice(0, 30)));

    // Click it again: closes
    await q2.click(); await page.waitForTimeout(900);
    A.afterCloseSecond = await page.evaluate(() => [...document.querySelectorAll('h3')].filter(h => getComputedStyle(h).color !== 'rgb(17, 17, 17)').map(h => h.textContent.trim().slice(0, 30)));

    // Switch to the "Product" tab and sample the list fade/slide
    await page.locator('button', { hasText: /^Product$/ }).click();
    A.tabSwitch = await sample(page, `(() => { const l = (${SECTIONS.list.toString()})(); const s = l ? getComputedStyle(l) : null; return s ? s.opacity.slice(0,4) + ' ' + s.transform : null; })()`, [50, 250, 500, 750, 1000, 1300]);
    await page.waitForTimeout(800);
    A.afterTab = await page.evaluate(() => ({
      visible: [...document.querySelectorAll('h3')].filter(h => h.offsetParent !== null).map(h => h.textContent.trim().slice(0, 30)),
      open: [...document.querySelectorAll('h3')].filter(h => h.offsetParent !== null && getComputedStyle(h).color !== 'rgb(17, 17, 17)').map(h => h.textContent.trim().slice(0, 30)),
      activeTab: [...document.querySelectorAll('button')].filter(b => getComputedStyle(b).backgroundColor === 'rgb(10, 10, 10)').map(b => b.textContent.trim()),
    }));
    // Clicking the already active tab
    await page.locator('button', { hasText: /^Product$/ }).click();
    A.sameTabAgain = await sample(page, `(() => { const l = (${SECTIONS.list.toString()})(); return l ? getComputedStyle(l).opacity.slice(0,4) : null; })()`, [100, 400]);

    // Help card entrance on scroll
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    A.helpBefore = await page.evaluate(`(() => { const c = (${SECTIONS.helpCard.toString()})(); const s = getComputedStyle(c); return s.opacity + ' ' + s.transform; })()`);
    await page.evaluate(`(${SECTIONS.helpCard.toString()})().scrollIntoView({ block: 'center' })`);
    A.helpEntrance = await sample(page, `(() => { const c = (${SECTIONS.helpCard.toString()})(); const s = getComputedStyle(c); return s.opacity.slice(0,4) + ' ' + s.transform; })()`, [50, 150, 300, 600, 1000]);

    // Mouse-follow glow (CSS variables on <html>)
    await page.mouse.move(100, 100); await page.waitForTimeout(200);
    A.mouseGlow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mouse-x').trim() + ' / ' + getComputedStyle(document.documentElement).getPropertyValue('--mouse-y').trim());

    // Hover states
    const firstLink = page.locator('footer a.dv-footer-link, footer ul a').first();
    await firstLink.hover(); await page.waitForTimeout(400);
    A.footerLinkHover = await firstLink.evaluate(e => { const s = getComputedStyle(e); return s.color + ' ' + s.transform; });
    const crumb = page.locator('nav[aria-label="Breadcrumb"] a').first();
    await crumb.hover(); await page.waitForTimeout(300);
    A.breadcrumbHover = await crumb.evaluate(e => getComputedStyle(e).color);

    // Keyboard: Tab to the first FAQ button, press Enter
    await page.evaluate(() => window.scrollTo(0, 0));
    A.keyboard = await page.evaluate(() => { const b = [...document.querySelectorAll('h3')][0].closest('button'); b.focus(); return document.activeElement === b; });
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    A.afterEnter = await page.evaluate(() => [...document.querySelectorAll('h3')].filter(h => h.offsetParent !== null && getComputedStyle(h).color !== 'rgb(17, 17, 17)').map(h => h.textContent.trim().slice(0, 30)));

    // Head tags and structured data
    R.head[site] = await page.evaluate(() => ({
      title: document.title,
      metas: [...document.querySelectorAll('meta[name],meta[property]')].map(m => (m.name || m.getAttribute('property')) + '=' + (m.content || '').slice(0, 60)).sort(),
      canonical: document.querySelector('link[rel=canonical]')?.href || '',
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { const j = JSON.parse(s.textContent); return j['@type'] + (j.mainEntity ? `(${j.mainEntity.length})` : ''); } catch (e) { return 'invalid'; } }).sort(),
      lang: document.documentElement.lang,
      stylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.replace(/^https?:\/\/[^/]+/, '')),
    }));
    R.a11y[site] = await page.evaluate(() => ({
      faqButtonsAriaExpanded: [...document.querySelectorAll('h3')].map(h => h.closest('button')?.getAttribute('aria-expanded')),
      tabButtonsType: [...document.querySelectorAll('button')].filter(b => ['All', 'Orders', 'Product'].includes(b.textContent.trim())).map(b => b.getAttribute('type')),
      svgAriaHidden: [...document.querySelectorAll('main svg')].filter(s => s.getAttribute('aria-hidden') === 'true').length + '/' + document.querySelectorAll('main svg').length,
      h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
      landmarks: { header: document.querySelectorAll('header,nav').length, main: document.querySelectorAll('main').length, footer: document.querySelectorAll('footer').length },
    }));
    await ctx.close();
  }

  // 3. No-JavaScript render (what a crawler without JS or a slow phone sees first)
  for (const site of Object.keys(SITES)) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(SITES[site], { waitUntil: 'load' }).catch(() => {});
    await page.screenshot({ path: path.join(OUT, `nojs_${site}.png`) });
    R.anim[site].noJs = await page.evaluate(() => ({
      questions: [...document.querySelectorAll('h3')].length,
      tabsOpacity: (() => { const t = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'All')?.parentElement; return t ? getComputedStyle(t).opacity : 'none'; })(),
      answerVisible: document.body.innerText.includes('Our standard express shipping'),
    }));
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, 'faq-report.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})();
