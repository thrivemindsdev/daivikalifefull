'use client';

// Admin home: live sales overview in the Daivika wine & gold theme.
// Sales figures come from /api/reports (same numbers as Reports & Analytics); views and sign-ups from the dashboard's own data.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Wallet, Package, ChevronRight, AlertTriangle, Inbox, FileBarChart,
  ShoppingCart, Eye, MapPin, RefreshCw, Download, Sparkles, Clock, Minus,
} from 'lucide-react';
import {
  ComposedChart, Area, Bar, AreaChart, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api, ProductThumb } from '@/components/vendor/VendorUI';
import { fmtMoney, fmtInt } from '@/lib/report-tables';

export const T = {
  wine: '#360910',
  deep: '#28060b',
  wineSoft: '#5c1520',
  gold: '#c5831a',
  goldBright: '#fcd34d',
  goldPale: '#fde68a',
  cream: '#FAF8F5',
  creamDeep: '#f5ede0',
  border: '#ecdfcc',
  text: '#1f1410',
  muted: '#7a6a5c',
  green: '#15803d',
  red: '#b91c1c',
  heading: '"Outfit", "Poppins", sans-serif',
};

const card = {
  background: '#fff',
  border: `1px solid ${T.border}`,
  borderRadius: 18,
  boxShadow: '0 1px 2px rgba(54,9,16,0.04), 0 10px 30px -18px rgba(54,9,16,0.25)',
  padding: '1.25rem',
  minWidth: 0,
};

const STATUS_COLORS = { Delivered: '#15803d', Cancelled: '#b91c1c', Shipped: '#1e40af', Packed: '#7c3aed', Processing: T.gold, Accepted: '#0e7490' };
const PIE = [T.wine, T.gold, '#9f2d3f', '#e0b25c', '#6b4226', '#f1d9a8', '#7a6a5c'];

const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const RANGES = [
  { id: 'today', label: 'Today', range: (n) => [sod(n), n] },
  { id: '7d', label: '7 days', range: (n) => [sod(new Date(n - 6 * 864e5)), n] },
  { id: '30d', label: '30 days', range: (n) => [sod(new Date(n - 29 * 864e5)), n] },
  { id: 'month', label: 'This month', range: (n) => [new Date(n.getFullYear(), n.getMonth(), 1), n] },
  { id: 'year', label: 'This year', range: (n) => [new Date(n.getFullYear(), 0, 1), n] },
];

