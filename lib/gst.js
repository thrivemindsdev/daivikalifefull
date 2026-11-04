'use client';

// GST on invoices. Selling prices include GST, so the GST is split out of each item's amount:
//   taxable value = amount x 100 / (100 + rate),  GST = amount - taxable value
// A coupon discount is shared across the items in proportion to their amount. Same state as the shop:
// CGST + SGST (half each); another state: IGST. Shipping is shown as charged, outside the GST split.
// Same logic as backend/public/js/gst.js (used by the shop's invoice PDFs): keep the two in step.

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const stateKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `₹${r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// The rate saved on the order item, else (older orders) the product's current rate
export function itemGstRate(item, rateFor) {
  const saved = item?.gstRate;
  if (saved !== null && saved !== undefined && saved !== '' && !Number.isNaN(Number(saved))) return Number(saved);
  const fallback = rateFor ? rateFor(item) : null;
  return fallback !== null && fallback !== undefined && fallback !== '' && !Number.isNaN(Number(fallback)) ? Number(fallback) : null;
}

// null when no item has a GST rate
export function gstBreakdown(order, settings = {}, rateFor = null) {
  const items = (order?.itemsList || []).filter(i => !(i.isFreeGift || Number(i.price) === 0));
  const withRate = items.map(i => ({ item: i, rate: itemGstRate(i, rateFor), amount: (Number(i.price) || 0) * (Number(i.qty || i.quantity) || 1) }));
  if (!withRate.some(x => x.rate !== null)) return null;
  const subtotal = withRate.reduce((s, x) => s + x.amount, 0);
  const discount = Math.max(0, Number(order?.discount) || 0);
  const factor = subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 1;
  const companyState = settings.companyState || '';
  const customerState = order?.address?.state || '';
  const interState = !!(stateKey(companyState) && stateKey(customerState) && stateKey(companyState) !== stateKey(customerState));

  const groups = new Map();
  let taxable = 0, tax = 0;
  withRate.forEach(({ rate, amount }) => {
    if (rate === null) return;
    const value = amount * factor;
    const t = value * 100 / (100 + rate);
    const g = groups.get(rate) || { rate, taxable: 0, tax: 0 };
    g.taxable += t; g.tax += value - t;
    groups.set(rate, g);
    taxable += t; tax += value - t;
  });
  const rows = [...groups.values()].sort((a, b) => a.rate - b.rate).map(g => ({
    rate: g.rate, taxable: r2(g.taxable), tax: r2(g.tax),
    cgst: interState ? 0 : r2(g.tax / 2), sgst: interState ? 0 : r2(g.tax / 2), igst: interState ? r2(g.tax) : 0,
  }));
  return { rows, interState, taxable: r2(taxable), tax: r2(tax), placeOfSupply: customerState, gstin: settings.companyGstin || '' };
}

// Small line under an item's name: "HSN 7117 · GST 3%"
export function gstItemNote(item, rateFor = null) {
  const rate = itemGstRate(item, rateFor);
  const parts = [];
  if (item?.hsnCode) parts.push(`HSN ${esc(item.hsnCode)}`);
  if (rate !== null && !(item.isFreeGift || Number(item.price) === 0)) parts.push(`GST ${rate}%`);
  return parts.join(' · ');
}

// The GST table for the printed invoices
export function gstSummaryHTML(b) {
  if (!b) return '';
  const th = 'padding: 0.4rem 0.5rem; text-align: right; font-weight: 800; color: #4b5563; text-transform: uppercase; font-size: 0.6rem; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;';
  const td = 'padding: 0.4rem 0.5rem; text-align: right; color: #374151; border-bottom: 1px solid #f3f4f6;';
  const head = b.interState
    ? `<th style="${th} text-align: left;">GST Rate</th><th style="${th}">Taxable Value</th><th style="${th}">IGST</th><th style="${th}">Total GST</th>`
    : `<th style="${th} text-align: left;">GST Rate</th><th style="${th}">Taxable Value</th><th style="${th}">CGST</th><th style="${th}">SGST</th><th style="${th}">Total GST</th>`;
  const rows = b.rows.map(r => b.interState
    ? `<tr><td style="${td} text-align: left;">${r.rate}%</td><td style="${td}">${money(r.taxable)}</td><td style="${td}">${money(r.igst)} (${r.rate}%)</td><td style="${td} font-weight: 700;">${money(r.tax)}</td></tr>`
    : `<tr><td style="${td} text-align: left;">${r.rate}%</td><td style="${td}">${money(r.taxable)}</td><td style="${td}">${money(r.cgst)} (${r.rate / 2}%)</td><td style="${td}">${money(r.sgst)} (${r.rate / 2}%)</td><td style="${td} font-weight: 700;">${money(r.tax)}</td></tr>`).join('');
  const total = b.interState
    ? `<tr><td style="${td} text-align: left; font-weight: 800;">Total</td><td style="${td} font-weight: 800;">${money(b.taxable)}</td><td style="${td} font-weight: 800;">${money(b.tax)}</td><td style="${td} font-weight: 800;">${money(b.tax)}</td></tr>`
    : `<tr><td style="${td} text-align: left; font-weight: 800;">Total</td><td style="${td} font-weight: 800;">${money(b.taxable)}</td><td style="${td} font-weight: 800;">${money(b.tax / 2)}</td><td style="${td} font-weight: 800;">${money(b.tax / 2)}</td><td style="${td} font-weight: 800;">${money(b.tax)}</td></tr>`;
  return `
    <div style="margin-top: 1.25rem; font-size: 0.72rem;">
      <div style="font-size: 0.65rem; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.35rem;">GST Summary (prices include GST)${b.placeOfSupply ? ` · Place of Supply: ${esc(b.placeOfSupply)}` : ''}</div>
      <table style="width: 100%; border-collapse: collapse;"><thead><tr>${head}</tr></thead><tbody>${rows}${total}</tbody></table>
    </div>`;
}
