// Table layouts for a report built by lib/reports.js.
// Shared by the on-screen report view and the Excel / PDF / CSV exporters so every format shows the same numbers.

export const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'trend', label: 'Sales trend' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products sold' },
  { id: 'categories', label: 'Categories' },
  { id: 'customers', label: 'Customers' },
  { id: 'regions', label: 'States & districts' },
  { id: 'payments', label: 'Payments & status' },
  { id: 'timing', label: 'Hour & weekday' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'vendors', label: 'Vendors', adminOnly: true },
  { id: 'stock', label: 'Stock' },
];

export const isComparison = (report) => report?.meta?.kind === 'comparison';

// Sections of a period comparison (built by buildComparison in lib/reports.js)
export const COMPARE_SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'periods', label: 'Period overview' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'regions', label: 'States' },
  { id: 'payments', label: 'Payments & status' },
  { id: 'vendors', label: 'Vendors', adminOnly: true },
];

export const sectionsFor = (report) => (isComparison(report) ? COMPARE_SECTIONS : SECTIONS).filter(s => !(s.adminOnly && report?.meta?.forVendor));

const GROUP_LABEL = { hour: 'Hourly', day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly', compare: 'Period comparison' };
export const groupLabel = (gb) => GROUP_LABEL[gb] || gb;

// KPI rows: [key, label, type]
export const KPIS = [
  ['grossSales', 'Gross sales', 'money'],
  ['orders', 'Orders', 'int'],
  ['itemsSold', 'Items sold', 'int'],
  ['avgOrderValue', 'Average order value', 'money'],
  ['customers', 'Customers', 'int'],
  ['returningCustomers', 'Returning customers', 'int'],
  ['newSignups', 'New sign-ups', 'int'],
  ['productSales', 'Product sales (before discounts)', 'money'],
  ['discounts', 'Discounts given', 'money'],
  ['shipping', 'Shipping collected', 'money'],
  ['onlineSales', 'Online payments', 'money'],
  ['codSales', 'Cash on delivery', 'money'],
  ['codOrders', 'COD orders', 'int'],
  ['deliveredOrders', 'Delivered orders', 'int'],
  ['pendingFulfilment', 'Awaiting delivery', 'int'],
  ['cancelledOrders', 'Cancelled orders', 'int'],
  ['cancelledValue', 'Cancelled value', 'money'],
];

export const kpisFor = (report) => KPIS.filter(([k]) => report.summary?.[k] !== undefined);

const col = (key, label, type = 'text', width) => ({ key, label, type, width });
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const totalsRow = (rows, keys, label = 'Total') => {
  const t = { _total: true };
  for (const k of keys) t[k] = Math.round(sum(rows, k) * 100) / 100;
  return { label, values: t };
};
const share = (rows, key = 'revenue') => {
  const all = sum(rows, key);
  return rows.map(r => ({ ...r, share: all ? Math.round((r[key] / all) * 1000) / 10 : 0 }));
};

/**
 * Returns the tables in one section: [{ title, columns, rows, totals? }]
 * totals.values is keyed like a row; the first column shows totals.label.
 */
export function tablesFor(report, sectionId) {
  if (isComparison(report)) return compareTablesFor(report, sectionId);
  const r = report;
  switch (sectionId) {
    case 'summary':
      return [{
        title: 'Key figures',
        columns: [col('label', 'Metric', 'text', 34), col('current', 'This period', 'auto', 18), col('previous', 'Previous period', 'auto', 18), col('change', 'Change', 'change', 12)],
        rows: kpisFor(r).map(([k, label, type]) => ({ label, current: r.summary[k], previous: r.previous?.[k], change: r.change?.[k] ?? null, _type: type })),
      }];

    case 'trend':
      return [{
        title: `${groupLabel(r.meta.groupBy)} sales`,
        columns: [col('period', 'Period', 'text', 26), col('orders', 'Orders', 'int'), col('items', 'Items', 'int'), col('revenue', 'Revenue', 'money', 16), col('cancelled', 'Cancelled', 'int')],
        rows: r.series,
        totals: totalsRow(r.series, ['orders', 'items', 'revenue', 'cancelled']),
      }];

    case 'orders':
      return [{
        title: 'Orders',
        columns: [
          col('id', 'Order ID', 'text', 16), col('invoice', 'Invoice', 'text', 13), col('date', 'Date & time', 'text', 20),
          col('customer', 'Customer', 'text', 18), col('phone', 'Phone', 'text', 13), col('district', 'District', 'text', 14), col('state', 'State', 'text', 14),
          col('items', 'Items', 'text', 40), col('qty', 'Qty', 'int', 6), col('payment', 'Payment', 'text', 12), col('paymentStatus', 'Paid?', 'text', 10),
          col('status', 'Status', 'text', 11), ...(r.meta.forVendor ? [] : [col('fulfilledBy', 'Fulfilled by', 'text', 16)]),
          col('discount', 'Discount', 'money', 11), col('shipping', 'Shipping', 'money', 11), col('total', 'Total', 'money', 13),
        ],
        rows: r.orders,
        totals: totalsRow(r.orders.filter(o => o.status !== 'Cancelled'), ['qty', 'discount', 'shipping', 'total'], 'Total (excl. cancelled)'),
      }];

    case 'products':
      return [{
        title: 'Products sold',
        columns: [col('name', 'Product', 'text', 34), col('code', 'Code', 'text', 12), col('category', 'Category', 'text', 16), col('orders', 'Orders', 'int'), col('items', 'Units', 'int'), col('revenue', 'Revenue', 'money', 15), col('share', 'Share', 'pct')],
        rows: share(r.topProducts),
        totals: totalsRow(r.topProducts, ['orders', 'items', 'revenue']),
      }];

    case 'categories':
      return [{
        title: 'Sales by category',
        columns: [col('key', 'Category', 'text', 26), col('items', 'Units', 'int'), col('revenue', 'Revenue', 'money', 15), col('share', 'Share', 'pct')],
        rows: share(r.byCategory),
        totals: totalsRow(r.byCategory, ['items', 'revenue']),
      }];

    case 'customers':
      return [{
        title: 'Top customers',
        columns: [col('name', 'Customer', 'text', 22), col('phone', 'Phone', 'text', 14), col('state', 'State', 'text', 16), col('orders', 'Orders', 'int'), col('items', 'Units', 'int'), col('revenue', 'Spent', 'money', 15), col('returning', 'Returning?', 'bool', 11)],
        rows: r.topCustomers || [],
      }];

    case 'regions':
      return [
        {
          title: 'Sales by state',
          columns: [col('key', 'State', 'text', 26), col('orders', 'Orders', 'int'), col('items', 'Units', 'int'), col('revenue', 'Revenue', 'money', 15), col('share', 'Share', 'pct')],
          rows: share(r.byState),
          totals: totalsRow(r.byState, ['orders', 'items', 'revenue']),
        },
        {
          title: 'Top districts',
          columns: [col('key', 'District', 'text', 30), col('orders', 'Orders', 'int'), col('items', 'Units', 'int'), col('revenue', 'Revenue', 'money', 15)],
          rows: r.byDistrict,
        },
      ];

    case 'payments':
      return [
        {
          title: 'Payment methods',
          columns: [col('key', 'Method', 'text', 24), col('orders', 'Orders', 'int'), col('revenue', 'Revenue', 'money', 15), col('share', 'Share', 'pct')],
          rows: share(r.byPayment),
          totals: totalsRow(r.byPayment, ['orders', 'revenue']),
        },
        {
          title: 'Order status',
          columns: [col('key', 'Status', 'text', 24), col('orders', 'Orders', 'int'), col('revenue', 'Value', 'money', 15)],
          rows: r.byStatus,
          totals: totalsRow(r.byStatus, ['orders', 'revenue']),
        },
      ];

    case 'timing':
      return [
        {
          title: 'Sales by weekday',
          columns: [col('key', 'Day', 'text', 12), col('orders', 'Orders', 'int'), col('revenue', 'Revenue', 'money', 15)],
          rows: r.byWeekday,
        },
        {
          title: 'Sales by hour of day',
          columns: [col('key', 'Hour', 'text', 12), col('orders', 'Orders', 'int'), col('revenue', 'Revenue', 'money', 15)],
          rows: r.byHour,
        },
      ];

    case 'coupons':
      return [{
        title: 'Coupons used',
        columns: [col('key', 'Coupon', 'text', 18), col('orders', 'Orders', 'int'), col('discount', 'Discount given', 'money', 15), col('revenue', 'Revenue', 'money', 15)],
        rows: r.byCoupon,
        totals: totalsRow(r.byCoupon, ['orders', 'discount', 'revenue']),
      }];

    case 'vendors':
      return r.meta.forVendor ? [] : [{
        title: 'Sales by store / vendor',
        columns: [col('key', 'Fulfilled by', 'text', 28), col('orders', 'Orders', 'int'), col('items', 'Units', 'int'), col('revenue', 'Revenue', 'money', 15), col('share', 'Share', 'pct')],
        rows: share(r.byVendor),
        totals: totalsRow(r.byVendor, ['orders', 'items', 'revenue']),
      }];

    case 'stock': {
      const vendorView = r.meta.forVendor || (r.stock[0] && 'variant' in r.stock[0]);
      return [{
        title: `Current stock (low = ${r.meta.lowStockThreshold} or fewer)`,
        columns: vendorView
          ? [col('product', 'Product', 'text', 34), col('code', 'Code', 'text', 12), col('category', 'Category', 'text', 16), col('variant', 'Variant', 'text', 16), col('stock', 'Stock', 'int'), col('active', 'Selling?', 'bool', 10), col('low', 'Low stock?', 'bool', 11)]
          : [col('product', 'Product', 'text', 34), col('code', 'Code', 'text', 12), col('category', 'Category', 'text', 16), col('mainStock', 'Main store', 'int', 11), col('vendorStock', 'Vendors', 'int', 11), col('stock', 'Total', 'int'), col('low', 'Low stock?', 'bool', 11)],
        rows: r.stock,
        totals: totalsRow(r.stock, vendorView ? ['stock'] : ['mainStock', 'vendorStock', 'stock']),
      }];
    }

    default:
      return [];
  }
}

// ── Plain-text formatting (CSV, PDF, screen) ───────────────

export const fmtMoney = (n, symbol = '₹') => `${symbol}${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtInt = (n) => (Number(n) || 0).toLocaleString('en-IN');
export const fmtPct = (n) => (n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${n}%`);

