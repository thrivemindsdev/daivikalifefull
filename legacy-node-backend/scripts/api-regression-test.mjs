// API regression tests for checkout, payments and security.
// Run against a LOCAL server in offline mode with test credentials — never against production:
//
//   DATABASE_URL="" RAZORPAY_KEY_ID=rzp_test_x RAZORPAY_KEY_SECRET=test_secret RAZORPAY_WEBHOOK_SECRET=wh_secret npx next dev -p 3456
//   BASE_URL=http://localhost:3456 RAZORPAY_KEY_SECRET=test_secret RAZORPAY_WEBHOOK_SECRET=wh_secret \
//     ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/api-regression-test.mjs
//
// The offline catalogue (data/custom_products.json) needs at least one product with stock.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const BASE = (process.env.BASE_URL || 'http://localhost:3456').replace(/\/$/, '');
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
const WH_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'wh_secret';

let passed = 0, failed = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  ok ? passed++ : failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`);
}

async function call(method, path, { body, token, headers = {}, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

const orderBody = (items, extra = {}) => ({
  user: 'Test Devotee',
  email: 'test.devotee@example.com',
  phone: '9847012345',
  address: { street: '1 Temple Road', city: 'Kannur', district: 'Kannur', state: 'Kerala', pincode: '670001' },
  itemsList: items,
  ...extra,
});

async function main() {
  // ── Setup ──
  const products = (await call('GET', '/api/products')).json?.data || [];
  const product = products.find(p => Number(p.price) > 0 && (p.inventory || []).some(i => Number(i.stock) >= 3));
  if (!product) throw new Error('Need a product with price and at least 3 in stock in the offline catalogue');
  const inv = product.inventory.find(i => Number(i.stock) >= 3);
  const item = { productId: product._id, qty: 1, size: inv.variant || '', color: inv.color || '', price: 1, name: product.name };
  const stockOf = async () => {
    const p = (await call("GET", `/api/products/${product._id}?fresh=${Date.now()}`)).json?.data;
    return Number((p?.inventory || []).find(i => i.variant === inv.variant && i.color === inv.color)?.mainStock ?? (p?.inventory || []).find(i => i.variant === inv.variant && i.color === inv.color)?.stock);
  };

  const login = await call('POST', '/api/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  const adminToken = login.json?.data?.token;
  check('Admin can log in with ADMIN_EMAIL / ADMIN_PASSWORD', Boolean(adminToken), `status ${login.status}`);

  // ── Orders: server-side pricing ──
  const tampered = await call('POST', '/api/orders', { body: orderBody([item], { total: 1, discount: 99999, shippingCharge: 0, status: 'Processing', paymentStatus: 'Paid', _id: 'ORD_FAKE_NEW' }) });
  const o = tampered.json?.data;
  check('Order is created from browser data', tampered.status === 201, `status ${tampered.status} ${tampered.json?.message || ''}`);
  const variant = (product.variants || []).find(v => v.name === item.size);
  const expectedPrice = variant && Number(variant.price) > 0 ? Number(variant.price) : Number(product.price);
  check('Browser-sent prices / totals are ignored', o && o.itemsList?.[0]?.price === expectedPrice && o.total >= expectedPrice, JSON.stringify(o && { price: o.itemsList?.[0]?.price, expectedPrice, total: o.total }));
  check('New orders are always "Pending Payment"', o && o.status === 'Pending Payment' && o.paymentStatus === 'Pending', o && `${o.status}/${o.paymentStatus}`);
  check('Server assigns its own order ID', o && o._id !== 'ORD_FAKE_NEW' && /^ORD_[A-Z0-9]{10,}$/.test(o._id), o?._id);

  const overwrite = await call('POST', '/api/orders', { body: { ...orderBody([item]), _id: o._id, status: 'Delivered', paymentStatus: 'Paid', address: { street: 'Hacker St' } } });
  check('Existing orders cannot be overwritten from the storefront', overwrite.status === 200 && overwrite.json?.data?.status === 'Pending Payment' && !overwrite.json?.data?.address, JSON.stringify(overwrite.json?.data));

  // Bulk offer: variant bulk price applies once the quantity threshold is met
  const bulkProduct = products.find(p => (p.variants || []).some(v => Number(v.bulkMinQty) > 0 && Number(v.bulkPrice) > 0));
  if (bulkProduct) {
    const v = bulkProduct.variants.find(x => Number(x.bulkMinQty) > 0 && Number(x.bulkPrice) > 0);
    const r = await call('POST', '/api/orders', { body: orderBody([{ productId: bulkProduct._id, qty: Number(v.bulkMinQty), size: v.name, color: '' }]) });
    check('Bulk price applies at the minimum quantity', r.status === 201 && r.json?.data?.itemsList?.[0]?.price === Number(v.bulkPrice), `status ${r.status} price ${r.json?.data?.itemsList?.[0]?.price} expected ${v.bulkPrice}`);
  }

  // Coupon from the store's settings (or the checkout defaults)
  const pub = (await call('GET', '/api/public/settings')).json?.data || {};
  const coupons = Array.isArray(pub.coupons) ? pub.coupons : [{ code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20, minPurchase: 1000, usageLimit: 3 }];
  // A store-wide coupon (its category is a label, not a product-category restriction)
  const storeWide = (c) => ['welcome', 'referral', 'festival', 'other', ''].includes(String(c.category || '').toLowerCase());
  const coupon = pub.coupons_enabled === false ? null : coupons.find(c => c.code && storeWide(c));
  if (coupon) {
    const qty = Math.max(1, Math.min(3, Math.ceil((Number(coupon.minPurchase) || 0) / Number(product.price)) || 1));
    const r = await call('POST', '/api/orders', { body: orderBody([{ ...item, qty }], { couponCode: coupon.code, phone: '9847000111' }) });
    const d = r.json?.data;
    const sub = d ? d.itemsList.filter(x => !x.isFreeGift).reduce((s, x) => s + x.price * x.qty, 0) : 0;
    const expected = coupon.discountType === 'percentage' ? Math.round(sub * Number(coupon.discountValue) / 100) : Math.min(sub, Number(coupon.discountValue));
    check(`Coupon ${coupon.code} discount is computed on the server`, r.status === 201 && d.discount === expected && d.total === sub - expected + d.shippingCharge, `status ${r.status} ${r.json?.message || ''} discount ${d?.discount} expected ${expected}`);
  }

  // ── Orders: validation ──
  const neg = [
    ['empty cart', orderBody([])],
    ['negative quantity', orderBody([{ ...item, qty: -2 }])],
    ['fractional quantity', orderBody([{ ...item, qty: 1.5 }])],
    ['unknown product', orderBody([{ ...item, productId: 'does_not_exist' }])],
    ['bad phone', orderBody([item], { phone: '123' })],
    ['bad PIN code', orderBody([item], { address: { street: 'x', city: 'y', state: 'Kerala', pincode: '12' } })],
    ['missing address', orderBody([item], { address: {} })],
    ['bad email', orderBody([item], { email: 'not-an-email' })],
    ['quantity above stock', orderBody([{ ...item, qty: 99 }])],
    ['invalid coupon', orderBody([item], { couponCode: 'NOPE123' })],
  ];
  for (const [label, body] of neg) {
    const r = await call('POST', '/api/orders', { body });
    check(`Order rejected: ${label}`, r.status === 400, `status ${r.status} ${r.json?.message || ''}`);
  }

  // ── Payments: Razorpay verify ──
  const noSig = await call('POST', '/api/payment/verify', { body: { orderId: o._id, razorpay_payment_id: 'pay_x' } });
  check('Verify rejects missing signature', noSig.status === 400, `status ${noSig.status}`);
  const badSig = await call('POST', '/api/payment/verify', { body: { orderId: o._id, razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'deadbeef' } });
  check('Verify rejects a wrong signature', badSig.status === 400, `status ${badSig.status}`);
  const sig = crypto.createHmac('sha256', RZP_SECRET).update('order_other|pay_other').digest('hex');
  const wrongOrder = await call('POST', '/api/payment/verify', { body: { orderId: o._id, razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_other', razorpay_signature: sig } });
  check('Verify rejects a valid payment for a different Razorpay order', wrongOrder.status === 400, `status ${wrongOrder.status} ${wrongOrder.json?.message || ''}`);

  // ── Payments: Razorpay webhook ──
  const hook = (amountPaise, paymentId) => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId, amount: amountPaise, order_id: 'order_none', notes: { orderId: o._id } } } } });
    return call('POST', '/api/payment/webhook', { raw, headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': crypto.createHmac('sha256', WH_SECRET).update(raw).digest('hex') } });
  };
  const forged = await call('POST', '/api/payment/webhook', { raw: '{"event":"payment.captured"}', headers: { 'x-razorpay-signature': 'nope' } });
  check('Webhook rejects a forged signature', forged.status === 400, `status ${forged.status}`);

  const stockBefore = await stockOf();
  await hook(100, 'pay_short');
  const afterShort = (await call('GET', '/api/orders', { token: adminToken })).json?.data?.find(x => x._id === o._id);
  check('Underpaid webhook does not confirm the order', !afterShort, afterShort && `${afterShort.status}/${afterShort.paymentStatus}`);

  const due = Math.round(Number(o.advanceAmount || o.total) * 100);
  const ok1 = await hook(due, 'pay_full');
  await hook(due, 'pay_full'); // duplicate delivery
  const confirmed = (await call('GET', '/api/orders', { token: adminToken })).json?.data?.find(x => x._id === o._id);
  check('Correct webhook confirms the order', ok1.status === 200 && confirmed?.paymentStatus === 'Paid' && confirmed?.status === 'Processing', confirmed && `${confirmed.status}/${confirmed.paymentStatus}`);
  check('Invoice number assigned on payment', Boolean(confirmed?.invoiceNumber), confirmed?.invoiceNumber);
  const stockAfter = await stockOf();
  check('Stock taken exactly once despite duplicate webhook', stockAfter === stockBefore - 1 || confirmed?.stockSource === 'vendor', `before ${stockBefore}, after ${stockAfter}`);

  const cf = await call('POST', '/api/payment/cashfree-webhook', { raw: JSON.stringify({ data: { order: { order_id: o._id }, payment: { payment_status: 'SUCCESS' } } }), headers: { 'Content-Type': 'application/json' } });
  check('Unsigned Cashfree webhook is rejected', cf.status === 401, `status ${cf.status}`);

  const createNoOrder = await call('POST', '/api/payment/create-order', { body: { amount: 1 } });
  check('Razorpay order needs a server order (no client amount)', createNoOrder.status === 400 || createNoOrder.status === 503, `status ${createNoOrder.status}`);
  const createPaid = await call('POST', '/api/payment/create-order', { body: { orderId: o._id } });
  check('Paid orders cannot start a new payment', createPaid.status === 409 || createPaid.status === 503, `status ${createPaid.status}`);

  // ── Admin order status ──
  const badStatus = await call('PUT', `/api/orders/${o._id}/status`, { token: adminToken, body: { status: 'Refunded<script>' } });
  check('Admin status change rejects unknown statuses', badStatus.status === 400, `status ${badStatus.status}`);
  const noAuthStatus = await call('PUT', `/api/orders/${o._id}/status`, { body: { status: 'Delivered' } });
  check('Status change requires admin', noAuthStatus.status === 401, `status ${noAuthStatus.status}`);
  const cancel = await call('PUT', `/api/orders/${o._id}/status`, { token: adminToken, body: { status: 'Cancelled' } });
  const stockAfterCancel = await stockOf();
  check('Cancelling returns the stock', cancel.status === 200 && (stockAfterCancel === stockBefore || confirmed?.stockSource === 'vendor'), `stock ${stockAfterCancel} (expected ${stockBefore})`);

  // ── Auth ──
  const forgedToken = jwt.sign({ id: 'someone', role: 'admin', email: process.env.ADMIN_EMAIL }, 'seepo_jwt_secret');
  const forgedAdmin = await call('GET', '/api/admin/users', { token: forgedToken });
  check('Token signed with the old public fallback secret is rejected', forgedAdmin.status === 401, `status ${forgedAdmin.status}`);
  const me = await call('GET', '/api/auth/me', { token: adminToken });
  check('/api/auth/me does not return the password hash', me.status === 200 && !('password' in (me.json?.data || {})), Object.keys(me.json?.data || {}).join(','));
  const users = await call('GET', '/api/admin/users', { token: adminToken });
  check('Admin user list does not include password hashes', users.status === 200 && (users.json?.data || []).every(u => !('password' in u)));
  for (const [label, body] of [
    ['short password', { name: 'A', emailOrPhone: 'a@example.com', password: '123' }],
    ['bad email', { name: 'A', emailOrPhone: 'bad@', password: 'secret12' }],
    ['bad phone', { name: 'A', emailOrPhone: '12345', password: 'secret12' }],
  ]) {
    const r = await call('POST', '/api/auth/register', { body });
    check(`Register rejects ${label}`, r.status === 400, `status ${r.status}`);
  }
  let lastLogin;
  for (let i = 0; i < 12; i++) lastLogin = await call('POST', '/api/auth/login', { body: { email: 'bruteforce-target@example.com', password: `wrong${i}` } });
  check('Login is rate limited after repeated failures', lastLogin.status === 429, `status ${lastLogin.status}`);

  // ── Files ──
  for (const p of ['/uploads/%2e%2e/%2e%2e/.env', '/uploads/..%2f..%2f.env.local', '/uploads/.env', '/api/images/..%2F..%2F.env']) {
    const r = await call('GET', p);
    check(`No file outside public/ via ${p}`, r.status >= 400 && !/DATABASE_URL|JWT_SECRET/.test(r.text), `status ${r.status}`);
  }

  // ── Public data ──
  const settings = (await call('GET', '/api/public/settings')).json?.data || {};
  check('Public settings hide Meta access token / private config', !('meta_pixel_settings' in settings) && !('vendor_system' in settings));

  // ── Reviews ──
  const badRating = await call('POST', '/api/reviews', { body: { user: 'X', productName: product.name, productId: product._id, rating: 9, comment: 'x' } });
  check('Review rating must be 1–5', badRating.status === 400, `status ${badRating.status}`);
  const review = await call('POST', '/api/reviews', { body: { user: 'Tester', productName: product.name, productId: product._id, rating: 5, comment: 'Lovely' } });
  const reviewId = review.json?.data?._id;
  const fakeAdminReply = await call('POST', '/api/reviews/reply', { body: { reviewId, user: 'Admin', text: 'Official reply', isAdmin: true } });
  const reply = (fakeAdminReply.json?.data?.replies || []).slice(-1)[0];
  check('Guests cannot post replies as the admin', reply && reply.isAdmin === false && reply.user !== 'Admin', JSON.stringify(reply));

  const sell = await call('POST', '/api/products/stock', { body: { action: 'sell', items: [{}], customerName: 'Spam' } });
  check('Public "sell" notification action is gone', sell.status === 400, `status ${sell.status}`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
