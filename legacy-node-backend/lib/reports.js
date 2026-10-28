// Sales & stock reports built from live orders, products and vendor stock.
// Dates are bucketed in India time (IST, UTC+5:30) regardless of the server's timezone.
import Product from '@/models/Product';
import User from '@/models/User';
import Setting from '@/models/Setting';
import { isDatabaseConnected, memoryProducts, memoryUsers, memorySettings } from '@/lib/db';
import { listAllOrders, isConfirmedOrder } from '@/lib/vendor-routing';
import { listVendors, listVendorStock } from '@/lib/vendor-store';

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK = 5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const round2 = (n) => Math.round((n || 0) * 100) / 100;
const num = (n) => Number(n) || 0;

// "Wall clock" Date in IST: read it with getUTC* methods
const ist = (ms) => new Date(ms + IST_MS);

export function orderTime(o) {
  const t = new Date(o.createdAt || o.date || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

const isCod = (o) => /cod|cash/i.test(o.paymentMethod || '') || o.isPartialCod;
const qtyOf = (it) => num(it.qty || it.quantity || 1);
const customerKey = (o) => (o.email || '').toLowerCase().trim() || (o.phone || '').replace(/\D/g, '').slice(-10) || o.userId || o._id;

// ── Period buckets ─────────────────────────────────────────

export function autoGroupBy(from, to) {
  const days = (to - from) / DAY_MS;
  if (days <= 2) return 'hour';
  if (days <= 62) return 'day';
  if (days <= 182) return 'week';
  if (days <= 1100) return 'month';
  return 'year';
}

// Start (UTC ms) of the IST bucket containing ms
function bucketStart(ms, groupBy) {
  const d = ist(ms);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  let wall;
  if (groupBy === 'hour') wall = Date.UTC(y, m, day, d.getUTCHours());
  else if (groupBy === 'day') wall = Date.UTC(y, m, day);
  else if (groupBy === 'week') wall = Date.UTC(y, m, day - ((d.getUTCDay() + 6) % 7)); // Monday
  else if (groupBy === 'month') wall = Date.UTC(y, m, 1);
  else wall = Date.UTC(y, 0, 1);
  return wall - IST_MS;
}

function nextBucket(start, groupBy) {
  const d = ist(start);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate(), h = d.getUTCHours();
  let wall;
  if (groupBy === 'hour') wall = Date.UTC(y, m, day, h + 1);
  else if (groupBy === 'day') wall = Date.UTC(y, m, day + 1);
  else if (groupBy === 'week') wall = Date.UTC(y, m, day + 7);
  else if (groupBy === 'month') wall = Date.UTC(y, m + 1, 1);
  else wall = Date.UTC(y + 1, 0, 1);
  return wall - IST_MS;
}

function bucketLabel(start, groupBy) {
  const d = ist(start);
  const dm = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  if (groupBy === 'hour') {
    const h = d.getUTCHours();
    return `${dm}, ${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;
  }
  if (groupBy === 'day') return `${dm} ${d.getUTCFullYear()}`;
  if (groupBy === 'week') return `Week of ${dm} ${d.getUTCFullYear()}`;
  if (groupBy === 'month') return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return String(d.getUTCFullYear());
}

export const formatIST = (ms) => {
  const d = ist(ms);
  const h = d.getUTCHours();
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${((h + 11) % 12) + 1}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// ── Data loading ───────────────────────────────────────────

async function loadProducts() {
  const products = isDatabaseConnected ? await Product.find({}) : memoryProducts;
  return products.map(p => ({
    _id: (p._id || p.id || '').toString(),
    name: p.name,
    code: p.code || '',
    category: p.category || 'Uncategorised',
    price: num(p.price),
    inventory: Array.isArray(p.inventory) ? p.inventory : [],
  }));
}

async function loadUsers() {
  try {
    if (isDatabaseConnected) return await User.find({ role: 'user' });
  } catch (err) {
    console.warn('[reports] user lookup failed:', err.message);
  }
  return memoryUsers.filter(u => (u.role || 'user') === 'user');
}

// Store name and address for report headers (same source as invoices)
async function loadCompany() {
  let value = {};
  try {
    const row = isDatabaseConnected
      ? await Setting.findOne({ key: 'invoice_settings' })
      : memorySettings.find(st => st.key === 'invoice_settings');
    value = row?.value || {};
  } catch (err) {
    console.warn('[reports] invoice settings lookup failed:', err.message);
  }
  return {
    name: value.companyName || 'DAIVIKA Store',
    address: [value.companyStreet, value.companyCity, value.companyState, value.companyPin].filter(Boolean).join(', '),
    email: value.companyEmail || '',
    phone: value.companyPhone || '',
  };
}

// ── Summary for one set of orders ──────────────────────────

// Returning customer = someone whose first order was before this period
function summarize(orders, firstOrderAt, periodStart) {
  const active = orders.filter(o => o.status !== 'Cancelled');
  const cancelled = orders.filter(o => o.status === 'Cancelled');
  const gross = active.reduce((s, o) => s + num(o.total), 0);
  let items = 0, productSales = 0;
  for (const o of active) {
    for (const it of o.itemsList || []) {
      if (it.isFreeGift) continue;
      items += qtyOf(it);
      productSales += qtyOf(it) * num(it.price);
    }
  }
  const customers = new Set(active.map(customerKey));
  const returning = [...customers].filter(c => firstOrderAt[c] < periodStart).length;
  const cod = active.filter(isCod);
  return {
    grossSales: round2(gross),
    orders: active.length,
    itemsSold: items,
    avgOrderValue: round2(active.length ? gross / active.length : 0),
    productSales: round2(productSales),
    discounts: round2(active.reduce((s, o) => s + num(o.discount), 0)),
    shipping: round2(active.reduce((s, o) => s + num(o.shippingCharge), 0)),
    onlineSales: round2(gross - cod.reduce((s, o) => s + num(o.total), 0)),
    codSales: round2(cod.reduce((s, o) => s + num(o.total), 0)),
    codOrders: cod.length,
    cancelledOrders: cancelled.length,
    cancelledValue: round2(cancelled.reduce((s, o) => s + num(o.total), 0)),
    deliveredOrders: active.filter(o => o.status === 'Delivered').length,
    pendingFulfilment: active.filter(o => ['Processing', 'Packed', 'Shipped'].includes(o.status)).length,
    customers: customers.size,
    returningCustomers: returning,
  };
}

const growth = (cur, prev) => (prev ? round2(((cur - prev) / prev) * 100) : cur ? null : 0);

const tally = (map, key, add) => {
  const row = map.get(key) || { key, orders: 0, revenue: 0, items: 0 };
  row.orders += add.orders || 0;
  row.revenue += add.revenue || 0;
  row.items += add.items || 0;
  map.set(key, row);
};
const sorted = (map, by = 'revenue') => [...map.values()].map(r => ({ ...r, revenue: round2(r.revenue) })).sort((a, b) => b[by] - a[by]);

/**
 * Builds a report.
 *  from, to   Date range (ms)
 *  groupBy    hour | day | week | month | year | auto
 *  vendorId   undefined = all orders, 'main' = main store only, or a vendor id
 *  forVendor  true for a vendor's own report (hides store-wide data like sign-ups)
 */
// Everything a report reads, loaded once (comparisons build several reports from the same data)
export async function loadReportContext() {
  const [allOrders, products, vendors, company] = await Promise.all([listAllOrders(), loadProducts(), listVendors(), loadCompany()]);
  return { allOrders, products, vendors, company };
}

export async function buildReport({ from, to, groupBy = 'auto', vendorId, forVendor = false, scopeLabel, ctx }) {
  if (!(to > from)) throw new Error('The end date must be after the start date');
  const gb = groupBy === 'auto' ? autoGroupBy(from, to) : groupBy;
  const span = to - from;
  if (gb === 'hour' && span > 62 * DAY_MS) throw new Error('Hourly reports are limited to 62 days');
  if (gb === 'day' && span > 3 * 366 * DAY_MS) throw new Error('Daily reports are limited to 3 years');

  const { allOrders, products, vendors, company } = ctx || await loadReportContext();
  const productById = new Map(products.map(p => [p._id, p]));
  const vendorById = new Map(vendors.map(v => [v.id, v]));

  const scoped = allOrders.filter(o => isConfirmedOrder(o) || o.status === 'Cancelled').filter(o => {
    if (o.status === 'Pending Payment' || o.paymentStatus === 'Pending') return false;
    if (!vendorId) return true;
    if (vendorId === 'main') return !o.vendorId;
    return o.vendorId === vendorId;
  });

  // First order time per customer (for returning-customer counts)
  const firstOrderAt = {};
  for (const o of scoped) {
    const k = customerKey(o), t = orderTime(o);
    if (firstOrderAt[k] === undefined || t < firstOrderAt[k]) firstOrderAt[k] = t;
  }

  const inRange = (o, a, b) => { const t = orderTime(o); return t >= a && t <= b; };
  const orders = scoped.filter(o => inRange(o, from, to)).sort((a, b) => orderTime(a) - orderTime(b));
  const prevOrders = scoped.filter(o => inRange(o, from - span - 1, from - 1));
  const active = orders.filter(o => o.status !== 'Cancelled');

  const summary = summarize(orders, firstOrderAt, from);
  const previous = summarize(prevOrders, firstOrderAt, from - span - 1);
  const change = {};
  for (const k of Object.keys(summary)) {
    change[k] = growth(summary[k], previous[k]);
  }

  if (!forVendor) {
    const users = ctx ? (ctx.users ||= await loadUsers()) : await loadUsers();
    summary.newSignups = users.filter(u => { const t = new Date(u.createdAt || 0).getTime(); return t >= from && t <= to; }).length;
    previous.newSignups = users.filter(u => { const t = new Date(u.createdAt || 0).getTime(); return t >= from - span - 1 && t <= from - 1; }).length;
    change.newSignups = growth(summary.newSignups, previous.newSignups);
  }

  // Time series with every bucket present (zeros included)
  const series = [];
  const index = new Map();
  for (let b = bucketStart(from, gb), guard = 0; b <= to && guard < 5000; b = nextBucket(b, gb), guard++) {
    index.set(b, series.length);
    series.push({ period: bucketLabel(b, gb), start: b, orders: 0, revenue: 0, items: 0, cancelled: 0 });
  }
  for (const o of orders) {
    const row = series[index.get(bucketStart(orderTime(o), gb))];
    if (!row) continue;
    if (o.status === 'Cancelled') { row.cancelled++; continue; }
    row.orders++;
    row.revenue += num(o.total);
    row.items += (o.itemsList || []).filter(it => !it.isFreeGift).reduce((s, it) => s + qtyOf(it), 0);
  }
  series.forEach(r => { r.revenue = round2(r.revenue); });

  // Breakdowns
  const byStatus = new Map(), byPayment = new Map(), byState = new Map(), byDistrict = new Map();
  const byCategory = new Map(), byProduct = new Map(), byVendor = new Map(), byCoupon = new Map(), byCustomer = new Map();
  const byHour = Array.from({ length: 24 }, (_, h) => ({ key: `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`, orders: 0, revenue: 0 }));
  const byWeekday = WEEKDAYS.map(d => ({ key: d, orders: 0, revenue: 0 }));

  for (const o of orders) tally(byStatus, o.status || 'Unknown', { orders: 1, revenue: num(o.total) });
  for (const o of active) {
    const total = num(o.total);
    const items = (o.itemsList || []).filter(it => !it.isFreeGift).reduce((s, it) => s + qtyOf(it), 0);
    const add = { orders: 1, revenue: total, items };
    tally(byPayment, isCod(o) ? 'Cash on Delivery' : (o.paymentMethod || 'Online'), add);
    tally(byState, o.address?.state || 'Unknown', add);
    tally(byDistrict, o.address?.district ? `${o.address.district}, ${o.address.state || ''}` : 'Not given', add);
    tally(byVendor, o.vendorId ? (vendorById.get(o.vendorId)?.businessName || vendorById.get(o.vendorId)?.name || o.vendorName || 'Vendor') : 'Main store', add);
    if (o.couponCode) {
      const c = byCoupon.get(o.couponCode) || { key: o.couponCode, orders: 0, discount: 0, revenue: 0 };
      c.orders++; c.discount += num(o.discount); c.revenue += total;
      byCoupon.set(o.couponCode, c);
    }
    const ck = customerKey(o);
    const cust = byCustomer.get(ck) || { key: ck, name: o.user || '', phone: o.phone || '', state: o.address?.state || '', orders: 0, items: 0, revenue: 0, returning: firstOrderAt[ck] < from };
    cust.orders++; cust.items += items; cust.revenue += total;
    byCustomer.set(ck, cust);
    const d = ist(orderTime(o));
    byHour[d.getUTCHours()].orders++; byHour[d.getUTCHours()].revenue += total;
    byWeekday[d.getUTCDay()].orders++; byWeekday[d.getUTCDay()].revenue += total;

    for (const it of o.itemsList || []) {
      if (it.isFreeGift) continue;
      const pid = (it.productId || it._id || '').toString();
      const p = productById.get(pid);
      const q = qtyOf(it), rev = q * num(it.price);
      tally(byCategory, p?.category || 'Uncategorised', { orders: 1, revenue: rev, items: q });
      const row = byProduct.get(pid) || { key: pid, name: p?.name || it.name || 'Unknown product', code: p?.code || '', category: p?.category || '', orders: 0, items: 0, revenue: 0 };
      row.orders++; row.items += q; row.revenue += rev;
      byProduct.set(pid, row);
    }
  }
  byHour.forEach(r => { r.revenue = round2(r.revenue); });
  byWeekday.forEach(r => { r.revenue = round2(r.revenue); });

  // Stock snapshot (current, not historical)
  let stock;
  if (forVendor || (vendorId && vendorId !== 'main')) {
    const rows = await listVendorStock({ vendorId });
    stock = rows.map(r => {
      const p = productById.get(r.productId);
      return { product: p?.name || '(deleted product)', code: p?.code || '', category: p?.category || '', variant: [r.variant, r.color].filter(Boolean).join(' / ') || 'Standard', stock: r.stock, active: r.isActive, low: r.isActive && r.stock <= LOW_STOCK };
    }).sort((a, b) => a.stock - b.stock);
  } else {
    const vendorRows = await listVendorStock();
    const activeVendors = new Set(vendors.filter(v => v.isActive).map(v => v.id));
    stock = products.map(p => {
      const main = p.inventory.reduce((s, i) => s + num(i.stock), 0);
      const vend = vendorRows.filter(r => r.productId === p._id && r.isActive && activeVendors.has(r.vendorId)).reduce((s, r) => s + num(r.stock), 0);
      const total = vendorId === 'main' ? main : main + vend;
      return { product: p.name, code: p.code, category: p.category, mainStock: main, vendorStock: vend, stock: total, low: total <= LOW_STOCK };
    }).sort((a, b) => a.stock - b.stock);
  }

  const orderRows = [...orders].reverse().map(o => ({
    id: (o._id || o.id || '').toString(),
    invoice: o.invoiceNumber || '',
    date: formatIST(orderTime(o)),
    customer: o.user || '',
    phone: o.phone || '',
    district: o.address?.district || '',
    state: o.address?.state || '',
    items: (o.itemsList || []).filter(it => !it.isFreeGift).map(it => `${it.name || 'Item'}${[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join('/')})` : ''} ×${qtyOf(it)}`).join(', '),
    qty: (o.itemsList || []).filter(it => !it.isFreeGift).reduce((s, it) => s + qtyOf(it), 0),
    payment: o.paymentMethod || '',
    paymentStatus: o.paymentStatus || '',
    status: o.status || '',
    fulfilledBy: o.vendorId ? (vendorById.get(o.vendorId)?.businessName || o.vendorName || 'Vendor') : 'Main store',
    discount: round2(num(o.discount)),
    shipping: round2(num(o.shippingCharge)),
    total: round2(num(o.total)),
  }));

  return {
    meta: {
      from, to,
      fromLabel: formatIST(from),
      toLabel: formatIST(to),
      groupBy: gb,
      generatedAt: Date.now(),
      generatedLabel: formatIST(Date.now()),
      scope: scopeLabel || (vendorId === 'main' ? 'Main store' : vendorId ? (vendorById.get(vendorId)?.businessName || vendorById.get(vendorId)?.name || 'Vendor') : 'All stores'),
      forVendor,
      lowStockThreshold: LOW_STOCK,
      company,
    },
    summary,
    previous,
    change,
    series,
    byStatus: sorted(byStatus, 'orders'),
    byPayment: sorted(byPayment),
    byState: sorted(byState),
    byDistrict: sorted(byDistrict).slice(0, 50),
    byCategory: sorted(byCategory),
    topProducts: [...byProduct.values()].map(r => ({ ...r, revenue: round2(r.revenue) })).sort((a, b) => b.revenue - a.revenue),
    byVendor: forVendor ? [] : sorted(byVendor),
    byCoupon: [...byCoupon.values()].map(r => ({ ...r, discount: round2(r.discount), revenue: round2(r.revenue) })).sort((a, b) => b.orders - a.orders),
    topCustomers: sorted(byCustomer).slice(0, 100).map(({ key, ...r }) => r),
    byHour,
    byWeekday,
    stock,
    orders: orderRows,
  };
}

