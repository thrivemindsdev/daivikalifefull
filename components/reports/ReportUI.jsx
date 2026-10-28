'use client';

// Shared building blocks for the report screens (live analytics, comparisons, submitted reports)
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, FileDown, Search, TrendingUp, TrendingDown, Minus, Settings2 } from 'lucide-react';
import { colors, inputStyle, Button, Card as BaseCard } from '@/components/vendor/VendorUI';
import { sectionsFor, formatCell, fmtMoney, fmtInt, fmtPct } from '@/lib/report-tables';

export const HEADING = '"Outfit", "Poppins", sans-serif';

// Rounded, softly lifted panels matching the admin overview
export const Card = ({ children, style }) => (
  <BaseCard style={{ borderRadius: 18, borderColor: '#ecdfcc', boxShadow: '0 1px 2px rgba(54,9,16,0.04), 0 10px 30px -18px rgba(54,9,16,0.25)', padding: '1.15rem', ...style }}>
    {children}
  </BaseCard>
);

export function Legend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.9rem', marginTop: '0.5rem' }}>
      {items.map(({ label, color, value }) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: colors.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
          {label} <b style={{ color: colors.text }}>{value}</b>
        </span>
      ))}
    </div>
  );
}

export const PALETTE = [colors.wine, colors.gold, '#9f2d3f', '#d9a85b', '#6b4226', '#e8c98f', '#7a6a5c', '#c2410c'];
export const STATUS_COLORS = { Delivered: colors.green, Cancelled: colors.red, Shipped: '#1e40af', Packed: '#5b21b6', Processing: colors.gold, Assigned: colors.gold, Accepted: '#075985' };

// ── Date ranges (browser local time) ───────────────────────

export const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const eod = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const monday = (d) => addDays(sod(d), -((d.getDay() + 6) % 7));

export const PRESETS = [
  { id: 'today', label: 'Today', live: true, range: (n) => [sod(n), n] },
  { id: 'yesterday', label: 'Yesterday', range: (n) => [sod(addDays(n, -1)), eod(addDays(n, -1))] },
  { id: 'this_week', label: 'This week', live: true, range: (n) => [monday(n), n] },
  { id: 'last_week', label: 'Last week', range: (n) => [addDays(monday(n), -7), eod(addDays(monday(n), -1))] },
  { id: 'last7', label: 'Last 7 days', live: true, range: (n) => [sod(addDays(n, -6)), n] },
  { id: 'this_month', label: 'This month', live: true, range: (n) => [new Date(n.getFullYear(), n.getMonth(), 1), n] },
  { id: 'last_month', label: 'Last month', range: (n) => [new Date(n.getFullYear(), n.getMonth() - 1, 1), eod(new Date(n.getFullYear(), n.getMonth(), 0))] },
  { id: 'last30', label: 'Last 30 days', live: true, range: (n) => [sod(addDays(n, -29)), n] },
  { id: 'last90', label: 'Last 90 days', live: true, range: (n) => [sod(addDays(n, -89)), n] },
  { id: 'this_year', label: 'This year', live: true, range: (n) => [new Date(n.getFullYear(), 0, 1), n] },
  { id: 'last_year', label: 'Last year', range: (n) => [new Date(n.getFullYear() - 1, 0, 1), eod(new Date(n.getFullYear() - 1, 11, 31))] },
  { id: 'all', label: 'All time', live: true, range: (n) => [new Date(2020, 0, 1), n] },
  { id: 'custom', label: 'Custom' },
];

export const GROUPS = [['auto', 'Auto'], ['hour', 'Hourly'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']];

export const pad = (n) => String(n).padStart(2, '0');
export const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function resolveRange(preset, custom) {
  if (preset === 'custom') return [new Date(custom.from), new Date(custom.to)];
  return PRESETS.find(p => p.id === preset).range(new Date());
}

// ── Small pieces ───────────────────────────────────────────

export const chip = (active) => ({
  padding: '0.42rem 0.85rem', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
  background: active ? `linear-gradient(135deg, ${colors.wine}, ${colors.wineSoft})` : '#fff',
  color: active ? '#fde68a' : colors.muted,
  border: `1px solid ${active ? colors.wine : colors.border}`,
  boxShadow: active ? '0 6px 14px -8px rgba(54,9,16,0.7)' : 'none',
});

export const SectionTitle = ({ children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
    <div style={{ fontFamily: HEADING, fontWeight: 700, fontSize: '1rem', color: colors.text }}>{children}</div>
    {right}
  </div>
);

export function ChangeBadge({ value, invert, light }) {
  if (value === undefined) return null;
  if (value === null) return <span style={{ fontSize: '0.7rem', color: colors.muted, fontWeight: 700 }}>new</span>;
  const good = invert ? value < 0 : value > 0;
  const tone = value === 0 ? (light ? '#fde68a' : colors.muted) : good ? (light ? '#86efac' : colors.green) : (light ? '#fca5a5' : colors.red);
  const Icon = value === 0 ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 800, color: tone }}>
      <Icon size={12} /> {fmtPct(value)}
    </span>
  );
}

