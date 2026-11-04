'use client';

import { numberToWords } from '@/lib/number-to-words';

// The number people see for an order. Orders from before order numbers existed show their old ID.
export const orderNo = (o) => o?.orderNumber || String(o?._id || o?.id || '').replace(/^ORD_/, '');

const COLUMNS = [
  ['Sl no', 8],
  ['Name', 26],
  ['Address line 1', 42],
  ['Address line 2', 22],
  ['City', 18],
  ['State', 18],
  ['Country', 12],
  ['Pincode', 10],
  ['Mobile number', 16],
  ['Order number', 18],
  ['Rate', 10],
  ['Rate in words', 52],
];

// The orders sheet in the format the team works with. Each order is one row and the rate is the order total.
export async function exportOrdersExcel(orders, fileName = 'orders') {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Orders');
  ws.columns = COLUMNS.map(([header, width]) => ({ header, width }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  orders.forEach((o, i) => {
    const a = o.address || {};
    const total = Number(o.total) || 0;
    ws.addRow([
      i + 1,
      o.user || '',
      a.street || '',
      a.district || '',
      a.city || '',
      a.state || '',
      a.country || 'India',
      String(a.pincode || ''),
      String(o.phone || ''),
      orderNo(o),
      total,
      `${numberToWords(total)} Only`,
    ]);
  });

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}-${new Date().toLocaleDateString('en-CA')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
