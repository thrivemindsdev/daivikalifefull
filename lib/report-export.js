'use client';

// Browser-side report exporters (Excel, PDF, CSV) styled with the Daivika brand colours.
// The heavy libraries are loaded only when an export is requested.
import { tablesFor, sectionsFor, kpisFor, groupLabel, formatCell, reportFileName, fmtMoney, fmtPct, isComparison } from '@/lib/report-tables';

const BRAND = {
  wine: '360910',
  wineSoft: '5C1520',
  gold: 'C5831A',
  goldLight: 'F3E3C3',
  cream: 'FDF8F0',
  border: 'EAD9C0',
  text: '1F1410',
  muted: '7A6A5C',
  green: '15803D',
  red: 'B91C1C',
};
const rgb = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function loadImage(src) {
  try {
    const blob = await (await fetch(src)).blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const size = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 897, h: 335 });
      img.src = dataUrl;
    });
    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

const periodText = (m) => `${m.fromLabel}  to  ${m.toLabel}`;
const activeSections = (report, selected) => sectionsFor(report).filter(s => !selected || selected.includes(s.id)).map(s => s.id);

// ── Excel ──────────────────────────────────────────────────

const XL_FMT = {
  money: '"₹"#,##0.00',
  int: '#,##0',
  pct: '0.0"%"',
  change: '+0.0"%";-0.0"%";0"%"',
};

function xlValue(value, type) {
  if (type === 'bool') return value ? 'Yes' : 'No';
  if (type === 'change' && value === null) return 'new';
  if (type === 'change' && value === undefined) return '—';
  return value ?? '';
}

