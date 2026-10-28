'use client';

// Live sales & stock analytics with Excel / PDF / CSV export.
//  mode="admin"   whole store or any one vendor, plus the inbox of vendor-submitted reports
//  mode="vendor"  the vendor's own sales and stock, with "submit to admin"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, FileSpreadsheet, FileText, FileDown, Send, Inbox, BarChart3, ArrowLeft, CheckCircle2, Eye, Search,
  TrendingUp, TrendingDown, Minus, Settings2, Radio, ArrowLeftRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api, colors, inputStyle, labelStyle, Button, Card as BaseCard, EmptyState } from '@/components/vendor/VendorUI';
import { sectionsFor, tablesFor, kpisFor, groupLabel, formatCell, fmtMoney, fmtInt, fmtPct, isComparison } from '@/lib/report-tables';
import ComparisonPanel, { ComparisonView } from '@/components/reports/ComparisonPanel';

import {
  HEADING, Card, Legend, PALETTE, STATUS_COLORS, sod, eod, addDays, monday, PRESETS, GROUPS, pad, toInput, resolveRange, chip, SectionTitle, ChangeBadge, moneyShort, tooltipStyle, ChartCard, DataTable, ExportBar,
} from '@/components/reports/ReportUI';

// ── Report view (charts, KPIs, tables) ─────────────────────

const HEADLINE = ['grossSales', 'orders', 'itemsSold', 'avgOrderValue', 'customers', 'returningCustomers', 'newSignups', 'discounts', 'onlineSales', 'codSales', 'pendingFulfilment', 'cancelledOrders'];
const INVERT = ['cancelledOrders', 'cancelledValue', 'discounts'];
const TABLE_TABS = ['products', 'categories', 'customers', 'regions', 'payments', 'timing', 'coupons', 'vendors', 'stock', 'orders', 'trend', 'summary'];

