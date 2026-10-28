'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@/hooks/useRouterShim';
import { useAuth } from '@/context/AuthContext';
import {
  Package, ShoppingCart, Boxes, CheckCircle2, LogOut, MapPin, Phone, RefreshCw, KeyRound, Store, AlertTriangle, Ban, BarChart3, LifeBuoy,
} from 'lucide-react';
import HelpCenter, { HelpDrawer } from '@/components/help/HelpCenter';
import GuidedTour from '@/components/help/GuidedTour';
import { HELP, guideForTab } from '@/lib/help-content';
import ReportsPanel from '@/components/reports/ReportsPanel';
import {
  api, colors, inputStyle, labelStyle, Button, Card, StatCard, StatusBadge, EmptyState, ProductThumb, variantLabel, formatDate, money,
} from '@/components/vendor/VendorUI';
import VendorStockManager from '@/components/vendor/VendorStockManager';

const NEXT_STEP = { Assigned: 'Accepted', Accepted: 'Packed', Processing: 'Packed', Packed: 'Shipped', Shipped: 'Delivered' };
const STEP_LABEL = { Accepted: 'Accept order', Packed: 'Mark packed', Shipped: 'Mark shipped', Delivered: 'Mark delivered' };

const isOpen = (o) => !['Delivered', 'Cancelled'].includes(o.status);

