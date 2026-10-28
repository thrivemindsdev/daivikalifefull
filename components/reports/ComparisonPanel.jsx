'use client';

// Compare sales between periods: two periods (this month vs last month, year on year, custom…)
// or a run of periods (last N days / weeks / months / quarters / years). Admins can compare any store
// or vendor; vendors compare their own sales and can submit the comparison to the admin.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as ChartLegend } from 'recharts';
import { api, colors, inputStyle, labelStyle, Button, EmptyState } from '@/components/vendor/VendorUI';
import { sectionsFor, tablesFor, fmtMoney, fmtInt, fmtPct, pctChange } from '@/lib/report-tables';
import {
  HEADING, Card, PALETTE, sod, addDays, monday, toInput, chip, SectionTitle, moneyShort, tooltipStyle, DataTable, ExportBar,
} from '@/components/reports/ReportUI';

// ── Period definitions (browser local time) ────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const monthStart = (y, m) => new Date(y, m, 1);
const endBefore = (d) => new Date(d.getTime() - 1);
// Same day-of-period in an earlier period, never past that period's end
const sameOffset = (fromStart, now, targetStart, targetEnd) => new Date(Math.min(targetStart.getTime() + (now - fromStart), targetEnd.getTime()));

const PAIRS = [
  {
    id: 'mtd', label: 'This month vs last month',
    build: (n) => {
      const cur = monthStart(n.getFullYear(), n.getMonth());
      const prev = monthStart(n.getFullYear(), n.getMonth() - 1);
      const prevEnd = sameOffset(cur, n, prev, endBefore(cur));
      return [
        { label: `${MONTHS[prev.getMonth()]} 1–${prevEnd.getDate()}`, from: prev, to: prevEnd },
        { label: `${MONTHS[cur.getMonth()]} 1–${n.getDate()}`, from: cur, to: n },
      ];
    },
  },
  {
    id: 'months', label: 'Last month vs month before',
    build: (n) => {
      const a = monthStart(n.getFullYear(), n.getMonth() - 2), b = monthStart(n.getFullYear(), n.getMonth() - 1), c = monthStart(n.getFullYear(), n.getMonth());
      return [
        { label: `${MONTHS[a.getMonth()]} ${a.getFullYear()}`, from: a, to: endBefore(b) },
        { label: `${MONTHS[b.getMonth()]} ${b.getFullYear()}`, from: b, to: endBefore(c) },
      ];
    },
  },
  {
    id: 'yoy_month', label: 'This month vs same month last year',
    build: (n) => {
      const cur = monthStart(n.getFullYear(), n.getMonth());
      const ly = monthStart(n.getFullYear() - 1, n.getMonth());
      const lyEnd = sameOffset(cur, n, ly, endBefore(monthStart(n.getFullYear() - 1, n.getMonth() + 1)));
      return [
        { label: `${MONTHS[ly.getMonth()]} ${ly.getFullYear()}`, from: ly, to: lyEnd },
        { label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, from: cur, to: n },
      ];
    },
  },
  {
    id: 'ytd', label: 'This year vs last year (to date)',
    build: (n) => {
      const cur = new Date(n.getFullYear(), 0, 1), ly = new Date(n.getFullYear() - 1, 0, 1);
      return [
        { label: `${ly.getFullYear()} to ${dm(n)}`, from: ly, to: sameOffset(cur, n, ly, endBefore(cur)) },
        { label: `${cur.getFullYear()} to ${dm(n)}`, from: cur, to: n },
      ];
    },
  },
  {
    id: 'years', label: 'Last year vs year before',
    build: (n) => {
      const y = n.getFullYear();
      return [
        { label: String(y - 2), from: new Date(y - 2, 0, 1), to: endBefore(new Date(y - 1, 0, 1)) },
        { label: String(y - 1), from: new Date(y - 1, 0, 1), to: endBefore(new Date(y, 0, 1)) },
      ];
    },
  },
  {
    id: 'week', label: 'This week vs last week',
    build: (n) => {
      const cur = monday(n), prev = addDays(cur, -7);
      return [
        { label: `Week of ${dm(prev)}`, from: prev, to: sameOffset(cur, n, prev, endBefore(cur)) },
        { label: `Week of ${dm(cur)}`, from: cur, to: n },
      ];
    },
  },
  {
    id: '7d', label: 'Last 7 days vs 7 before',
    build: (n) => {
      const b = sod(addDays(n, -6)), a = addDays(b, -7);
      return [
        { label: `${dm(a)} – ${dm(addDays(b, -1))}`, from: a, to: endBefore(b) },
        { label: `${dm(b)} – ${dm(n)}`, from: b, to: n },
      ];
    },
  },
  {
    id: '30d', label: 'Last 30 days vs 30 before',
    build: (n) => {
      const b = sod(addDays(n, -29)), a = addDays(b, -30);
      return [
        { label: `${dm(a)} – ${dm(addDays(b, -1))}`, from: a, to: endBefore(b) },
        { label: `${dm(b)} – ${dm(n)}`, from: b, to: n },
      ];
    },
  },
  { id: 'custom', label: 'Custom dates' },
];