const short = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const tooltipStyle = { borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 10px 30px -10px rgba(54,9,16,0.3)', fontSize: 12, fontFamily: 'Poppins, sans-serif' };

function Trend({ value, invert, light }) {
  if (value === undefined) return null;
  if (value === null) {
    return <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, background: light ? 'rgba(253,230,138,0.18)' : T.creamDeep, color: light ? T.goldPale : T.muted }}>New</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value === 0 ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const fg = value === 0 ? (light ? T.goldPale : T.muted) : good ? (light ? '#86efac' : T.green) : (light ? '#fca5a5' : T.red);
  const bg = light ? 'rgba(255,255,255,0.1)' : value === 0 ? T.creamDeep : good ? '#ecfdf3' : '#fef2f2';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 999, background: bg, color: fg }}>
      <Icon size={12} /> {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

function Spark({ data, dataKey, color }) {
  return (
    <div style={{ width: '100%', height: 44 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sp-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#sp-${dataKey})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, change, invert, series, dataKey, sub }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.creamDeep}, #fff7e6)`, border: `1px solid ${T.border}`, color: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} />
        </div>
        <Trend value={change} invert={invert} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, letterSpacing: '0.3px' }}>{label}</div>
        <div style={{ fontFamily: T.heading, fontSize: '1.65rem', fontWeight: 800, color: T.text, lineHeight: 1.15, letterSpacing: '-0.5px' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: T.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {series && <Spark data={series} dataKey={dataKey} color={T.wine} />}
    </div>
  );
}

function Panel({ title, icon: Icon, action, children, style, tour }) {
  return (
    <div style={{ ...card, ...style }} data-tour={tour}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          {Icon && <span style={{ width: 30, height: 30, borderRadius: 9, background: T.creamDeep, color: T.wine, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} /></span>}
          <h3 style={{ margin: 0, fontFamily: T.heading, fontSize: '1.02rem', fontWeight: 700, color: T.text }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: T.gold, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, padding: 0 };

const Empty = ({ text }) => <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: T.muted, fontSize: '0.85rem' }}>{text}</div>;

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || T.muted;
  return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 999, color: c, background: `${c}14`, border: `1px solid ${c}33`, whiteSpace: 'nowrap' }}>{status}</span>;
}

export default function AdminOverview({ userName, products = [], users = [], pendingOrders = 0, unreadLeads = 0, onNavigate }) {
  const [rangeId, setRangeId] = useState('30d');
  const [report, setReport] = useState(null);
  const [today, setToday] = useState(null);
  const [vendorReports, setVendorReports] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('revenue');

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const q = ([from, to]) => `/reports?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), groupBy: 'auto' })}`;
    try {
      const sel = RANGES.find(r => r.id === rangeId).range(now);
      const [main, todays, subs] = await Promise.all([
        api(q(sel)),
        rangeId === 'today' ? null : api(q(RANGES[0].range(now))),
        api('/reports/submissions?status=submitted').catch(() => []),
      ]);
      setReport(main);
      setToday(todays || main);
      setVendorReports(subs.length);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rangeId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const productById = useMemo(() => new Map(products.map(p => [String(p._id || p.id), p])), [products]);
  const mostViewed = useMemo(() => [...products].filter(p => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 5), [products]);
  const recentUsers = useMemo(() => [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5), [users]);

  const s = report?.summary || {};
  const ch = report?.change || {};
  const series = report?.series || [];
  const lowStock = (report?.stock || []).filter(r => r.low);
  const totalStatus = (report?.byStatus || []).reduce((a, r) => a + r.orders, 0);
  const maxState = report?.byState?.[0]?.revenue || 1;
  const onlineShare = s.grossSales ? Math.round((s.onlineSales / s.grossSales) * 100) : 0;
  const rangeLabel = RANGES.find(r => r.id === rangeId).label;

  const attention = [
    { id: 'orders', icon: ShoppingCart, label: 'Orders to process', value: pendingOrders, tone: T.gold },
    { id: 'stock', icon: AlertTriangle, label: 'Products low on stock', value: lowStock.length, tone: T.red },
    { id: 'leads-inbox', icon: Inbox, label: 'Unread enquiries', value: unreadLeads, tone: '#1e40af' },
    { id: 'reports', icon: FileBarChart, label: 'Vendor reports to review', value: vendorReports, tone: T.wine },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: '"Poppins", sans-serif', color: T.text }}>
      <style>{`
        .ov-split { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1rem; }
        @media (max-width: 1100px) { .ov-split { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 'clamp(1.25rem, 3vw, 2rem)', color: '#fff',
        background: `radial-gradient(circle at 85% 15%, rgba(252,211,77,0.22), transparent 45%), linear-gradient(135deg, ${T.deep} 0%, ${T.wine} 55%, ${T.wineSoft} 100%)`,
        boxShadow: '0 20px 45px -20px rgba(40,6,11,0.65)',
      }}>
        <img src="/emblem.png" alt="" aria-hidden="true" style={{ position: 'absolute', right: -20, bottom: -30, width: 220, opacity: 0.08, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: T.goldBright }}>
              <Sparkles size={13} /> {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h2 style={{ fontFamily: T.heading, fontSize: 'clamp(1.5rem, 3.2vw, 2.1rem)', fontWeight: 800, margin: '0.4rem 0 0.25rem', letterSpacing: '-0.5px' }}>
              {greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>Here's how Daivika is doing, live from your store.</p>
          </div>
          <div data-tour="overview-today" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              ['Sales today', fmtMoney(today?.summary?.grossSales || 0).replace(/\.00$/, ''), today?.change?.grossSales],
              ['Orders today', fmtInt(today?.summary?.orders || 0), today?.change?.orders],
              ['Items today', fmtInt(today?.summary?.itemsSold || 0), today?.change?.itemsSold],
            ].map(([label, value, change]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(253,230,138,0.22)', borderRadius: 16, padding: '0.8rem 1rem', minWidth: 130, backdropFilter: 'blur(6px)' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontFamily: T.heading, fontSize: '1.35rem', fontWeight: 800, color: T.goldPale, margin: '2px 0 4px' }}>{value}</div>
                <Trend value={change} light />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Range bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div data-tour="overview-range" style={{ display: 'flex', gap: 4, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 999, padding: 4, overflowX: 'auto', maxWidth: '100%' }}>
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRangeId(r.id)} style={{
              border: 'none', cursor: 'pointer', borderRadius: 999, padding: '0.45rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
              background: rangeId === r.id ? `linear-gradient(135deg, ${T.wine}, ${T.wineSoft})` : 'transparent',
              color: rangeId === r.id ? T.goldPale : T.muted, transition: 'all 0.2s',
            }}>{r.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: T.green, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: '0 0 0 4px rgba(21,128,61,0.15)' }} /> Live
          </span>
          <button onClick={load} title="Refresh" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: '#fff', color: T.wine, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => onNavigate?.('reports')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.55rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: T.deep, background: `linear-gradient(135deg, ${T.goldBright}, ${T.gold})`, boxShadow: '0 6px 16px -8px rgba(197,131,26,0.8)' }}>
            <Download size={15} /> Reports & export
          </button>
        </div>
      </div>

      {error && <div style={{ ...card, color: T.red, padding: '0.85rem 1rem' }}>{error}</div>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', opacity: loading && report ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        <KpiCard icon={Wallet} label={`Revenue · ${rangeLabel}`} value={fmtMoney(s.grossSales).replace(/\.00$/, '')} change={ch.grossSales} series={series} dataKey="revenue" sub={`${onlineShare}% paid online · ${100 - onlineShare}% COD`} />
        <KpiCard icon={ShoppingBag} label="Orders" value={fmtInt(s.orders)} change={ch.orders} series={series} dataKey="orders" sub={`${fmtInt(s.itemsSold)} items sold`} />
        <KpiCard icon={TrendingUp} label="Average order value" value={fmtMoney(s.avgOrderValue).replace(/\.00$/, '')} change={ch.avgOrderValue} sub={`Discounts given ${short(s.discounts)}`} />
        <KpiCard icon={Users} label="Customers" value={fmtInt(s.customers)} change={ch.customers} sub={`${fmtInt(s.returningCustomers)} returning · ${fmtInt(s.newSignups)} new sign-ups`} />
      </div>

      {/* Trend + status */}
      <div className="ov-split">
        <Panel
          title="Sales performance"
          icon={TrendingUp}
         
          action={
            <div style={{ display: 'flex', gap: 4, background: T.cream, borderRadius: 999, padding: 3, border: `1px solid ${T.border}` }}>
              {[['revenue', 'Revenue'], ['orders', 'Orders']].map(([id, l]) => (
                <button key={id} onClick={() => setMetric(id)} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, background: metric === id ? T.wine : 'transparent', color: metric === id ? '#fff' : T.muted }}>{l}</button>
              ))}
            </div>
          }
        >
          <div style={{ width: '100%', height: 290 }}>
            {series.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <ComposedChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.wine} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={T.wine} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={T.border} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} minTickGap={28} tickFormatter={(v) => v.replace(/^Week of /, '').replace(/ \d{4}$/, '')} />
                  <YAxis tick={{ fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false} width={52} allowDecimals={false} tickFormatter={metric === 'revenue' ? short : fmtInt} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(197,131,26,0.08)' }} formatter={(v, n) => [n === 'revenue' ? fmtMoney(v) : fmtInt(v), n === 'revenue' ? 'Revenue' : 'Orders']} />
                  {metric === 'revenue'
                    ? <Area type="monotone" dataKey="revenue" stroke={T.wine} strokeWidth={2.5} fill="url(#ovFill)" activeDot={{ r: 5, fill: T.gold, stroke: '#fff', strokeWidth: 2 }} />
                    : <Bar dataKey="orders" fill={T.gold} radius={[6, 6, 0, 0]} maxBarSize={28} />}
                </ComposedChart>
              </ResponsiveContainer>
            ) : <Empty text={loading ? 'Loading…' : 'No sales in this period yet'} />}
          </div>
        </Panel>

        <Panel title="Order status" icon={Package}>
          {totalStatus ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 190 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <PieChart>
                    <Pie data={report.byStatus} dataKey="orders" nameKey="key" innerRadius={62} outerRadius={86} paddingAngle={3} stroke="none">
                      {report.byStatus.map((r, i) => <Cell key={r.key} fill={STATUS_COLORS[r.key] || PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: T.heading, fontSize: '1.6rem', fontWeight: 800 }}>{fmtInt(totalStatus)}</div>
                  <div style={{ fontSize: '0.7rem', color: T.muted }}>orders</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 0.75rem', marginTop: '0.5rem' }}>
                {report.byStatus.map((r, i) => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_COLORS[r.key] || PIE[i % PIE.length], flexShrink: 0 }} />
                    <span style={{ color: T.muted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.key}</span>
                    <b>{r.orders}</b>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty text="No orders in this period" />}
        </Panel>
      </div>

      {/* Attention + top products + states */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
        <Panel title="Needs your attention" icon={AlertTriangle} tour="overview-attention">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attention.map(a => (
              <button key={a.id} onClick={() => onNavigate?.(a.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.8rem', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                border: `1px solid ${a.value ? `${a.tone}33` : T.border}`, background: a.value ? `${a.tone}0d` : T.cream, fontFamily: 'inherit',
              }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', color: a.tone, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}`, flexShrink: 0 }}><a.icon size={16} /></span>
                <span style={{ flex: 1, fontSize: '0.83rem', fontWeight: 600, color: T.text }}>{a.label}</span>
                <span style={{ fontFamily: T.heading, fontWeight: 800, fontSize: '1.1rem', color: a.value ? a.tone : T.muted }}>{a.value}</span>
                <ChevronRight size={16} color={T.muted} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Best sellers" icon={ShoppingBag} action={<button style={linkBtn} onClick={() => onNavigate?.('reports')}>All products <ChevronRight size={14} /></button>}>
          {report?.topProducts?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {report.topProducts.slice(0, 5).map((p, i) => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{ width: 22, fontFamily: T.heading, fontWeight: 800, color: i < 3 ? T.gold : T.muted, fontSize: '0.9rem' }}>{i + 1}</span>
                  <ProductThumb src={productById.get(p.key)?.image} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: T.muted }}>{fmtInt(p.items)} sold · {p.category || '—'}</div>
                  </div>
                  <b style={{ fontSize: '0.85rem', color: T.wine }}>{short(p.revenue)}</b>
                </div>
              ))}
            </div>
          ) : <Empty text="No products sold in this period" />}
        </Panel>

        <Panel title="Top states" icon={MapPin}>
          {report?.byState?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {report.byState.slice(0, 6).map(r => (
                <div key={r.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{r.key}</span>
                    <span style={{ color: T.muted }}>{r.orders} orders · <b style={{ color: T.text }}>{short(r.revenue)}</b></span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: T.creamDeep, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(4, (r.revenue / maxState) * 100)}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${T.gold}, ${T.wine})` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty text="No orders in this period" />}
        </Panel>
      </div>

      {/* Recent orders + category + payments */}
      <div className="ov-split">
        <Panel title="Latest orders" icon={Clock} action={<button style={linkBtn} onClick={() => onNavigate?.('orders')}>View all <ChevronRight size={14} /></button>}>
          {report?.orders?.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 520 }}>
                <thead>
                  <tr>{['Order', 'Customer', 'Date', 'Status', 'Total'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '0 0.5rem 0.6rem', color: T.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {report.orders.slice(0, 6).map(o => (
                    <tr key={o.id}>
                      <td style={{ padding: '0.65rem 0.5rem', borderBottom: `1px dashed ${T.border}`, fontWeight: 700, color: T.wine }}>#{o.id.slice(-8)}</td>
                      <td style={{ padding: '0.65rem 0.5rem', borderBottom: `1px dashed ${T.border}` }}>
                        <div style={{ fontWeight: 600 }}>{o.customer || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: T.muted }}>{[o.district, o.state].filter(Boolean).join(', ')}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', borderBottom: `1px dashed ${T.border}`, color: T.muted, whiteSpace: 'nowrap' }}>{o.date}</td>
                      <td style={{ padding: '0.65rem 0.5rem', borderBottom: `1px dashed ${T.border}` }}><StatusPill status={o.status} /></td>
                      <td style={{ padding: '0.65rem 0.5rem', borderBottom: `1px dashed ${T.border}`, textAlign: 'right', fontWeight: 800 }}>{fmtMoney(o.total).replace(/\.00$/, '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="No orders in this period" />}
        </Panel>

        <Panel title="Sales by category" icon={Package}>
          {report?.byCategory?.length ? (
            <>
              <div style={{ width: '100%', height: 170 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <PieChart>
                    <Pie data={report.byCategory.slice(0, 6)} dataKey="revenue" nameKey="key" outerRadius={78} innerRadius={40} paddingAngle={2} stroke="none">
                      {report.byCategory.slice(0, 6).map((r, i) => <Cell key={r.key} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {report.byCategory.slice(0, 6).map((r, i) => (
                  <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: PIE[i % PIE.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.muted }}>{r.key}</span>
                    <b>{short(r.revenue)}</b>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty text="No sales in this period" />}
        </Panel>
      </div>

      {/* Views + sign-ups + payment split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
        <Panel title="Most viewed products" icon={Eye}>
          {mostViewed.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {mostViewed.map(p => (
                <div key={p._id || p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ProductThumb src={p.image} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ height: 5, borderRadius: 99, background: T.creamDeep, marginTop: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${(p.views / mostViewed[0].views) * 100}%`, height: '100%', background: T.gold, borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{fmtInt(p.views)}</span>
                </div>
              ))}
            </div>
          ) : <Empty text="No product views recorded yet" />}
        </Panel>

        <Panel title="Newest customers" icon={Users} action={<button style={linkBtn} onClick={() => onNavigate?.('users')}>All customers <ChevronRight size={14} /></button>}>
          {recentUsers.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentUsers.map(u => (
                <div key={u._id || u.id || u.email} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: T.goldPale, background: `linear-gradient(135deg, ${T.wine}, ${T.wineSoft})` }}>
                    {(u.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || u.phone}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: T.muted, whiteSpace: 'nowrap' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                </div>
              ))}
            </div>
          ) : <Empty text="No customers yet" />}
        </Panel>

        <Panel title="How customers pay" icon={Wallet}>
          {s.grossSales ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', background: T.creamDeep }}>
                <div style={{ width: `${onlineShare}%`, background: T.wine }} />
                <div style={{ width: `${100 - onlineShare}%`, background: T.gold }} />
              </div>
              {[['Online payments', s.onlineSales, T.wine, s.orders - s.codOrders], ['Cash on delivery', s.codSales, T.gold, s.codOrders]].map(([l, v, c, n]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                  <span style={{ flex: 1, fontSize: '0.82rem', color: T.muted }}>{l} <span style={{ fontSize: '0.72rem' }}>({fmtInt(n)} orders)</span></span>
                  <b style={{ fontSize: '0.9rem' }}>{fmtMoney(v).replace(/\.00$/, '')}</b>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 4 }}>
                {[['Delivered', s.deliveredOrders], ['Awaiting delivery', s.pendingFulfilment], ['Cancelled', s.cancelledOrders], ['Shipping collected', short(s.shipping)]].map(([l, v]) => (
                  <div key={l} style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 12, padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', color: T.muted }}>{l}</div>
                    <div style={{ fontFamily: T.heading, fontWeight: 800, fontSize: '1.05rem' }}>{typeof v === 'number' ? fmtInt(v) : v}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <Empty text="No sales in this period" />}
        </Panel>
      </div>
    </div>
  );
}