export async function exportExcel(report, selected) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const m = report.meta;
  wb.creator = m.company?.name || 'Daivika';
  wb.created = new Date();
  const logo = await loadImage('/logo.png');
  const logoId = logo ? wb.addImage({ base64: logo.dataUrl, extension: 'png' }) : null;

  const fill = (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } });
  const font = (hex, extra = {}) => ({ name: 'Calibri', color: { argb: `FF${hex}` }, ...extra });
  const thin = { style: 'thin', color: { argb: `FF${BRAND.border}` } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Brand band across the top of a sheet; returns the next free row
  const banner = (ws, width, title) => {
    const last = Math.max(width, 4);
    ws.mergeCells(1, 1, 1, last);
    ws.getRow(1).height = 52;
    const c = ws.getCell(1, 1);
    c.value = title;
    c.fill = fill(BRAND.wine);
    c.font = font('FFFFFF', { size: 16, bold: true });
    c.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    if (logoId !== null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.12 }, ext: { width: 120, height: 120 * (logo.h / logo.w) } });

    ws.mergeCells(2, 1, 2, last);
    ws.getRow(2).height = 4;
    ws.getCell(2, 1).fill = fill(BRAND.gold);

    ws.mergeCells(3, 1, 3, last);
    const sub = ws.getCell(3, 1);
    sub.value = `${m.scope}  ·  ${periodText(m)}  ·  ${groupLabel(m.groupBy)}  ·  Generated ${m.generatedLabel}`;
    sub.font = font(BRAND.muted, { size: 9, italic: true });
    sub.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    return 5;
  };

  const writeTable = (ws, startRow, table, withFilter) => {
    const { columns, rows, totals } = table;
    let r = startRow;
    ws.mergeCells(r, 1, r, columns.length);
    const t = ws.getCell(r, 1);
    t.value = table.title.toUpperCase();
    t.font = font(BRAND.gold, { size: 10, bold: true });
    r++;

    const head = ws.getRow(r);
    columns.forEach((c, i) => {
      const cell = head.getCell(i + 1);
      cell.value = c.label;
      cell.fill = fill(BRAND.wine);
      cell.font = font('FFFFFF', { bold: true, size: 10 });
      cell.alignment = { vertical: 'middle', horizontal: ['text', 'bool'].includes(c.type) ? 'left' : 'right', wrapText: true };
      cell.border = border;
    });
    head.height = 22;
    const headerRow = r;
    r++;

    if (!rows.length) {
      ws.mergeCells(r, 1, r, columns.length);
      const e = ws.getCell(r, 1);
      e.value = 'No data in this period';
      e.font = font(BRAND.muted, { italic: true, size: 10 });
      return r + 2;
    }

    rows.forEach((row, idx) => {
      const xr = ws.getRow(r);
      columns.forEach((c, i) => {
        const type = c.type === 'auto' ? row._type : c.type;
        const cell = xr.getCell(i + 1);
        cell.value = xlValue(row[c.key], type);
        if (XL_FMT[type] && typeof cell.value === 'number') cell.numFmt = XL_FMT[type];
        cell.font = font(type === 'change' ? (row[c.key] > 0 ? BRAND.green : row[c.key] < 0 ? BRAND.red : BRAND.text) : BRAND.text, { size: 10, bold: i === 0 && c.key === 'label' });
        cell.alignment = { vertical: 'top', horizontal: ['text', 'bool'].includes(type) ? 'left' : 'right', wrapText: c.key === 'items' };
        cell.border = border;
        if (idx % 2) cell.fill = fill(BRAND.cream);
        if (row.low === true && c.key === 'stock') cell.font = font(BRAND.red, { size: 10, bold: true });
      });
      r++;
    });

    if (totals) {
      const xr = ws.getRow(r);
      columns.forEach((c, i) => {
        const cell = xr.getCell(i + 1);
        const v = totals.values[c.key];
        cell.value = i === 0 ? totals.label : v ?? '';
        if (XL_FMT[c.type] && typeof cell.value === 'number') cell.numFmt = XL_FMT[c.type];
        cell.fill = fill(BRAND.goldLight);
        cell.font = font(BRAND.wine, { bold: true, size: 10 });
        cell.alignment = { horizontal: i === 0 ? 'left' : 'right' };
        cell.border = { ...border, top: { style: 'medium', color: { argb: `FF${BRAND.gold}` } } };
      });
      r++;
    }

    if (withFilter) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns.length } };
    return r + 2;
  };

  for (const id of activeSections(report, selected)) {
    const tables = tablesFor(report, id);
    if (!tables.length) continue;
    const label = sectionsFor(report).find(s => s.id === id).label;
    const ws = wb.addWorksheet(label.replace(/[\\/*?:[\]]/g, '-').slice(0, 31), {
      properties: { tabColor: { argb: `FF${id === 'summary' ? BRAND.gold : BRAND.wine}` } },
      pageSetup: { orientation: id === 'orders' ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
      views: [{ showGridLines: false }],
    });
    const width = Math.max(...tables.map(t => t.columns.length));
    let row = banner(ws, width, id === 'summary' ? 'SALES & ANALYTICS REPORT' : label.toUpperCase());

    if (id === 'summary') {
      const info = [
        ['Store', m.company?.name || 'Daivika'],
        ['Report for', m.scope],
        ['From', m.fromLabel],
        ['To', m.toLabel],
        ['Grouped', groupLabel(m.groupBy)],
        ['Generated', m.generatedLabel],
      ];
      if (m.company?.address) info.splice(1, 0, ['Address', m.company.address]);
      for (const [k, v] of info) {
        ws.getCell(row, 1).value = k;
        ws.getCell(row, 1).font = font(BRAND.muted, { size: 10 });
        ws.mergeCells(row, 2, row, width);
        ws.getCell(row, 2).value = v;
        ws.getCell(row, 2).font = font(BRAND.text, { size: 10, bold: true });
        row++;
      }
      row++;
    }

    tables.forEach((table, i) => { row = writeTable(ws, row, table, id !== 'summary' && i === 0); });

    tables[0].columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || (c.type === 'text' ? 18 : 12); });
    if (id !== 'summary') ws.views = [{ state: 'frozen', ySplit: 6, showGridLines: false }];
  }

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), reportFileName(report, 'xlsx'));
}

// ── PDF ────────────────────────────────────────────────────

// The built-in PDF fonts cover Latin-1 only
const pdfText = (s) => String(s ?? '')
  .replace(/₹/g, 'Rs.')
  .replace(/×/g, 'x')
  .replace(/[–—]/g, '-')
  .replace(/→/g, 'to')
  .replace(/·/g, '|')
  .replace(/[^\x20-\x7E]/g, '')
  .replace(/\(\s*\)/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const pdfCell = (value, type, row) => pdfText(formatCell(value, type, row, { symbol: 'Rs. ' }));

const PDF_TILES = ['grossSales', 'orders', 'itemsSold', 'avgOrderValue', 'customers', 'discounts', 'codSales', 'cancelledOrders'];

export async function exportPdf(report, selected) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const m = report.meta;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const X = 14;
  const CW = W - X * 2;
  const sections = activeSections(report, selected);
  const logo = await loadImage('/logo-light.png');

  // Page 1 header
  doc.setFillColor(...rgb(BRAND.wine));
  doc.rect(0, 0, W, 34, 'F');
  doc.setFillColor(...rgb(BRAND.gold));
  doc.rect(0, 34, W, 1.2, 'F');
  if (logo) doc.addImage(logo.dataUrl, 'PNG', X, 7, 20 * (logo.w / logo.h), 20, 'logo', 'FAST');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('SALES & ANALYTICS REPORT', W - X, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...rgb(BRAND.goldLight));
  doc.text(pdfText(m.scope), W - X, 21, { align: 'right' });
  doc.text(pdfText(`${periodText(m)}  |  ${groupLabel(m.groupBy)}`), W - X, 27, { align: 'right' });

  let y = 42;
  doc.setTextColor(...rgb(BRAND.muted));
  doc.setFontSize(8.5);
  const companyLine = [m.company?.name, m.company?.address, m.company?.phone, m.company?.email].filter(Boolean).map(pdfText).join('  |  ');
  // Long addresses wrap instead of running into the date on the right
  const companyLines = doc.splitTextToSize(companyLine, CW - 62);
  doc.text(companyLines, X, y);
  doc.text(`Generated ${pdfText(m.generatedLabel)}`, W - X, y, { align: 'right' });
  y += 4 * companyLines.length + 2;

  // KPI tiles
  if (sections.includes('summary') && !isComparison(report)) {
    const tiles = PDF_TILES.filter(k => report.summary[k] !== undefined).map(k => kpisFor(report).find(([key]) => key === k)).filter(Boolean);
    const perRow = 4, gap = 5, tw = (CW - gap * (perRow - 1)) / perRow, th = 21;
    tiles.forEach(([key, label, type], i) => {
      const tx = X + (i % perRow) * (tw + gap);
      const ty = y + Math.floor(i / perRow) * (th + gap);
      doc.setFillColor(...rgb(BRAND.cream));
      doc.setDrawColor(...rgb(BRAND.border));
      doc.roundedRect(tx, ty, tw, th, 2, 2, 'FD');
      doc.setFillColor(...rgb(BRAND.gold));
      doc.rect(tx, ty + 2, 1.2, th - 4, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...rgb(BRAND.muted));
      doc.setFont('helvetica', 'normal');
      doc.text(label.toUpperCase(), tx + 5, ty + 6);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...rgb(BRAND.wine));
      doc.text(pdfCell(report.summary[key], type), tx + 5, ty + 13.5);
      const ch = report.change?.[key];
      if (ch !== undefined) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        const good = key === 'cancelledOrders' || key === 'discounts' ? ch < 0 : ch > 0;
        doc.setTextColor(...rgb(ch === 0 || ch === null ? BRAND.muted : good ? BRAND.green : BRAND.red));
        doc.text(`${ch === null ? 'new' : fmtPct(ch)} vs previous period`, tx + 5, ty + 18);
      }
    });
    y += Math.ceil(tiles.length / perRow) * (th + gap) + 2;
  }

  // Revenue trend bar chart
  if ((sections.includes('trend') || (isComparison(report) && sections.includes('periods'))) && report.series.length) {
    const s = report.series;
    const ch = 48, top = y + 8;
    if (top + ch + 10 > H - 16) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...rgb(BRAND.gold));
    doc.text(`${groupLabel(m.groupBy).toUpperCase()} REVENUE`, X, y + 4);
    const cy = y + 8;
    const max = Math.max(...s.map(p => p.revenue), 1);
    const plotX = X + 22, plotW = CW - 22;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    for (let g = 0; g <= 4; g++) {
      const gy = cy + ch - (ch * g) / 4;
      doc.setDrawColor(...rgb(BRAND.border));
      doc.setLineWidth(0.2);
      doc.line(plotX, gy, plotX + plotW, gy);
      doc.setTextColor(...rgb(BRAND.muted));
      doc.text(pdfText(fmtMoney((max * g) / 4, 'Rs.').replace(/\.\d+$/, '')), plotX - 2, gy + 1, { align: 'right' });
    }
    const slot = plotW / s.length;
    const bw = Math.max(Math.min(slot * 0.7, 14), 0.4);
    const every = Math.ceil(s.length / 14);
    s.forEach((p, i) => {
      const bh = (p.revenue / max) * ch;
      const bx = plotX + i * slot + (slot - bw) / 2;
      if (bh > 0) {
        doc.setFillColor(...rgb(BRAND.wineSoft));
        doc.rect(bx, cy + ch - bh, bw, bh, 'F');
      }
      if (i % every === 0) {
        doc.setTextColor(...rgb(BRAND.muted));
        doc.text(pdfText(p.period.replace(/^Week of /, '')), plotX + i * slot + slot / 2, cy + ch + 4, { align: 'center' });
      }
    });
    y = cy + ch + 10;
  }

  // Tables
  const tableOpts = {
    theme: 'grid',
    margin: { left: X, right: X, top: 20, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: rgb(BRAND.text), lineColor: rgb(BRAND.border), lineWidth: 0.15, overflow: 'linebreak' },
    headStyles: { fillColor: rgb(BRAND.wine), textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: rgb(BRAND.cream) },
    footStyles: { fillColor: rgb(BRAND.goldLight), textColor: rgb(BRAND.wine), fontStyle: 'bold' },
    showFoot: 'lastPage',
  };

  for (const id of sections) {
    for (const table of tablesFor(report, id)) {
      if (y > H - 45) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...rgb(BRAND.gold));
      doc.text(pdfText(table.title.toUpperCase()), X, y + 4);
      const numeric = (c) => !['text', 'bool'].includes(c.type);
      const columnStyles = {};
      table.columns.forEach((c, i) => { if (numeric(c)) columnStyles[i] = { halign: 'right' }; });
      const body = table.rows.length
        ? table.rows.map(row => table.columns.map(c => pdfCell(row[c.key], c.type, row)))
        : [[{ content: 'No data in this period', colSpan: table.columns.length, styles: { halign: 'center', textColor: rgb(BRAND.muted), fontStyle: 'italic' } }]];
      autoTable(doc, {
        ...tableOpts,
        startY: y + 6,
        head: [table.columns.map(c => ({ content: c.label, styles: { halign: numeric(c) ? 'right' : 'left' } }))],
        body,
        foot: table.totals && table.rows.length ? [table.columns.map((c, i) => (i === 0 ? pdfText(table.totals.label) : { content: pdfCell(table.totals.values[c.key], c.type), styles: { halign: numeric(c) ? 'right' : 'left' } }))] : undefined,
        columnStyles: id === 'orders' ? { ...columnStyles, 7: { cellWidth: 52 } } : columnStyles,
        styles: { ...tableOpts.styles, fontSize: id === 'orders' ? 6.8 : 8 },
        didParseCell: (d) => {
          if (d.section !== 'body') return;
          const row = table.rows[d.row.index];
          const c = table.columns[d.column.index];
          if (!row || !c) return;
          if (c.type === 'change' && row.change) d.cell.styles.textColor = rgb(row.change > 0 ? BRAND.green : BRAND.red);
          if (c.key === 'stock' && row.low) { d.cell.styles.textColor = rgb(BRAND.red); d.cell.styles.fontStyle = 'bold'; }
          if (c.key === 'status' && row.status === 'Cancelled') d.cell.styles.textColor = rgb(BRAND.red);
        },
      });
      y = doc.lastAutoTable.finalY + 9;
    }
  }

  // Running header and footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFillColor(...rgb(BRAND.wine));
      doc.rect(0, 0, W, 11, 'F');
      doc.setFillColor(...rgb(BRAND.gold));
      doc.rect(0, 11, W, 0.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(pdfText(`${m.company?.name || 'Daivika'}  |  Sales & Analytics Report`), X, 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...rgb(BRAND.goldLight));
      doc.text(pdfText(`${m.scope}  |  ${periodText(m)}`), W - X, 7, { align: 'right' });
    }
    doc.setDrawColor(...rgb(BRAND.gold));
    doc.setLineWidth(0.4);
    doc.line(X, H - 10, W - X, H - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...rgb(BRAND.muted));
    doc.text('Live data from the Daivika store. Amounts in Indian Rupees (Rs.). Times in IST.', X, H - 6);
    doc.text(`Page ${i} of ${pages}`, W - X, H - 6, { align: 'right' });
  }

  doc.save(reportFileName(report, 'pdf'));
}

// ── CSV ────────────────────────────────────────────────────

const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(report, selected) {
  const m = report.meta;
  const lines = [
    ['Daivika Sales & Analytics Report'],
    ['Report for', m.scope],
    ['From', m.fromLabel],
    ['To', m.toLabel],
    ['Grouped', groupLabel(m.groupBy)],
    ['Generated', m.generatedLabel],
    [],
  ];
  for (const id of activeSections(report, selected)) {
    for (const table of tablesFor(report, id)) {
      lines.push([table.title.toUpperCase()]);
      lines.push(table.columns.map(c => c.label));
      for (const row of table.rows) {
        lines.push(table.columns.map(c => {
          const type = c.type === 'auto' ? row._type : c.type;
          const v = row[c.key];
          if (type === 'bool') return v ? 'Yes' : 'No';
          if (type === 'change') return v === null ? 'new' : v === undefined ? '' : v;
          return v ?? '';
        }));
      }
      if (table.totals && table.rows.length) lines.push(table.columns.map((c, i) => (i === 0 ? table.totals.label : table.totals.values[c.key] ?? '')));
      lines.push([]);
    }
  }
  const csv = '﻿' + lines.map(l => l.map(csvEscape).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), reportFileName(report, 'csv'));
}

export const EXPORTERS = { xlsx: exportExcel, pdf: exportPdf, csv: exportCsv };
