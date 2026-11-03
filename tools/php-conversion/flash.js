// Delay the animation script by 2 s and see what is painted meanwhile and right after it runs
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const [site, url, slow] of [['react', 'http://localhost:3000/faq', /_next\/static\/chunks\/.*\.js/], ['blade', 'http://localhost:8090/faq', /\/js\/motion\.js/]]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {} });
    await ctx.route('**/*', async r => {
      const u = r.request().url();
      if (/razorpay|cashfree|facebook|google-analytics/i.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
      if (slow.test(u)) await new Promise(res => setTimeout(res, 2000));
      return r.continue();
    });
    const page = await ctx.newPage();
    page.goto(url).catch(() => {});
    const states = [];
    for (const t of [600, 1200, 1800, 2300, 2600, 3200]) {
      await page.waitForTimeout(t - (states.length ? [600, 1200, 1800, 2300, 2600, 3200][states.length - 1] : 0));
      states.push(t + 'ms: ' + await page.evaluate(() => {
        const h = [...document.querySelectorAll('h3')].find(x => x.textContent.includes('How long does shipping'));
        const list = h?.closest('button')?.parentElement?.parentElement;
        const tabs = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'All')?.parentElement;
        const op = el => el ? (+getComputedStyle(el).opacity).toFixed(2) : 'absent';
        return `list=${op(list)} tabs=${op(tabs)} questions=${document.querySelectorAll('h3').length}`;
      }).catch(e => 'n/a'));
      if (states.length === 1) await page.screenshot({ path: `faq/slowjs_${site}.png` });
    }
    console.log(site.toUpperCase()); states.forEach(s => console.log('  ' + s));
    await ctx.close();
  }
  await browser.close();
})();