export const moneyShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

export const tooltipStyle = { borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 12 };

export function ChartCard({ title, children, height = 220, footer }) {
  return (
    <Card style={{ minWidth: 0 }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ width: '100%', height }}>{children}</div>
      {footer}
    </Card>
  );
}

export function DataTable({ table }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(25);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return table.rows;
    return table.rows.filter(r => table.columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(q)));
  }, [table, query]);
  const numeric = (c) => !['text', 'bool'].includes(c.type);

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <SectionTitle right={table.rows.length > 10 && (
        <div style={{ position: 'relative', width: 220, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: 10, color: colors.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." style={{ ...inputStyle, padding: '0.45rem 0.7rem 0.45rem 1.9rem' }} />
        </div>
      )}>
        {table.title} <span style={{ color: colors.muted, fontWeight: 600, fontSize: '0.78rem' }}>({fmtInt(table.rows.length)})</span>
      </SectionTitle>
      <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {table.columns.map(c => (
                <th key={c.key} style={{ background: colors.wine, color: '#fff', padding: '0.55rem 0.65rem', textAlign: numeric(c) ? 'right' : 'left', whiteSpace: 'nowrap', fontWeight: 700 }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={table.columns.length} style={{ padding: '1.25rem', textAlign: 'center', color: colors.muted }}>No data in this period</td></tr>
            ) : rows.slice(0, limit).map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? colors.cream : '#fff' }}>
                {table.columns.map(c => {
                  const type = c.type === 'auto' ? r._type : c.type;
                  let color = colors.text;
                  if (type === 'change' && r[c.key]) color = r[c.key] > 0 ? colors.green : colors.red;
                  if ((c.key === 'stock' && r.low) || (c.key === 'status' && r.status === 'Cancelled')) color = colors.red;
                  return (
                    <td key={c.key} style={{ padding: '0.5rem 0.65rem', borderTop: `1px solid ${colors.border}`, textAlign: numeric(c) ? 'right' : 'left', color, fontWeight: c.key === 'stock' && r.low ? 800 : 500, whiteSpace: c.key === 'items' ? 'normal' : 'nowrap', minWidth: c.key === 'items' ? 240 : undefined }}>
                      {formatCell(r[c.key], c.type, r)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {table.totals && rows.length > 0 && !query && (
            <tfoot>
              <tr>
                {table.columns.map((c, i) => (
                  <td key={c.key} style={{ background: '#f3e3c3', color: colors.wine, fontWeight: 800, padding: '0.55rem 0.65rem', borderTop: `2px solid ${colors.gold}`, textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap' }}>
                    {i === 0 ? table.totals.label : formatCell(table.totals.values[c.key], c.type)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {rows.length > limit && (
        <div style={{ textAlign: 'center', marginTop: '0.6rem' }}>
          <Button size="sm" variant="outline" onClick={() => setLimit(l => l + 50)}>Show more ({fmtInt(rows.length - limit)} left)</Button>
        </div>
      )}
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────

export function ExportBar({ report }) {
  const all = sectionsFor(report);
  const [selected, setSelected] = useState(() => all.map(s => s.id));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (fmt) => {
    if (!selected.length) return setError('Pick at least one section to export');
    setBusy(fmt); setError('');
    try {
      const { EXPORTERS } = await import('@/lib/report-export');
      await EXPORTERS[fmt](report, selected);
    } catch (err) {
      console.error('[reports] export failed', err);
      setError(`Export failed: ${err.message}`);
    } finally {
      setBusy('');
    }
  };
  const toggle = (id) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" loading={busy === 'xlsx'} disabled={!!busy} onClick={() => run('xlsx')}>{busy !== 'xlsx' && <FileSpreadsheet size={14} />} Excel</Button>
        <Button size="sm" variant="gold" loading={busy === 'pdf'} disabled={!!busy} onClick={() => run('pdf')}>{busy !== 'pdf' && <FileText size={14} />} PDF</Button>
        <Button size="sm" variant="outline" loading={busy === 'csv'} disabled={!!busy} onClick={() => run('csv')}>{busy !== 'csv' && <FileDown size={14} />} CSV</Button>
        <Button size="sm" variant="ghost" onClick={() => setPicking(p => !p)}><Settings2 size={14} /> Sections ({selected.length}/{all.length})</Button>
      </div>
      {picking && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem', padding: '0.6rem', background: colors.cream, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          {all.map(s => (
            <label key={s.id} style={{ ...chip(selected.includes(s.id)), display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} style={{ display: 'none' }} />
              {s.label}
            </label>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected(selected.length === all.length ? [] : all.map(s => s.id))}>
            {selected.length === all.length ? 'Clear all' : 'Select all'}
          </Button>
        </div>
      )}
      {error && <div style={{ color: colors.red, fontSize: '0.8rem', marginTop: '0.4rem' }}>{error}</div>}
    </div>
  );
}