export function formatCell(value, type, row, { symbol = '₹' } = {}) {
  const t = type === 'auto' ? row?._type : type;
  if (t === 'change') return value === null ? 'new' : fmtPct(value);
  if (value === null || value === undefined || value === '') return '';
  if (t === 'money') return fmtMoney(value, symbol);
  if (t === 'int') return fmtInt(value);
  if (t === 'pct') return `${value}%`;
  if (t === 'bool') return value ? 'Yes' : 'No';
  return String(value);
}

export const reportFileName = (report, ext) => {
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const day = (ms) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);
  return `daivika-report_${slug(report.meta.scope)}_${day(report.meta.from)}_to_${day(report.meta.to)}.${ext}`;
};

// ── Period comparison tables ───────────────────────────────

// % change from a to b (null = new, nothing to compare against)
export const pctChange = (a, b) => {
  const x = Number(a) || 0, y = Number(b) || 0;
  if (!x) return y ? null : 0;
  return Math.round(((y - x) / x) * 1000) / 10;
};

const changeLabel = (periods) => (periods.length === 2
  ? `Change (${periods[1].label} vs ${periods[0].label})`
  : `Change (${periods[periods.length - 1].label} vs ${periods[0].label})`);

// One row per key (product, category, state…) with a value column per period
function pivot(periods, listOf, keyOf, valueOf, extra = () => ({}), limit = 100) {
  const rows = new Map();
  periods.forEach((p, i) => {
    for (const item of listOf(p) || []) {
      const k = keyOf(item);
      const row = rows.get(k) || { key: k, ...extra(item), _total: 0 };
      row[`p${i}`] = (row[`p${i}`] || 0) + (Number(valueOf(item)) || 0);
      row._total += Number(valueOf(item)) || 0;
      rows.set(k, row);
    }
  });
  const last = periods.length - 1;
  return [...rows.values()]
    .map(r => {
      periods.forEach((_, i) => { r[`p${i}`] = Math.round((r[`p${i}`] || 0) * 100) / 100; });
      return { ...r, total: Math.round(r._total * 100) / 100, change: pctChange(r.p0, r[`p${last}`]) };
    })
    .sort((a, b) => b._total - a._total)
    .slice(0, limit);
}