export function ReportView({ report }) {
  const [metric, setMetric] = useState('revenue');
  const [tab, setTab] = useState('products');
  const s = report.summary;
  const kpis = kpisFor(report).filter(([k]) => HEADLINE.includes(k));
  const tabs = sectionsFor(report).filter(x => TABLE_TABS.includes(x.id)).sort((a, b) => TABLE_TABS.indexOf(a.id) - TABLE_TABS.indexOf(b.id));
  const lowStock = report.stock.filter(r => r.low).length;
  const fmtMetric = (v) => (metric === 'revenue' ? fmtMoney(v) : fmtInt(v));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '0.75rem' }}>
        {kpis.map(([k, label, type]) => (
          <Card key={k} style={k === 'grossSales'
            ? { padding: '0.95rem 1rem', background: `linear-gradient(135deg, #28060b, ${colors.wine} 60%, ${colors.wineSoft})`, borderColor: colors.wine, color: '#fff' }
            : { padding: '0.95rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', color: k === 'grossSales' ? '#fde68a' : colors.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
            <div style={{ fontFamily: HEADING, fontSize: '1.45rem', fontWeight: 800, color: k === 'grossSales' ? '#fff' : colors.text, margin: '0.25rem 0', letterSpacing: '-0.3px' }}>{type === 'money' ? fmtMoney(s[k]).replace(/\.00$/, '') : fmtInt(s[k])}</div>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <ChangeBadge value={report.change?.[k]} invert={INVERT.includes(k)} light={k === 'grossSales'} />
              {report.previous?.[k] !== undefined && <span style={{ fontSize: '0.68rem', color: k === 'grossSales' ? 'rgba(255,255,255,0.65)' : colors.muted }}>prev {type === 'money' ? moneyShort(report.previous[k]) : fmtInt(report.previous[k])}</span>}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle right={
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[['revenue', 'Revenue'], ['orders', 'Orders'], ['items', 'Items']].map(([id, l]) => (
              <button key={id} onClick={() => setMetric(id)} style={chip(metric === id)}>{l}</button>
            ))}
          </div>
        }>
          {groupLabel(report.meta.groupBy)} trend
        </SectionTitle>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <AreaChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rpFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.wine} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.wine} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: colors.muted }} tickFormatter={(v) => v.replace(/^Week of /, '')} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickFormatter={metric === 'revenue' ? moneyShort : fmtInt} width={56} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMetric(v), metric[0].toUpperCase() + metric.slice(1)]} />
              <Area type="monotone" dataKey={metric} stroke={colors.wine} strokeWidth={2} fill="url(#rpFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <ChartCard title="Order status" footer={report.byStatus.length > 0 && (
          <Legend items={report.byStatus.map((r, i) => ({ label: r.key, value: r.orders, color: STATUS_COLORS[r.key] || PALETTE[i % PALETTE.length] }))} />
        )}>
          {report.byStatus.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <PieChart>
                <Pie data={report.byStatus} dataKey="orders" nameKey="key" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                  {report.byStatus.map((r, i) => <Cell key={r.key} fill={STATUS_COLORS[r.key] || PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No orders" text="" />}
        </ChartCard>

        <ChartCard title="Sales by category">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={report.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: colors.muted }} tickFormatter={moneyShort} />
              <YAxis type="category" dataKey="key" width={100} tick={{ fontSize: 11, fill: colors.text }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} />
              <Bar dataKey="revenue" fill={colors.gold} radius={[0, 6, 6, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment methods" footer={(() => {
          const all = report.byPayment.reduce((a, r) => a + r.revenue, 0) || 1;
          return <Legend items={report.byPayment.map((r, i) => ({ label: r.key, value: `${Math.round((r.revenue / all) * 100)}%`, color: PALETTE[i % PALETTE.length] }))} />;
        })()}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <PieChart>
              <Pie data={report.byPayment} dataKey="revenue" nameKey="key" innerRadius={45} outerRadius={84} paddingAngle={3} stroke="none">
                {report.byPayment.map((r, i) => <Cell key={r.key} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Busiest days of the week">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={report.byWeekday}>
              <XAxis dataKey="key" tick={{ fontSize: 11, fill: colors.muted }} />
              <YAxis tick={{ fontSize: 10, fill: colors.muted }} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === 'revenue' ? fmtMoney(v) : v)} />
              <Bar dataKey="orders" fill={colors.wine} radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Busiest hours (orders)">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={report.byHour}>
              <XAxis dataKey="key" tick={{ fontSize: 9, fill: colors.muted }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: colors.muted }} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="orders" fill={colors.gold} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={report.meta.forVendor ? 'Top products' : 'Sales by store / vendor'}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart
              data={(report.meta.forVendor ? report.topProducts.map(p => ({ key: p.name, revenue: p.revenue })) : report.byVendor).slice(0, 8)}
              layout="vertical" margin={{ left: 10, right: 16 }}
            >
              <XAxis type="number" tick={{ fontSize: 10, fill: colors.muted }} tickFormatter={moneyShort} />
              <YAxis type="category" dataKey="key" width={110} tick={{ fontSize: 11, fill: colors.text }} tickFormatter={(v) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} />
              <Bar dataKey="revenue" fill={colors.wineSoft} radius={[0, 6, 6, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '0.6rem', borderBottom: `1px solid ${colors.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={chip(tab === t.id)}>
              {t.label}
              {t.id === 'stock' && lowStock > 0 && <span style={{ marginLeft: 6, background: colors.red, color: '#fff', borderRadius: 999, padding: '0 0.4rem', fontSize: '0.66rem' }}>{lowStock} low</span>}
            </button>
          ))}
        </div>
        {tablesFor(report, tab).map(t => <DataTable key={`${tab}-${t.title}`} table={t} />)}
      </Card>
    </div>
  );
}

// ── Submitted reports (vendor → admin) ─────────────────────

const statusChip = (status) => (
  <span style={{ background: status === 'reviewed' ? '#dcfce7' : '#fef3c7', color: status === 'reviewed' ? '#166534' : '#92400e', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: 999, whiteSpace: 'nowrap' }}>
    {status === 'reviewed' ? 'Reviewed' : 'Submitted'}
  </span>
);

const dateOnly = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function SubmissionDetail({ id, mode, onBack, onChanged }) {
  const [item, setItem] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = mode === 'admin' ? '/reports/submissions' : '/reports/me/submissions';

  useEffect(() => {
    api(`${base}/${id}`).then(r => { setItem(r); setNote(r.adminNote || ''); }).catch(err => setError(err.message));
  }, [base, id]);

  const save = async (status) => {
    setBusy(true); setError('');
    try {
      const updated = await api(`/reports/submissions/${id}`, { method: 'PUT', body: { status, adminNote: note } });
      setItem(i => ({ ...i, ...updated }));
      onChanged?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div><Button size="sm" variant="outline" onClick={onBack}><ArrowLeft size={14} /> All submitted reports</Button></div>
      {error && <Card style={{ color: colors.red }}>{error}</Card>}
      {!item ? !error && <Card><EmptyState title="Loading report..." text="" /></Card> : (
        <>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.8rem', color: colors.muted }}>
                  {item.vendorName} · {item.data?.meta?.fromLabel} → {item.data?.meta?.toLabel} · submitted {dateOnly(item.createdAt)}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.muted, marginTop: 2 }}>Figures are frozen as they were when the vendor submitted the report.</div>
              </div>
              {statusChip(item.status)}
            </div>
            {item.note && <div style={{ background: colors.cream, borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}><b>Vendor note:</b> {item.note}</div>}
            {mode === 'admin' ? (
              <div>
                <label style={labelStyle}>Note to vendor (optional)</label>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {item.status !== 'reviewed'
                    ? <Button size="sm" loading={busy} onClick={() => save('reviewed')}><CheckCircle2 size={14} /> Mark reviewed</Button>
                    : <Button size="sm" variant="outline" loading={busy} onClick={() => save('submitted')}>Mark as not reviewed</Button>}
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => save(undefined)}>Save note</Button>
                </div>
              </div>
            ) : item.adminNote && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}><b>Admin note:</b> {item.adminNote}</div>
            )}
            {item.data && <ExportBar report={item.data} />}
          </Card>
          {item.data && (isComparison(item.data) ? <ComparisonView report={item.data} /> : <ReportView report={item.data} />)}
        </>
      )}
    </div>
  );
}

function SubmissionsList({ mode, onCount }) {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await api(mode === 'admin' ? `/reports/submissions${status ? `?status=${status}` : ''}` : '/reports/me/submissions');
      setRows(list);
      setError('');
      if (mode === 'admin' && !status) onCount?.(list.filter(r => r.status === 'submitted').length);
    } catch (err) { setError(err.message); setRows(r => r || []); }
  }, [mode, status, onCount]);

  useEffect(() => { load(); }, [load]);

  if (openId) return <SubmissionDetail id={openId} mode={mode} onBack={() => { setOpenId(null); load(); }} onChanged={load} />;

  return (
    <Card>
      <SectionTitle right={mode === 'admin' && (
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {[['', 'All'], ['submitted', 'New'], ['reviewed', 'Reviewed']].map(([id, l]) => <button key={id} onClick={() => setStatus(id)} style={chip(status === id)}>{l}</button>)}
        </div>
      )}>
        {mode === 'admin' ? 'Reports submitted by vendors' : 'Reports you have sent to the admin'}
      </SectionTitle>
      {error && <div style={{ color: colors.red, fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</div>}
      {rows === null ? <EmptyState title="Loading..." text="" /> : rows.length === 0 ? (
        <EmptyState title="No reports yet" text={mode === 'admin' ? 'When a vendor submits a report it will appear here and you will get a notification.' : 'Pick a period above and press "Submit to admin" to send your sales and stock report.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.8rem', border: `1px solid ${colors.border}`, borderRadius: 8, flexWrap: 'wrap', background: r.status === 'submitted' && mode === 'admin' ? '#fffbeb' : '#fff' }}>
              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{r.title}</div>
                <div style={{ fontSize: '0.75rem', color: colors.muted }}>
                  {mode === 'admin' && <b style={{ color: colors.text }}>{r.vendorName} · </b>}
                  {dateOnly(r.rangeFrom)} → {dateOnly(r.rangeTo)} · sent {dateOnly(r.createdAt)}
                </div>
                {r.groupBy === 'compare'
                  ? <div style={{ fontSize: '0.75rem', color: colors.wine, fontWeight: 700, marginTop: 2 }}>Period comparison · latest period {fmtMoney(r.summary?.grossSales)} · {fmtInt(r.summary?.orders)} orders</div>
                  : r.summary && <div style={{ fontSize: '0.75rem', color: colors.text, marginTop: 2 }}>{fmtMoney(r.summary.grossSales)} · {fmtInt(r.summary.orders)} orders · {fmtInt(r.summary.itemsSold)} items</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {statusChip(r.status)}
                <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}><Eye size={14} /> Open</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SubmitForm({ range, groupBy, onDone, onCancel }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/reports/me/submit', { method: 'POST', body: { from: range[0].toISOString(), to: range[1].toISOString(), groupBy, title, note } });
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem', padding: '0.8rem', background: colors.cream, borderRadius: 8, border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: '0.82rem', color: colors.muted }}>
        Sends your sales and stock for <b style={{ color: colors.text }}>{range[0].toLocaleString('en-IN')} → {range[1].toLocaleString('en-IN')}</b> to the Daivika admin.
      </div>
      <div>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. October sales report" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Note for the admin (optional)</label>
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      {error && <div style={{ color: colors.red, fontSize: '0.8rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <Button type="submit" size="sm" loading={busy}><Send size={14} /> Submit report</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Main panel ─────────────────────────────────────────────

export default function ReportsPanel({ mode = 'admin' }) {
  const isAdmin = mode === 'admin';
  const [view, setView] = useState('live');
  const [preset, setPreset] = useState('this_month');
  const [custom, setCustom] = useState(() => ({ from: toInput(sod(addDays(new Date(), -6))), to: toInput(new Date()) }));
  const [groupBy, setGroupBy] = useState('auto');
  const [scope, setScope] = useState('all');
  const [vendors, setVendors] = useState([]);
  const [report, setReport] = useState(null);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');
  const [newCount, setNewCount] = useState(0);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    api('/vendors').then(setVendors).catch(() => {});
    api('/reports/submissions?status=submitted').then(r => setNewCount(r.length)).catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async ({ quiet } = {}) => {
    const [from, to] = resolveRange(preset, custom);
    if (isNaN(from) || isNaN(to)) return setError('Pick a valid start and end date');
    if (to <= from) return setError('The end date must be after the start date');
    if (!quiet) setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), groupBy });
      if (isAdmin) qs.set('vendor', scope);
      setReport(await api(`${isAdmin ? '/reports' : '/reports/me'}?${qs}`));
      setRange([from, to]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [preset, custom, groupBy, scope, isAdmin]);

  useEffect(() => { if (view === 'live' && preset !== 'custom') load(); }, [view, preset, groupBy, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ranges that end "now" keep refreshing so new orders show up
  const live = PRESETS.find(p => p.id === preset)?.live;
  useEffect(() => {
    if (view !== 'live' || !live) return;
    const t = setInterval(() => load({ quiet: true }), 60000);
    return () => clearInterval(t);
  }, [view, live, load]);

  const tabBtn = (id, label, Icon, badge) => (
    <button onClick={() => setView(id)} style={{ ...chip(view === id), borderRadius: 6, padding: '0.55rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <Icon size={15} /> {label}
      {badge > 0 && <span style={{ background: colors.gold, color: '#fff', borderRadius: 999, fontSize: '0.68rem', padding: '0 0.45rem' }}>{badge}</span>}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Poppins", sans-serif', color: colors.text }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {tabBtn('live', isAdmin ? 'Live analytics' : 'My sales & stock', BarChart3)}
        {tabBtn('compare', 'Compare periods', ArrowLeftRight)}
        {tabBtn('submissions', isAdmin ? 'Vendor reports' : 'Submitted reports', Inbox, isAdmin ? newCount : 0)}
      </div>

      {view === 'compare' ? (
        <ComparisonPanel mode={mode} vendors={vendors} onSubmitted={() => setListKey(k => k + 1)} />
      ) : view === 'submissions' ? (
        <SubmissionsList key={listKey} mode={mode} onCount={setNewCount} />
      ) : (
        <>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={labelStyle}>Period</label>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {PRESETS.map(p => <button key={p.id} onClick={() => setPreset(p.id)} style={chip(preset === p.id)}>{p.label}</button>)}
              </div>
            </div>

            {preset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>From (date & time)</label>
                  <input type="datetime-local" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>To (date & time)</label>
                  <input type="datetime-local" value={custom.to} min={custom.from} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} style={inputStyle} />
                </div>
                <Button onClick={() => load()} loading={loading}>Show report</Button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
              <div>
                <label style={labelStyle}>Group by</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={inputStyle}>
                  {GROUPS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label style={labelStyle}>Store</label>
                  <select value={scope} onChange={e => setScope(e.target.value)} style={inputStyle}>
                    <option value="all">All stores (main + vendors)</option>
                    <option value="main">Main store only</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>Vendor: {v.businessName || v.name} ({v.district})</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start', borderTop: `1px solid ${colors.border}`, paddingTop: '0.85rem' }}>
              {report ? <ExportBar report={report} /> : <span />}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {!isAdmin && report && <Button size="sm" variant="gold" onClick={() => setSubmitting(s => !s)}><Send size={14} /> Submit to admin</Button>}
                <Button size="sm" variant="outline" loading={loading} onClick={() => load()}>{!loading && <RefreshCw size={14} />} Refresh</Button>
              </div>
            </div>

            {submitting && range && (
              <SubmitForm
                range={range}
                groupBy={groupBy}
                onCancel={() => setSubmitting(false)}
                onDone={() => { setSubmitting(false); setFlash('Report sent to the admin.'); setListKey(k => k + 1); setTimeout(() => setFlash(''), 5000); }}
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
                <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#fcd34d' }}>{report.meta.scope} · {groupLabel(report.meta.groupBy)}</div>
                <div style={{ fontFamily: HEADING, fontWeight: 700, fontSize: '1.02rem', marginTop: 2 }}>{report.meta.fromLabel} → {report.meta.toLabel}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: live ? '#86efac' : '#fde68a', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(253,230,138,0.25)', borderRadius: 999, padding: '0.3rem 0.75rem' }}>
                <Radio size={12} /> {live ? 'Live' : 'Fixed period'} · updated {report.meta.generatedLabel.split(', ')[1]}
              </span>
            </div>
          )}

          {!report ? (
            <Card><EmptyState title={loading ? 'Loading report...' : 'No report yet'} text={loading ? '' : 'Pick a period to see your figures.'} /></Card>
          ) : (
            <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}><ReportView report={report} /></div>
          )}
        </>
      )}
    </div>
  );
}
