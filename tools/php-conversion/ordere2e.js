// End-to-end order on the LOCAL Blade site only (never the live store): cart → checkout form → order created
// by the local Laravel API → payment → server verifies the Razorpay signature and confirms the order → success
// screen, saved order, emptied cart. Razorpay itself is stood in for: the dev server runs with
// RAZORPAY_KEY_SECRET=local-test-secret, the test stores a fake Razorpay order id on the order (what
// /api/payment/create-order would do) and the payment window answers with a correctly signed payment.
// Needs products in the local database. Usage: node ordere2e.js [cod]
const { chromium } = require('playwright');
const crypto = require('crypto');
const { execSync } = require('child_process');

const BASE = 'http://127.0.0.1:8095';
const SECRET = 'local-test-secret';
const COD = process.argv[2] === 'cod';
const psql = (sql) => execSync(`docker exec daivika-dev-db psql -U dev -d daivika_db -t -A -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } }).trim();

(async () => {
  const products = (await (await fetch(`${BASE}/api/products`)).json()).data;
  if (!products.length) throw new Error('No products in the local database');
  const p = products[0];
  const cart = [{ ...p, id: p._id, cartId: p._id, quantity: 2, originalPrice: Number(p.price), price: Number(p.price), mrp: Number(p.mrp), selectedVariant: null, isFreeGift: false }];
  const stockBefore = psql(`SELECT inventory FROM "Product" WHERE id='${p._id}'`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rzpOrderId = 'order_LOCALTEST' + Date.now();
  const payId = 'pay_LOCALTEST' + Date.now();
  const signature = crypto.createHmac('sha256', SECRET).update(`${rzpOrderId}|${payId}`).digest('hex');
  let created = null;
  await ctx.route('**/*', async (r) => {
    const u = r.request().url();
    if (!u.startsWith(BASE) && !/fonts|cdnjs|jsdelivr/.test(u)) return r.abort();
    // Stand-in for Razorpay's order API: remember the Razorpay order id on our order, as create-order does
    if (u.endsWith('/api/payment/create-order')) {
      const { orderId } = JSON.parse(r.request().postData());
      psql(`UPDATE "Order" SET razorpay_payment_id='${rzpOrderId}' WHERE id='${orderId}'`);
      // Amount due now: the advance for Cash on Delivery, else the total (OrderPayment::amountDue)
      const [total, cod, advance] = psql(`SELECT total, "isPartialCod", "advanceAmount" FROM "Order" WHERE id='${orderId}'`).split('|');
      const amount = Math.round(Number(cod === 't' ? advance : total) * 100);
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, order: { id: rzpOrderId, amount, currency: 'INR' }, keyId: 'rzp_test_localonly' }) });
    }
    if (u.includes('/products/events')) return r.abort();
    return r.continue();
  });
  await ctx.addInitScript(([cart, payId, signature]) => {
    localStorage.setItem('daivika_coupon_popup_seen', '1');
    localStorage.setItem('drop_cart', cart);
    // Razorpay checkout window: answers straight away with a signed successful payment
    window.Razorpay = function (opts) { this.opts = opts; };
    window.Razorpay.prototype.on = function () {};
    window.Razorpay.prototype.open = function () { window.__rzpOpened = this.opts; setTimeout(() => this.opts.handler({ razorpay_payment_id: payId, razorpay_order_id: this.opts.order_id, razorpay_signature: signature }), 300); };
    Object.defineProperty(window, 'Razorpay', { writable: false, value: window.Razorpay });
  }, [JSON.stringify(cart), payId, signature]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('script error:', e.message));
  page.on('dialog', (d) => { console.log('dialog:', d.message()); d.accept(); });
  page.on('request', (req) => { if (req.url().endsWith('/api/orders') && req.method() === 'POST') created = JSON.parse(req.postData()); });
  await page.goto(`${BASE}/checkout`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.fill('[data-f="phone"]', '9876543210');
  await page.fill('[data-f="email"]', 'e2e@example.com');
  await page.fill('[data-f="firstName"]', 'Local');
  await page.fill('[data-f="lastName"]', 'Tester');
  await page.fill('[data-f="street"]', '12 Temple Road');
  await page.fill('[data-f="pincode"]', '682001');
  await page.waitForTimeout(2500);
  await page.fill('[data-f="city"]', 'Kochi');
  const pick = async (which, value) => {
    await page.locator(`[data-select="${which}"] [role="button"]`).click();
    const search = page.locator(`[data-select="${which}"] input`);
    await search.waitFor(); await page.waitForTimeout(200);
    await search.fill(value); await search.press('Enter');
    await page.waitForTimeout(400);
  };
  await pick('state', 'Kerala');
  await pick('district', 'Ernakulam');
  console.log('chosen:', await page.locator('[data-select="state"] [role="button"]').innerText(), '/', await page.locator('[data-select="district"] [role="button"]').innerText());
  await page.waitForTimeout(500);
  if (COD) { await page.locator('[data-pay="Cash on Delivery"]').click(); await page.waitForTimeout(300); }
  const shownTotal = await page.locator('button[type="submit"]').innerText();
  console.log('pay button:', shownTotal.replace(/\s+/g, ' '));
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=/Payment Complete!|COD Order Confirmed!/', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const heading = await page.locator('h2').first().innerText().catch(() => '');
  const local = await page.evaluate(() => ({ orders: JSON.parse(localStorage.getItem('vaugun_orders') || '[]'), cart: JSON.parse(localStorage.getItem('drop_cart') || '[]'), rzp: window.__rzpOpened && { amount: window.__rzpOpened.amount, order_id: window.__rzpOpened.order_id, description: window.__rzpOpened.description } }));
  const order = local.orders[0] || {};
  console.log('success screen:', heading);
  console.log('payment window:', JSON.stringify(local.rzp));
  console.log('order sent to API:', JSON.stringify({ user: created && created.user, paymentMethod: created && created.paymentMethod, items: created && created.itemsList.map((i) => `${i.name} x${i.qty} @${i.price}`), address: created && created.address }));
  console.log('order in database:', psql(`SELECT id, status, "paymentStatus", "paymentMethod", total, "invoiceNumber", "orderNumber", "isStockDecremented" FROM "Order" WHERE id='${order._id}'`));
  console.log('cart after:', local.cart.length, 'items; local orders:', local.orders.length);
  console.log('stock before:', stockBefore.slice(0, 120));
  console.log('stock after: ', psql(`SELECT inventory FROM "Product" WHERE id='${p._id}'`).slice(0, 120));
  await page.screenshot({ path: 'pages/e2e_success.png' });
  await browser.close();
})();