function pivotTable(r, title, firstCol, rows, type, extraCols = []) {
  const periods = r.periods;
  const keys = periods.map((_, i) => `p${i}`);
  const totals = { label: 'Total', values: {} };
  for (const k of [...keys, 'total']) totals.values[k] = Math.round(rows.reduce((s, x) => s + (Number(x[k]) || 0), 0) * 100) / 100;
  totals.values.change = pctChange(totals.values.p0, totals.values[`p${periods.length - 1}`]);
  return {
    title,
    columns: [firstCol, ...extraCols, ...periods.map((p, i) => col(`p${i}`, p.label, type, 14)), col('total', 'Total', type, 14), col('change', changeLabel(periods), 'change', 14)],
    rows,
    totals,
  };
}

function compareTablesFor(r, sectionId) {
  const periods = r.periods || [];
  const last = periods.length - 1;
  switch (sectionId) {
    case 'summary': {
      const keys = KPIS.filter(([k]) => periods.some(p => p.summary?.[k] !== undefined));
      return [{
        title: 'Key figures by period',
        columns: [col('label', 'Metric', 'text', 30), ...periods.map((p, i) => col(`p${i}`, p.label, 'auto', 16)), col('change', changeLabel(periods), 'change', 16)],
        rows: keys.map(([k, label, type]) => {
          const row = { label, _type: type };
          periods.forEach((p, i) => { row[`p${i}`] = p.summary?.[k] ?? 0; });
          row.change = pctChange(row.p0, row[`p${last}`]);
          return row;
        }),
      }];
    }
    case 'periods':
      return [{
        title: 'Period overview',
        columns: [col('period', 'Period', 'text', 18), col('range', 'Dates', 'text', 34), col('orders', 'Orders', 'int'), col('items', 'Items', 'int'), col('revenue', 'Revenue', 'money', 15), col('aov', 'Avg order', 'money', 13), col('customers', 'Customers', 'int'), col('cancelled', 'Cancelled', 'int'), col('change', 'Revenue vs previous', 'change', 14)],
        rows: periods.map((p, i) => ({
          period: p.label,
          range: `${p.fromLabel} – ${p.toLabel}`,
          orders: p.summary.orders,
          items: p.summary.itemsSold,
          revenue: p.summary.grossSales,
          aov: p.summary.avgOrderValue,
          customers: p.summary.customers,
          cancelled: p.summary.cancelledOrders,
          change: i === 0 ? undefined : pctChange(periods[i - 1].summary.grossSales, p.summary.grossSales),
        })),
      }];
    case 'products': {
      const extra = (x) => ({ name: x.name, code: x.code || '' });
      return [
        pivotTable(r, 'Revenue by product', col('name', 'Product', 'text', 30), pivot(periods, p => p.topProducts, x => x.key, x => x.revenue, extra), 'money', [col('code', 'Code', 'text', 10)]),
        pivotTable(r, 'Units sold by product', col('name', 'Product', 'text', 30), pivot(periods, p => p.topProducts, x => x.key, x => x.items, extra), 'int', [col('code', 'Code', 'text', 10)]),
      ];
    }
    case 'categories':
      return [pivotTable(r, 'Revenue by category', col('key', 'Category', 'text', 24), pivot(periods, p => p.byCategory, x => x.key, x => x.revenue), 'money')];
    case 'regions':
      return [pivotTable(r, 'Revenue by state', col('key', 'State', 'text', 24), pivot(periods, p => p.byState, x => x.key, x => x.revenue, () => ({}), 40), 'money')];
    case 'payments':
      return [
        pivotTable(r, 'Revenue by payment method', col('key', 'Method', 'text', 22), pivot(periods, p => p.byPayment, x => x.key, x => x.revenue), 'money'),
        pivotTable(r, 'Orders by status', col('key', 'Status', 'text', 18), pivot(periods, p => p.byStatus, x => x.key, x => x.orders), 'int'),
      ];
    case 'vendors':
      return r.meta.forVendor ? [] : [pivotTable(r, 'Revenue by store / vendor', col('key', 'Fulfilled by', 'text', 24), pivot(periods, p => p.byVendor, x => x.key, x => x.revenue), 'money')];
    default:
      return [];
  }
}
