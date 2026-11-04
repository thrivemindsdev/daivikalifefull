// GST on the shop's invoice PDFs (profile and checkout pages): window.DaivikaGst.
// Selling prices include GST: taxable value = amount x 100 / (100 + rate), GST = amount - taxable value.
// A coupon discount is shared across the items by amount. Same state as the shop: CGST + SGST, else IGST.
// Same logic as lib/gst.js (used by the admin dashboard): keep the two in step.
(function () {
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const stateKey = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const inr = (n) => `INR ${r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const rateOf = (item) => {
    const v = item && item.gstRate;
    return v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
  };
  const isFree = (i) => i.isFreeGift || Number(i.price) === 0;

  function breakdown(order, settings) {
    settings = settings || {};
    const items = ((order && order.itemsList) || []).filter((i) => !isFree(i));
    const rows = items.map((i) => ({ rate: rateOf(i), amount: (Number(i.price) || 0) * (Number(i.qty || i.quantity) || 1) }));
    if (!rows.some((x) => x.rate !== null)) return null;
    const subtotal = rows.reduce((s, x) => s + x.amount, 0);
    const discount = Math.max(0, Number(order.discount) || 0);
    const factor = subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 1;
    const customerState = (order.address && order.address.state) || '';
    const interState = !!(stateKey(settings.companyState) && stateKey(customerState) && stateKey(settings.companyState) !== stateKey(customerState));
    const groups = new Map();
    let taxable = 0, tax = 0;
    rows.forEach(({ rate, amount }) => {
      if (rate === null) return;
      const value = amount * factor;
      const t = value * 100 / (100 + rate);
      const g = groups.get(rate) || { rate, taxable: 0, tax: 0 };
      g.taxable += t; g.tax += value - t;
      groups.set(rate, g);
      taxable += t; tax += value - t;
    });
    return {
      rows: [...groups.values()].sort((a, b) => a.rate - b.rate).map((g) => ({ rate: g.rate, taxable: r2(g.taxable), tax: r2(g.tax) })),
      interState, taxable: r2(taxable), tax: r2(tax), placeOfSupply: customerState,
    };
  }

  // "HSN 7117 | GST 3%" for an item line
  function itemNote(item) {
    const parts = [];
    if (item.hsnCode) parts.push(`HSN ${item.hsnCode}`);
    if (rateOf(item) !== null && !isFree(item)) parts.push(`GST ${rateOf(item)}%`);
    return parts.join(' | ');
  }

  // Adds the GST table below the totals; returns the next free y
  function addToPdf(doc, order, settings, y) {
    const b = breakdown(order, settings);
    if (!b) return y;
    const head = b.interState ? [['GST Rate', 'Taxable Value', 'IGST', 'Total GST']] : [['GST Rate', 'Taxable Value', 'CGST', 'SGST', 'Total GST']];
    const body = b.rows.map((r) => (b.interState
      ? [`${r.rate}%`, inr(r.taxable), `${inr(r.tax)} (${r.rate}%)`, inr(r.tax)]
      : [`${r.rate}%`, inr(r.taxable), `${inr(r.tax / 2)} (${r.rate / 2}%)`, `${inr(r.tax / 2)} (${r.rate / 2}%)`, inr(r.tax)]));
    body.push(b.interState ? ['Total', inr(b.taxable), inr(b.tax), inr(b.tax)] : ['Total', inr(b.taxable), inr(b.tax / 2), inr(b.tax / 2), inr(b.tax)]);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
    doc.text(`GST Summary (prices include GST)${b.placeOfSupply ? ` - Place of Supply: ${b.placeOfSupply}` : ''}`, 20, y);
    doc.setFont('helvetica', 'normal');
    const opts = { startY: y + 3, head, body, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [10, 10, 10] }, margin: { left: 20, right: 20 } };
    if (window.jspdfAutoTable && window.jspdfAutoTable.autoTable) window.jspdfAutoTable.autoTable(doc, opts); else doc.autoTable(opts);
    return doc.lastAutoTable.finalY + 8;
  }

  window.DaivikaGst = { breakdown, itemNote, addToPdf };
})();
