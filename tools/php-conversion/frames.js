// Record the first animation frames after opening the 2nd FAQ: panel height and the 3rd card's top position
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const [site, url] of Object.entries({ react: 'http://localhost:3000/faq', blade: 'http://localhost:8090/faq' })) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route('**/*', r => (/razorpay|cashfree|facebook|google/i.test(r.request().url()) || (r.request().url().includes('/api/') && r.request().method() !== 'GET') ? r.abort() : r.continue()));
    await ctx.addInitScript(() => { try { localStorage.setItem('daivika_coupon_popup_seen', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const frames = await page.evaluate(() => new Promise(resolve => {
      const h3s = [...document.querySelectorAll('h3')];
      const second = h3s.find(h => h.textContent.includes('How can I track')).closest('button');
      const third = h3s.find(h => h.textContent.includes('What is your return')).closest('button').parentElement;
      const card = second.parentElement;
      const out = [];
      const rec = (label) => { const p = card.children[1]; out.push(`${label}: panel=${p ? Math.round(p.getBoundingClientRect().height) : 0} op=${p ? (+getComputedStyle(p).opacity).toFixed(2) : '-'} thirdTop=${Math.round(third.getBoundingClientRect().top)}`); };
      rec('before');
      second.click();
      rec('sync');
      let n = 0;
      const tick = () => { rec('frame' + (++n)); if (n < 4) requestAnimationFrame(tick); else resolve(out); };
      requestAnimationFrame(tick);
    }));
    console.log(site.toUpperCase()); frames.forEach(f => console.log('  ' + f));
    await ctx.close();
  }
  await browser.close();
})();