const MAX_COMPARE_PERIODS = 24;

/**
 * Compares several periods side by side.
 *  periods  [{ from, to, label }] in the order they should be shown (oldest first)
 * Each period gets its own summary and breakdowns; `series` has one point per period for charts.
 */
export async function buildComparison({ periods, vendorId, forVendor = false, scopeLabel }) {
  if (!Array.isArray(periods) || periods.length < 2) throw new Error('Choose at least two periods to compare');
  if (periods.length > MAX_COMPARE_PERIODS) throw new Error(`You can compare up to ${MAX_COMPARE_PERIODS} periods`);
  for (const p of periods) {
    if (!(Number.isFinite(p.from) && Number.isFinite(p.to) && p.to > p.from)) throw new Error('Every period needs a valid start and end');
  }

  const ctx = await loadReportContext();
  const built = [];
  for (const p of periods) {
    const r = await buildReport({ from: p.from, to: p.to, groupBy: 'auto', vendorId, forVendor, scopeLabel, ctx });
    built.push({
      label: String(p.label || '').trim().slice(0, 40) || `${r.meta.fromLabel.split(',')[0]} – ${r.meta.toLabel.split(',')[0]}`,
      from: p.from,
      to: p.to,
      fromLabel: r.meta.fromLabel,
      toLabel: r.meta.toLabel,
      summary: r.summary,
      byCategory: r.byCategory,
      byState: r.byState.slice(0, 40),
      byPayment: r.byPayment,
      byStatus: r.byStatus,
      byVendor: r.byVendor,
      topProducts: r.topProducts.slice(0, 100),
      meta: r.meta,
    });
  }

  const first = built[0].meta;
  const from = Math.min(...built.map(b => b.from));
  const to = Math.max(...built.map(b => b.to));
  return {
    meta: {
      kind: 'comparison',
      from,
      to,
      fromLabel: formatIST(from),
      toLabel: formatIST(to),
      groupBy: 'compare',
      generatedAt: Date.now(),
      generatedLabel: formatIST(Date.now()),
      scope: first.scope,
      forVendor,
      company: first.company,
      periodCount: built.length,
    },
    periods: built.map(({ meta, ...p }) => p),
    series: built.map(b => ({ period: b.label, revenue: b.summary.grossSales, orders: b.summary.orders, items: b.summary.itemsSold })),
  };
}