const UNITS = [
  { id: 'day', label: 'Days', max: 24, def: 7 },
  { id: 'week', label: 'Weeks', max: 24, def: 8 },
  { id: 'month', label: 'Months', max: 24, def: 6 },
  { id: 'quarter', label: 'Quarters', max: 12, def: 4 },
  { id: 'year', label: 'Years', max: 10, def: 3 },
];

function unitStart(unit, d) {
  if (unit === 'day') return sod(d);
  if (unit === 'week') return monday(d);
  if (unit === 'month') return monthStart(d.getFullYear(), d.getMonth());
  if (unit === 'quarter') return monthStart(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3);
  return new Date(d.getFullYear(), 0, 1);
}
function unitShift(unit, d, n) {
  if (unit === 'day') return addDays(d, n);
  if (unit === 'week') return addDays(d, 7 * n);
  if (unit === 'month') return monthStart(d.getFullYear(), d.getMonth() + n);
  if (unit === 'quarter') return monthStart(d.getFullYear(), d.getMonth() + 3 * n);
  return new Date(d.getFullYear() + n, 0, 1);
}
function unitLabel(unit, d) {
  if (unit === 'day') return dm(d);
  if (unit === 'week') return `Wk ${dm(d)}`;
  if (unit === 'month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (unit === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  return String(d.getFullYear());
}

// The last `count` periods of `unit`, oldest first; the current one runs up to now
function buildRun(unit, count, includeCurrent, now) {
  const cur = unitStart(unit, now);
  const out = [];
  for (let k = includeCurrent ? count - 1 : count; k >= (includeCurrent ? 0 : 1); k--) {
    const from = unitShift(unit, cur, -k);
    const isCurrent = k === 0;
    out.push({ label: unitLabel(unit, from) + (isCurrent && unit !== 'day' ? ' (to date)' : ''), from, to: isCurrent ? now : endBefore(unitShift(unit, from, 1)) });
  }
  return out;
}

// ── Comparison view ────────────────────────────────────────

const TABS = ['summary', 'periods', 'products', 'categories', 'regions', 'payments', 'vendors'];

function Trend({ value, invert }) {
  if (value === undefined) return <span style={{ fontSize: '0.7rem', color: colors.muted }}>first period</span>;
  if (value === null) return <span style={{ fontSize: '0.7rem', color: colors.muted, fontWeight: 700 }}>new</span>;
  const good = invert ? value < 0 : value > 0;
  const Icon = value === 0 ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const tone = value === 0 ? colors.muted : good ? colors.green : colors.red;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 800, color: tone }}><Icon size={12} /> {fmtPct(value)}</span>;
}

