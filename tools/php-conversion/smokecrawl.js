// Audit crawl of the Blade site: opens every page (desktop and phone), records script errors, console
// errors and files that fail to load, then checks that every internal link it found leads somewhere.
// Usage: node smokecrawl.js [base url, default http://127.0.0.1:8095]
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8095';
const USER = { _id: 'u1', id: 'u1', name: 'Test Shopper', email: 'shopper@example.com', phone: '9876543210', role: 'user' };

(async () => {
  const live = (await (await fetch('https://daivikalife.com/api/products')).json()).data;
  const cart = live.slice(0, 2).map((p, i) => ({ ...p, id: p._id, cartId: p._id, quantity: i + 1, originalPrice: Number(p.price), price: Number(p.price), mrp: Number(p.mrp), isFreeGift: false }));
  const PAGES = [
    ['/', null], ['/products', null], ['/products?category=mala', null], ['/products?theme=karungali', null], [`/product/${live[0]._id}`, null],
    ['/product/does-not-exist', null], ['/login', null], ['/profile', null], ['/profile', 'user'], ['/checkout', 'cart'], ['/wishlist', null],
    ['/order-tracking', null], ['/about', null], ['/contact', null], ['/faq', null], ['/privacy-policy', null], ['/terms-of-service', null],
    ['/refund-policy', null], ['/returns-exchanges', null], ['/shipping-policy', null], ['/admin/dashboard', null], ['/vendor/dashboard', null],
    ['/no-such-page', null],
  ];
  const browser = await chromium.launch();
  const links = new Set();
  const problems = [];
  for (const [route, mode] of PAGES) {
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } })) {
      const ctx = await browser.newContext({ viewport: vp, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
      await ctx.route('**/*', async (r) => {
        const u = r.request().url();
        if (/products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
        if (u.includes('/api/auth/me') && mode === 'user') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: USER }) });
        if (u.startsWith(BASE + '/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace(BASE, 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
        return r.continue();
      });
      await ctx.addInitScript(([mode, cart]) => {
        localStorage.setItem('daivika_coupon_popup_seen', '1');
        if (mode === 'user') localStorage.setItem('vaugun_token', 'test-token');
        if (mode === 'cart') localStorage.setItem('drop_cart', cart);
      }, [mode, JSON.stringify(cart)]);
      const page = await ctx.newPage();
      const found = [];
      page.on('pageerror', (e) => found.push(`script error: ${e.message.slice(0, 160)}`));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) found.push(`console: ${m.text().slice(0, 160)}`); });
      page.on('response', (res) => {
        const u = res.url();
        if (res.status() >= 400 && u.startsWith(BASE) && !u.includes('/api/') && new URL(u).pathname !== new URL(BASE + route).pathname) found.push(`HTTP ${res.status()} ${u.replace(BASE, '')}`);
      });
      page.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(BASE) && !u.includes('/api/')) found.push(`failed ${u.replace(BASE, '')} ${r.failure() && r.failure().errorText}`); });
      let status = 0;
      try {
        const res = await page.goto(BASE + route, { waitUntil: 'load', timeout: 120000 });
        status = res ? res.status() : 0;
        await page.waitForTimeout(6000);
        (await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))).forEach((h) => { if (h && h.startsWith('/') && !h.startsWith('//')) links.add(h.split('#')[0]); });
      } catch (e) { found.push(`navigation: ${e.message.slice(0, 120)}`); }
      console.log(`${String(status).padEnd(4)} ${vpName.padEnd(7)} ${route}${mode ? ` (${mode})` : ''}${found.length ? '\n   - ' + [...new Set(found)].join('\n   - ') : ''}`);
      if (found.length) problems.push([route, vpName, found]);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\nChecking ${links.size} internal links...`);
  for (const l of [...links].sort()) {
    try {
      const r = await fetch(BASE + l, { redirect: 'manual' });
      if (r.status >= 400) console.log(`  BROKEN ${r.status} ${l}`);
    } catch (e) { console.log(`  ERROR ${l} ${e.message}`); }
  }
  console.log('done');
})();