function OrderCard({ order, onUpdated }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  // Once the order moves past Processing (by the vendor or the admin) its status leads
  const current = order.status !== 'Processing' ? order.status : order.vendorStatus === 'Accepted' ? 'Accepted' : 'Assigned';
  const next = NEXT_STEP[current];
  const a = order.address || {};

  const advance = async () => {
    setBusy('next'); setError('');
    try { await api(`/vendors/me/orders/${order._id}/status`, { method: 'PUT', body: { status: next } }); await onUpdated(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const reject = async () => {
    const reason = window.prompt('Why are you rejecting this order? (e.g. out of stock)\nIt will be sent to the next nearest vendor.');
    if (reason === null) return;
    setBusy('reject'); setError('');
    try { await api(`/vendors/me/orders/${order._id}/reject`, { method: 'POST', body: { reason } }); await onUpdated(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, color: colors.text }}>#{order._id} {order.invoiceNumber && <span style={{ color: colors.muted, fontWeight: 600, fontSize: '0.78rem' }}>· {order.invoiceNumber}</span>}</div>
          <div style={{ fontSize: '0.75rem', color: colors.muted }}>{formatDate(order.createdAt) || order.date} · {order.paymentMethod} · {order.paymentStatus}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <StatusBadge status={current} />
          <span style={{ fontWeight: 800, color: colors.wine }}>{money(order.total)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
        <div style={{ fontSize: '0.82rem', color: colors.text, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800 }}>{order.user}</div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
            <MapPin size={13} style={{ marginTop: 3, flexShrink: 0, color: colors.gold }} />
            <span>{[a.street, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ')}</span>
          </div>
          {order.phone && (
            <a href={`tel:${order.phone}`} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', color: colors.wine, fontWeight: 700 }}>
              <Phone size={13} /> {order.phone}
            </a>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {(order.itemsList || []).map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
              <ProductThumb src={it.image} size={32} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{it.name}</b>
                <span style={{ color: colors.muted }}> · {variantLabel({ variant: it.size, color: it.color })}</span>
              </span>
              <b>× {it.qty || it.quantity || 1}</b>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ color: colors.red, fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}

      {isOpen(order) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
          {next && <Button loading={busy === 'next'} disabled={!!busy} onClick={advance}><CheckCircle2 size={14} /> {STEP_LABEL[next]}</Button>}
          {!['Shipped', 'Delivered'].includes(order.status) && (
            <Button variant="danger" loading={busy === 'reject'} disabled={!!busy} onClick={reject}><Ban size={14} /> Can't fulfil</Button>
          )}
        </div>
      )}
    </Card>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setMsg({ ok: false, text: 'New passwords do not match' });
    setSaving(true);
    try {
      await api('/vendors/me/password', { method: 'PUT', body: form });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ ok: true, text: 'Password updated' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxWidth: 360 }}>
      {[['currentPassword', 'Current password'], ['newPassword', 'New password'], ['confirm', 'Confirm new password']].map(([k, l]) => (
        <div key={k}>
          <label style={labelStyle}>{l}</label>
          <input type="password" required value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={inputStyle} />
        </div>
      ))}
      {msg && <div style={{ fontSize: '0.82rem', color: msg.ok ? colors.green : colors.red }}>{msg.text}</div>}
      <Button type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}><KeyRound size={14} /> Update password</Button>
    </form>
  );
}

export default function VendorDashboardPage() {
  const { logout, user } = useAuth();

  // Help & guided tour: the tour starts by itself the first time each vendor opens the dashboard
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const tourSeenKey = `daivika_tour_seen_vendor_${user?._id || user?.id || 'vendor'}`;
  useEffect(() => {
    if (!user) return undefined;
    try {
      if (!localStorage.getItem(tourSeenKey)) {
        const t = setTimeout(() => setTourOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
    return undefined;
  }, [user, tourSeenKey]);
  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem(tourSeenKey, new Date().toISOString()); } catch {}
  };
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState('orders');
  const [orderFilter, setOrderFilter] = useState('open');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadMe = useCallback(async () => {
    try { setMe(await api('/vendors/me')); } catch (err) { setError(err.message); }
  }, []);

  const loadOrders = useCallback(async () => {
    try { setOrders(await api('/vendors/me/orders')); } catch (err) { setOrders(o => o || []); if (!/disabled/i.test(err.message)) setError(err.message); }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMe(), loadOrders()]);
    setRefreshing(false);
  }, [loadMe, loadOrders]);

  useEffect(() => {
    refresh();
    const t = setInterval(loadOrders, 30000);
    return () => clearInterval(t);
  }, [refresh, loadOrders]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const vendor = me?.vendor;
  const stats = me?.stats || {};
  const allOrders = orders || [];
  const openOrders = allOrders.filter(isOpen);
  const shownOrders = orderFilter === 'open' ? openOrders : allOrders;
  const newCount = allOrders.filter(o => o.vendorStatus === 'Assigned' && o.status === 'Processing').length;

  const tabs = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: newCount || null },
    { id: 'stock', label: 'Products & Stock', icon: Boxes },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'account', label: 'Account', icon: Store },
    { id: 'help', label: 'Help', icon: LifeBuoy },
  ];
  const tabLabels = Object.fromEntries(tabs.map(t => [t.id, t.label]));

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: '"Poppins", sans-serif', color: colors.text }}>
      <GuidedTour steps={HELP.vendor.tour} open={tourOpen} onClose={closeTour} onNavigate={setTab} />
      <HelpDrawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        audience="vendor"
        initialGuideId={guideForTab('vendor', tab).id}
        onNavigate={setTab}
        onStartTour={() => setTourOpen(true)}
        tabLabels={tabLabels}
      />
      <header style={{ background: `linear-gradient(135deg, ${colors.wine} 0%, ${colors.wineSoft} 100%)`, color: '#fff', padding: '1rem 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#fde68a', fontWeight: 700 }}>Daivika Vendor</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{vendor ? (vendor.businessName || vendor.name) : 'Loading...'}</div>
            {vendor && <div style={{ fontSize: '0.78rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {vendor.district}, {vendor.state}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} aria-label="Help for this page" title="Help for this page">?</Button>
            <Button variant="outline" size="sm" loading={refreshing} onClick={refresh} data-tour="vendor-refresh">{!refreshing && <RefreshCw size={13} />} Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut size={13} /> Logout</Button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem 16px 3rem', boxSizing: 'border-box' }}>
        {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.7rem 0.9rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        {vendor && !vendor.isActive ? (
          <Card style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <AlertTriangle size={36} color={colors.gold} />
            <h2 style={{ margin: '0.75rem 0 0.4rem', fontSize: '1.2rem' }}>Your vendor account is paused</h2>
            <p style={{ color: colors.muted, fontSize: '0.9rem', margin: 0 }}>You won't receive new orders until the Daivika admin turns your account back on.</p>
          </Card>
        ) : (
          <>
            <div data-tour="vendor-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <StatCard label="New orders" value={newCount} icon={ShoppingCart} tone={colors.gold} />
              <StatCard label="Open orders" value={openOrders.length} icon={Package} />
              <StatCard label="Units in stock" value={stats.units ?? '—'} icon={Boxes} tone={colors.green} />
              <StatCard label="Products" value={stats.products ?? '—'} icon={Store} tone="#1e40af" />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: 2 }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  data-tour={`vendor-tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontWeight: 700, fontSize: '0.85rem',
                    background: tab === t.id ? colors.wine : '#fff',
                    color: tab === t.id ? '#fff' : colors.text,
                    border: `1px solid ${tab === t.id ? colors.wine : colors.border}`,
                  }}
                >
                  <t.icon size={15} /> {t.label}
                  {t.badge && <span style={{ background: colors.gold, color: '#fff', borderRadius: '999px', fontSize: '0.68rem', padding: '0 0.45rem' }}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {tab === 'orders' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[['open', `Open (${openOrders.length})`], ['all', `All (${allOrders.length})`]].map(([id, label]) => (
                    <Button key={id} size="sm" variant={orderFilter === id ? 'primary' : 'outline'} onClick={() => setOrderFilter(id)}>{label}</Button>
                  ))}
                </div>
                {orders === null ? (
                  <Card><EmptyState title="Loading orders..." text="" /></Card>
                ) : shownOrders.length === 0 ? (
                  <Card><EmptyState title="No orders here" text="Orders from customers near you will show up here automatically when you have the stock." /></Card>
                ) : shownOrders.map(o => <OrderCard key={o._id} order={o} onUpdated={refresh} />)}
              </div>
            )}

            {tab === 'stock' && <VendorStockManager basePath="/vendors/me" onChange={loadMe} />}

            {tab === 'reports' && <ReportsPanel mode="vendor" />}

            {tab === 'help' && <HelpCenter audience="vendor" onNavigate={setTab} onStartTour={() => setTourOpen(true)} tabLabels={tabLabels} />}

            {tab === 'account' && vendor && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <Card>
                  <div style={{ fontWeight: 800, marginBottom: '0.6rem' }}>Store details</div>
                  {[['Contact', vendor.name], ['Business', vendor.businessName], ['Email', vendor.email], ['Phone', vendor.phone], ['Address', vendor.address], ['District', `${vendor.district}, ${vendor.state}`], ['PIN', vendor.pincode]]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: `1px dashed ${colors.border}` }}>
                        <span style={{ width: 80, color: colors.muted, flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  <div style={{ fontSize: '0.75rem', color: colors.muted, marginTop: '0.6rem' }}>To change these details, contact the Daivika admin.</div>
                </Card>
                <Card>
                  <div style={{ fontWeight: 800, marginBottom: '0.6rem' }}>Change password</div>
                  <PasswordForm />
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