export function ComparisonView({ report }) {
  const [tab, setTab] = useState('summary');
  const [metric, setMetric] = useState('revenue');
  const periods = report.periods || [];
  const tabs = sectionsFor(report).filter(s => TABS.includes(s.id));
  const first = periods[0]?.summary || {}, last = periods[periods.length - 1]?.summary || {};

  // Top categories as grouped bars (one bar per period)
  const categoryChart = useMemo(() => {
    const totals = new Map();
    periods.forEach(p => (p.byCategory || []).forEach(c => totals.set(c.key, (totals.get(c.key) || 0) + c.revenue)));
    const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
    return top.map(k => {
      const row = { category: k };
      periods.forEach((p, i) => { row[`p${i}`] = (p.byCategory || []).find(c => c.key === k)?.revenue || 0; });
      return row;
    });
  }, [periods]);

  const headline = [
    ['Revenue', 'grossSales', 'money'],
    ['Orders', 'orders', 'int'],
    ['Items sold', 'itemsSold', 'int'],
    ['Avg order value', 'avgOrderValue', 'money'],
    ['Customers', 'customers', 'int'],
    ['Cancelled', 'cancelledOrders', 'int', true],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
        {headline.map(([label, key, type, invert]) => (
          <Card key={key} style={{ padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: colors.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap', margin: '0.25rem 0' }}>
              <span style={{ fontFamily: HEADING, fontSize: '1.3rem', fontWeight: 800 }}>{type === 'money' ? moneyShort(last[key]) : fmtInt(last[key])}</span>
              <span style={{ fontSize: '0.75rem', color: colors.muted }}>vs {type === 'money' ? moneyShort(first[key]) : fmtInt(first[key])}</span>
            </div>
            <Trend value={pctChange(first[key], last[key])} invert={invert} />
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: 4 }}>
        {periods.map((p, i) => (
          <div key={i} style={{ flex: '0 0 auto', minWidth: 170, padding: '0.75rem 0.9rem', borderRadius: 14, border: `1px solid ${colors.border}`, background: '#fff', borderTop: `3px solid ${PALETTE[i % PALETTE.length]}` }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{p.label}</div>
            <div style={{ fontSize: '0.68rem', color: colors.muted, marginBottom: 6 }}>{p.fromLabel} – {p.toLabel}</div>
            <div style={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.05rem' }}>{fmtMoney(p.summary.grossSales).replace(/\.00$/, '')}</div>
            <div style={{ fontSize: '0.72rem', color: colors.muted, marginBottom: 4 }}>{fmtInt(p.summary.orders)} orders · {fmtInt(p.summary.itemsSold)} items</div>
            <Trend value={i === 0 ? undefined : pctChange(periods[i - 1].summary.grossSales, p.summary.grossSales)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
        <Card>
          <SectionTitle right={
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {[['revenue', 'Revenue'], ['orders', 'Orders'], ['items', 'Items']].map(([id, l]) => <button key={id} onClick={() => setMetric(id)} style={chip(metric === id)}>{l}</button>)}
            </div>
          }>
            {metric === 'revenue' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Items sold'} by period
          </SectionTitle>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <ComposedChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: colors.muted }} interval={0} angle={periods.length > 6 ? -30 : 0} textAnchor={periods.length > 6 ? 'end' : 'middle'} height={periods.length > 6 ? 56 : 30} />
                <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickFormatter={metric === 'revenue' ? moneyShort : fmtInt} width={56} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [metric === 'revenue' ? fmtMoney(v) : fmtInt(v), metric]} />
                <Bar dataKey={metric} fill={colors.wine} radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Line type="monotone" dataKey={metric} stroke={colors.gold} strokeWidth={2} dot={{ r: 3, fill: colors.gold }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle>Top categories by period</SectionTitle>
          <div style={{ width: '100%', height: 260 }}>
            {categoryChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <BarChart data={categoryChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: colors.muted }} interval={0} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
                  <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickFormatter={moneyShort} width={56} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmtMoney(v), periods[Number(String(n).slice(1))]?.label || n]} />
                  {periods.length <= 8 && <ChartLegend formatter={(v) => periods[Number(String(v).slice(1))]?.label || v} wrapperStyle={{ fontSize: 11 }} />}
                  {periods.map((_, i) => <Bar key={i} dataKey={`p${i}`} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} maxBarSize={28} />)}
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="No sales in these periods" text="" />}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '0.6rem', borderBottom: `1px solid ${colors.border}` }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>{t.label}</button>)}
        </div>
        {tablesFor(report, tab).map(t => <DataTable key={`${tab}-${t.title}`} table={t} />)}
      </Card>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────

function SubmitComparisonForm({ periods, onDone, onCancel }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/reports/me/submit', { method: 'POST', body: { periods, title, note } });
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem', padding: '0.8rem', background: colors.cream, borderRadius: 12, border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: '0.82rem', color: colors.muted }}>Sends this comparison ({periods.map(p => p.label).join(' vs ')}) to the Daivika admin. Figures are recalculated from your orders when you submit.</div>
      <div>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. October vs September sales" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Note for the admin (optional)</label>
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {error && <div style={{ color: colors.red, fontSize: '0.8rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <Button type="submit" size="sm" loading={busy}><Send size={14} /> Submit comparison</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function ComparisonPanel({ mode = 'admin', vendors = [], onSubmitted }) {
  const isAdmin = mode === 'admin';
  const [kind, setKind] = useState('pair');
  const [pair, setPair] = useState('mtd');
  const [custom, setCustom] = useState(() => {
    const n = new Date();
    return { aFrom: toInput(monthStart(n.getFullYear(), n.getMonth() - 1)), aTo: toInput(endBefore(monthStart(n.getFullYear(), n.getMonth()))), bFrom: toInput(monthStart(n.getFullYear(), n.getMonth())), bTo: toInput(n) };
  });
  const [unit, setUnit] = useState('month');
  const [count, setCount] = useState(6);
  const [includeCurrent, setIncludeCurrent] = useState(true);
  const [scope, setScope] = useState('all');
  const [report, setReport] = useState(null);
  const [periods, setPeriods] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');

  const resolvePeriods = useCallback(() => {
    const now = new Date();
    if (kind === 'series') return buildRun(unit, count, includeCurrent, now);
    if (pair === 'custom') {
      return [
        { label: 'Period A', from: new Date(custom.aFrom), to: new Date(custom.aTo) },
        { label: 'Period B', from: new Date(custom.bFrom), to: new Date(custom.bTo) },
      ];
    }
    return PAIRS.find(p => p.id === pair).build(now);
  }, [kind, pair, custom, unit, count, includeCurrent]);

  const load = useCallback(async () => {
    const list = resolvePeriods();
    if (list.some(p => isNaN(p.from) || isNaN(p.to))) return setError('Pick a valid start and end for every period');
    if (list.some(p => p.to <= p.from)) return setError('Each period must end after it starts');
    const payload = list.map(p => ({ label: p.label, from: p.from.toISOString(), to: p.to.toISOString() }));
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams({ periods: JSON.stringify(payload) });
      if (isAdmin) qs.set('vendor', scope);
      setReport(await api(`${isAdmin ? '/reports/compare' : '/reports/me/compare'}?${qs}`));
      setPeriods(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resolvePeriods, isAdmin, scope]);

  // Presets load straight away; custom dates wait for "Compare"
  useEffect(() => {
    if (kind === 'pair' && pair === 'custom') return;
    load();
  }, [kind, pair, unit, count, includeCurrent, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const unitDef = UNITS.find(u => u.id === unit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button onClick={() => setKind('pair')} style={chip(kind === 'pair')}>Two periods</button>
          <button onClick={() => setKind('series')} style={chip(kind === 'series')}>Period by period</button>
        </div>

        {kind === 'pair' ? (
          <div>
            <label style={labelStyle}>Compare</label>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {PAIRS.map(p => <button key={p.id} onClick={() => setPair(p.id)} style={chip(pair === p.id)}>{p.label}</button>)}
            </div>
            {pair === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.6rem', marginTop: '0.75rem', alignItems: 'end' }}>
                {[['aFrom', 'Period A from'], ['aTo', 'Period A to'], ['bFrom', 'Period B from'], ['bTo', 'Period B to']].map(([k, l]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input type="datetime-local" value={custom[k]} onChange={e => setCustom(c => ({ ...c, [k]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
                <Button onClick={load} loading={loading}><ArrowLeftRight size={14} /> Compare</Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Compare by</label>
              <select value={unit} onChange={e => { const u = UNITS.find(x => x.id === e.target.value); setUnit(u.id); setCount(u.def); }} style={inputStyle}>
                {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>How many</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))} style={inputStyle}>
                {Array.from({ length: unitDef.max - 1 }, (_, i) => i + 2).map(n => <option key={n} value={n}>Last {n} {unitDef.label.toLowerCase()}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 600, color: colors.text, padding: '0.55rem 0' }}>
              <input type="checkbox" checked={includeCurrent} onChange={e => setIncludeCurrent(e.target.checked)} />
              Include the current {unitDef.label.toLowerCase().replace(/s$/, '')} (to date)
            </label>
          </div>
        )}

        {isAdmin && (
          <div style={{ maxWidth: 420 }}>
            <label style={labelStyle}>Store</label>
            <select value={scope} onChange={e => setScope(e.target.value)} style={inputStyle}>
              <option value="all">All stores (main + vendors)</option>
              <option value="main">Main store only</option>
              {vendors.map(v => <option key={v.id} value={v.id}>Vendor: {v.businessName || v.name} ({v.district})</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start', borderTop: `1px solid ${colors.border}`, paddingTop: '0.85rem' }}>
          {report ? <ExportBar report={report} /> : <span />}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {!isAdmin && report && <Button size="sm" variant="gold" onClick={() => setSubmitting(s => !s)}><Send size={14} /> Submit to admin</Button>}
            <Button size="sm" variant="outline" loading={loading} onClick={load}>{!loading && <RefreshCw size={14} />} Refresh</Button>
          </div>
        </div>
        {submitting && periods && (
          <SubmitComparisonForm
            periods={periods}
            onCancel={() => setSubmitting(false)}
            onDone={() => { setSubmitting(false); setFlash('Comparison sent to the admin.'); onSubmitted?.(); setTimeout(() => setFlash(''), 5000); }}
          />
        )}
        {flash && <div style={{ color: colors.green, fontSize: '0.85rem', fontWeight: 700 }}>{flash}</div>}
        {error && <div style={{ color: colors.red, fontSize: '0.85rem' }}>{error}</div>}
      </Card>

      {report && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.95rem 1.2rem', borderRadius: 16, color: '#fff',
          background: `radial-gradient(circle at 90% 0%, rgba(252,211,77,0.2), transparent 50%), linear-gradient(135deg, #28060b, ${colors.wine} 60%, ${colors.wineSoft})`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#fcd34d' }}>{report.meta.scope} · {report.periods.length} periods</div>
            <div style={{ fontFamily: HEADING, fontWeight: 700, fontSize: '1.02rem', marginTop: 2 }}>{report.periods.map(p => p.label).join('  vs  ')}</div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#fde68a' }}>Updated {report.meta.generatedLabel.split(', ')[1]}</span>
        </div>
      )}

      {!report ? (
        <Card><EmptyState title={loading ? 'Comparing…' : 'Choose periods to compare'} text={loading ? '' : 'Pick a comparison above.'} /></Card>
      ) : (
        <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}><ComparisonView report={report} /></div>
      )}
    </div>
  );
}
