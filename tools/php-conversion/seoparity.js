// Head / SEO parity for every page (React :3000 vs Blade): page title, meta description, Open Graph and
// Twitter tags, robots, canonical, and the JSON-LD blocks, read after the page's scripts have run.
const { chromium } = require('playwright');

const REACT = 'http://127.0.0.1:3000';
const BLADE = process.argv[2] || 'http://127.0.0.1:8095';

(async () => {
  const live = (await (await fetch('https://daivikalife.com/api/products')).json()).data;
  const ROUTES = ['/', '/products', '/products?category=mala', '/products?theme=karungali', `/product/${live[0]._id}`, '/login', '/profile', '/wishlist',
    '/order-tracking', '/about', '/contact', '/faq', '/privacy-policy', '/terms-of-service', '/refund-policy', '/returns-exchanges', '/shipping-policy', '/admin/dashboard', '/no-such-page'];
  const browser = await chromium.launch();
  const read = async (base, route) => {
    const ctx = await browser.newContext();
    await ctx.route('**/*', async (r) => {
      const u = r.request().url();
      if (/products\/events|facebook/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
      if (base === BLADE && u.startsWith(BLADE + '/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace(BLADE, 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
      return r.continue();
    });
    await ctx.addInitScript(() => { localStorage.setItem('daivika_coupon_popup_seen', '1'); sessionStorage.setItem('daivika_initial_loaded', 'true'); });
    const page = await ctx.newPage();
    const res = await page.goto(base + route, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(6000);
    const head = await page.evaluate(() => {
      const meta = (sel) => [...document.querySelectorAll(sel)].map((m) => m.getAttribute('content')).join(' | ');
      return {
        title: document.title,
        description: meta('meta[name="description"]'),
        ogTitle: meta('meta[property="og:title"]'),
        ogDescription: meta('meta[property="og:description"]'),
        robots: meta('meta[name="robots"]'),
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.href).join(' | '),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type']; } catch (e) { return 'bad'; } }).sort().join(','),
        lang: document.documentElement.lang,
      };
    });
    head.status = res ? res.status() : 0;
    await ctx.close();
    return head;
  };
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const route of ROUTES) {
    if (only && !only.includes(route)) continue;
    const r = await read(REACT, route), b = await read(BLADE, route);
    const diffs = Object.keys(r).filter((k) => r[k] !== b[k]);
    console.log(`${diffs.length ? 'DIFF' : 'SAME'} ${route}`);
    diffs.forEach((k) => console.log(`   ${k}:\n     react: ${String(r[k]).slice(0, 200)}\n     blade: ${String(b[k]).slice(0, 200)}`));
  }
  await browser.close();
})();
