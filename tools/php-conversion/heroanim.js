// Banner crossfade after clicking "Next Slide", React vs Blade
const { chromium } = require('playwright');
const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
(async () => {
  const browser = await chromium.launch();
  for (const site of Object.keys(BASE)) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route('**/*', async r => {
      const u = r.request().url();
      if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
      if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
      return r.continue();
    });
    await ctx.addInitScript(() => { localStorage.setItem('daivika_coupon_popup_seen', '1'); sessionStorage.setItem('daivika_initial_loaded', 'true'); });
    const page = await ctx.newPage();
    await page.goto(BASE[site] + '/', { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(5000);
    const rows = await page.evaluate(async () => {
      const box = document.querySelector('.daivika-hero-aspect-container');
      const out = []; const t0 = performance.now();
      box.querySelector('button[aria-label="Next Slide"]').click();
      while (performance.now() - t0 < 700) {
        const layers = [...box.children].filter(c => c.tagName === 'DIV' && getComputedStyle(c).position === 'absolute' && c.querySelector('img'));
        const dots = [...box.querySelectorAll('button[aria-label^="Go to"]')].map(d => Math.round(d.getBoundingClientRect().width)).join(',');
        out.push(`${Math.round(performance.now() - t0)} ${layers.map(l => (+getComputedStyle(l).opacity).toFixed(2) + ':' + l.querySelector('img').src.split('/').pop().slice(0, 18)).join(' | ')} dots=${dots}`);
        await new Promise(r => setTimeout(r, 70));
      }
      return out;
    });
    console.log(site); rows.forEach(r => console.log('  ' + r));
    await ctx.close();
  }
  await browser.close();
})();
