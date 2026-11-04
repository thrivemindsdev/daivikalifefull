'use client';

import { numberToWords } from '@/lib/number-to-words';
import { orderNo } from '@/lib/orders-excel';

// Shipping / dispatch label, shared by the admin and vendor dashboards.
// One label is one 4 x 6 inch page (4 in wide, 6 in tall), the size thermal label printers use.
// Prepaid orders show no amount; COD orders show the amount to collect.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const isCodOrder = (order) => !!order?.isPartialCod || /cash on delivery/i.test(order?.paymentMethod || '');

export function shippingLabelHTML(order, settings = {}) {
  const codAmount = order.isPartialCod
    ? (order.remainingAmount || Math.max(0, (order.total || 0) - Math.round((order.total || 0) * 0.3)))
    : (order.total || 0);
  const paymentLine = isCodOrder(order)
    ? `COD - RS ( ${esc(codAmount)} ) - ${esc(numberToWords(codAmount))} Only`
    : 'PREPAID';

  const productsText = (order.itemsList && order.itemsList.length > 0)
    ? order.itemsList.map(item => `${item.name}${(item.isFreeGift || item.price === 0) ? ' [FREE GIFT]' : ''}${item.size ? ` (${item.size})` : ''}${item.color ? ` - ${item.color}` : ''}${(item.qty || item.quantity || 1) > 1 ? ` x ${item.qty || item.quantity}` : ''}`).join(', ')
    : (order.productName || 'Package');

  const customerId = settings.shippingCustomerId || '1283488482';
  const a = order.address || {};
  const box = 'border: 2px solid #000000; padding: 0.1in 0.12in; box-sizing: border-box; overflow: hidden;';

  return `
    <div class="shipping-label-card" style="box-sizing: border-box; width: 4in; height: 6in; overflow: hidden; margin: 0 auto; padding: 0.15in; display: flex; flex-direction: column; gap: 0.08in; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000; background: #ffffff; page-break-inside: avoid; page-break-after: always;">
      <div style="display: flex; justify-content: space-between; gap: 0.1in; font-size: 10.5px; font-weight: 900;">
        <span>CUSTOMER ID - ${esc(customerId)}</span>
        <span>ORDER NO: ${esc(orderNo(order))}</span>
      </div>

      <div style="font-size: ${isCodOrder(order) ? '12.5px' : '16px'}; font-weight: 900; border: 2px solid #000000; padding: 0.06in 0.1in; text-align: center; letter-spacing: ${isCodOrder(order) ? '0' : '2px'};">
        ${paymentLine}
      </div>

      <div style="${box} flex: 1.4; min-height: 0; display: flex; flex-direction: column;">
        <div style="font-size: 11px; font-weight: 900; margin-bottom: 3px;">To</div>
        <div style="font-size: 16px; font-weight: 900; margin-bottom: 5px;">${esc(order.user || 'Customer')}</div>
        <div style="font-size: 13px; line-height: 1.4; flex: 1; min-height: 0; overflow: hidden;">
          ${a.street ? `${esc(a.street)}<br />` : ''}
          ${esc(a.city)}${a.district && a.district !== a.city ? `, ${esc(a.district)}` : ''}<br />
          ${esc(a.state)}${a.pincode ? ` - <b style="font-size: 15px;">${esc(a.pincode)}</b>` : ''}
        </div>
        <div style="font-size: 13px; font-weight: 900; margin-top: 4px;">
          Contact No. ${esc(order.phone || 'N/A')}${order.alternatePhone ? `, ${esc(order.alternatePhone)}` : ''}
        </div>
      </div>

      <div style="${box} flex: 1; min-height: 0;">
        <div style="font-size: 11px; font-weight: 900; margin-bottom: 2px;">From</div>
        <div style="font-size: 12px; font-weight: 900; margin-bottom: 3px; text-transform: uppercase;">${esc(settings.companyName || 'Daivika')}</div>
        <div style="font-size: 10.5px; line-height: 1.35;">
          ${esc(settings.companyStreet || 'Kuriyedam,Ayikkarappadi')}<br />
          ${esc(settings.companyCity || 'malappuram')} ,${esc(settings.companyPin || '673633')}<br />
          ${settings.companyEmail ? `${esc(settings.companyEmail)}<br />` : ''}
          Mob : ${esc(settings.companyPhone || '7510717920')}
        </div>
      </div>

      <div style="font-size: 10px; font-weight: 700; line-height: 1.25; max-height: 0.55in; overflow: hidden;">
        Product: ${esc(productsText)}
      </div>
    </div>
  `;
}

// Opens the print window for one or more labels
export function printShippingLabels(orders, settings = {}) {
  const list = Array.isArray(orders) ? orders : [orders];
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const title = list.length === 1 ? `Shipping Label - ${esc(orderNo(list[0]))}` : `Bulk Shipping Labels (${list.length})`;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 4in 6in; margin: 0; }
          html, body { margin: 0; padding: 0; background-color: #ffffff; color: #000000; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .shipping-label-card:last-child { page-break-after: auto !important; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${list.map(o => shippingLabelHTML(o, settings)).join('')}
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}
