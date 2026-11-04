// Login page parity (React :3000 vs Blade :8095): login, register, OTP and forgot-password screens and the
// "invalid number" error, at 1440 and 375 px. Nothing is sent to the live API (non-GET calls are blocked).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const BASE = { react: 'http://localhost:3000', blade: 'http://127.0.0.1:8095' };
const OUT = path.join(__dirname, 'pages');
const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };
const STEPS = {
  login: null,
  register: async (p) => { await p.click('button.auth-tab:has-text("Register")'); await p.waitForTimeout(900); },
  otp: async (p) => { await p.click('button:has-text("Log in with OTP")'); await p.waitForTimeout(500); },
  reset: async (p) => { await p.click('button:has-text("Forgot password?")'); await p.waitForTimeout(500); },
  error: async (p) => { await p.fill('input[placeholder="10-digit Mobile Number"]', '12345'); await p.fill('input[type="password"]', 'secret1'); await p.click('button[type="submit"]'); await p.waitForTimeout(800); },
  eye: async (p) => { await p.fill('input[type="password"]', 'secret1'); await p.click('.password-toggle-minimal'); await p.waitForTimeout(300); },
};

function pxDiff(a, b, out) {
  const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = i => { const o = new PNG({ width: w, height: h }); PNG.bitblt(i, o, 0, 0, w, h, 0, 0); return o; };
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(crop(A).data, crop(B).data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(out, PNG.sync.write(d));
  return `${(100 * n / (w * h)).toFixed(2)}%`;
}

(async () => {
  const browser = await chromium.launch();
  for (const [name, step] of Object.entries(STEPS)) {
    for (const [vpName, vp] of Object.entries(VPS)) {
      const res = {};
      for (const site of Object.keys(BASE)) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === 'mobile', hasTouch: vpName === 'mobile' });
        await ctx.route('**/*', async r => {
          const u = r.request().url();
          if (/facebook|razorpay|cashfree|products\/events/.test(u) || (u.includes('/api/') && r.request().method() !== 'GET')) return r.abort();
          if (site === 'blade' && u.startsWith('http://127.0.0.1:8095/api/')) { try { return r.fulfill({ response: await r.fetch({ url: u.replace('http://127.0.0.1:8095', 'https://daivikalife.com') }) }); } catch (e) { return r.abort(); } }
          return r.continue();
        });
        await ctx.addInitScript(() => { const s = document.createElement('style'); s.textContent = '*{animation-play-state:paused!important;caret-color:transparent!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message.slice(0, 150)));
        await page.goto(BASE[site] + '/login', { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(3000);
        if (step) await step(page);
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
        await page.waitForTimeout(400);
        const file = path.join(OUT, `login_${name}_${vpName}_${site}.png`);
        await page.screenshot({ path: file });
        const text = await page.evaluate(() => document.querySelector('.login-form-container').innerText.replace(/\s+/g, ' ').trim());
        res[site] = { file, text, errors, title: await page.title() };
        await ctx.close();
      }
      const R = res.react, B = res.blade;
      console.log(`${name.padEnd(9)} ${vpName.padEnd(7)} text ${R.text === B.text ? 'SAME' : 'DIFF'} px ${pxDiff(R.file, B.file, path.join(OUT, `login_${name}_${vpName}_DIFF.png`))}${R.title !== B.title ? ` title "${R.title}" vs "${B.title}"` : ''}${B.errors.length ? ' blade errors ' + JSON.stringify(B.errors) : ''}`);
      if (R.text !== B.text) console.log('   react:', R.text.slice(0, 300), '\n   blade:', B.text.slice(0, 300));
    }
  }
  await browser.close();
})();
