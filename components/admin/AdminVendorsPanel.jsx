'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Store, Plus, Pencil, Trash2, Boxes, X, MapPin, Search, Route, Settings2, ChevronDown, ChevronUp, Power, Users,
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { INDIAN_STATES, getDistricts } from '@/lib/india-districts';
import {
  api, colors, inputStyle, labelStyle, Button, Card, StatCard, StatusBadge, EmptyState, ProductThumb, formatDate, money,
} from '@/components/vendor/VendorUI';
import VendorStockManager from '@/components/vendor/VendorStockManager';
import usePincodeLookup from '@/hooks/usePincodeLookup';

const emptyForm = { name: '', businessName: '', email: '', phone: '', password: '', state: '', district: '', address: '', pincode: '', notes: '', isActive: true };

function Modal({ title, onClose, children, width = 640 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,10,10,0.55)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: width, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', background: colors.cream, borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', background: colors.wine, color: '#fff' }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.1rem' }}>{children}</div>
      </div>
    </div>
  );
}

function VendorForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(isEdit ? { ...emptyForm, ...initial, password: '' } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const pin = usePincodeLookup();

  // A full PIN code fills in the vendor's state and district (both stay editable)
  const handlePincode = (value) => {
    const code = value.replace(/\D/g, '').slice(0, 6);
    setForm(f => ({ ...f, pincode: code }));
    pin.lookup(code, (found) => {
      if (found.state) setForm(f => ({ ...f, state: found.state, district: found.district || '' }));
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.state || !form.district) return setError('Select the vendor\'s state and district.');
    if (!isEdit && form.password.length < 6) return setError('Password must be at least 6 characters.');
    setSaving(true);
    try {
      const body = { ...form };
      if (isEdit && !body.password) delete body.password;
      const saved = isEdit
        ? await api(`/vendors/${initial.id}`, { method: 'PUT', body })
        : await api('/vendors', { method: 'POST', body });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (k, label, props = {}) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={form[k]} onChange={set(k)} style={inputStyle} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div className="responsive-grid-2" style={{ gap: '0.8rem' }}>
        {field('name', 'Contact person *', { required: true, placeholder: 'Full name' })}
        {field('businessName', 'Shop / business name', { placeholder: 'e.g. Malappuram Textiles' })}
      </div>
      {/* Address and PIN code first: the PIN code fills in the state and district */}
      <div className="responsive-grid-2" style={{ gap: '0.8rem' }}>
        {field('address', 'Shop address', { placeholder: 'Building, street, town' })}
        <div>
          <label style={labelStyle}>PIN code</label>
          <input value={form.pincode} onChange={(e) => handlePincode(e.target.value)} style={inputStyle} inputMode="numeric" maxLength={6} placeholder="676505" />
          {pin.message && <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: pin.status === 'error' ? colors.red : colors.muted }}>{pin.message}</div>}
        </div>
      </div>
      <div className="responsive-grid-2" style={{ gap: '0.8rem' }}>
        <div>
          <label style={labelStyle}>State *</label>
          <SearchableSelect value={form.state} onChange={(st) => setForm(f => ({ ...f, state: st, district: st === f.state ? f.district : '' }))} options={INDIAN_STATES} placeholder="Select state" searchPlaceholder="Search state..." />
        </div>
        <div>
          <label style={labelStyle}>District *</label>
          <SearchableSelect value={form.district} onChange={set('district')} options={getDistricts(form.state)} placeholder="Select district" searchPlaceholder="Search district..." disabled={!form.state} disabledText="Select state first" />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '0.8rem', fontWeight: 800, color: colors.wine, fontSize: '0.85rem' }}>
        Login details <span style={{ fontWeight: 500, color: colors.muted }}>— the vendor logs in at /login with this mobile number and password</span>
      </div>
      <div className="responsive-grid-2" style={{ gap: '0.8rem' }}>
        {field('phone', 'Mobile number *', { inputMode: 'tel', placeholder: '9876543210' })}
        {field('email', 'Email (optional)', { type: 'email', placeholder: 'vendor@example.com' })}
      </div>
      {field('password', isEdit ? 'New password (leave empty to keep current)' : 'Password *', { type: 'text', autoComplete: 'new-password', placeholder: 'At least 6 characters' })}

      <div>
        <label style={labelStyle}>Admin notes</label>
        <textarea value={form.notes} onChange={set('notes')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active (receives orders and can log in to the dashboard)
      </label>

      {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Create vendor'}</Button>
      </div>
    </form>
  );
}

// ── Vendors list ───────────────────────────────────────────

function VendorsSection({ vendors, reload }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | vendor
  const [stockFor, setStockFor] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const toggle = async (v) => {
    setBusy(v.id);
    try { await api(`/vendors/${v.id}`, { method: 'PUT', body: { isActive: !v.isActive } }); await reload(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const remove = async (v) => {
    if (!window.confirm(`Delete vendor "${v.businessName || v.name}"? Their login and stock records will be removed.`)) return;
    setBusy(v.id);
    try { await api(`/vendors/${v.id}`, { method: 'DELETE' }); await reload(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const q = query.trim().toLowerCase();
  const shown = vendors.filter(v => !q || [v.name, v.businessName, v.district, v.state, v.email, v.phone].some(x => (x || '').toLowerCase().includes(q)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vendors by name, district, phone..." style={{ ...inputStyle, paddingLeft: '2rem' }} />
        </div>
        <Button onClick={() => setEditing({})}><Plus size={14} /> Add vendor</Button>
      </div>
      {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>{error}</div>}

      {shown.length === 0 ? (
        <Card><EmptyState title={vendors.length ? 'No vendors match your search' : 'No vendors yet'} text={vendors.length ? '' : 'Add your first vendor. Orders near their district will be sent to them automatically.'} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {shown.map(v => (
            <Card key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: v.isActive ? 1 : 0.7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: colors.text }}>{v.businessName || v.name}</div>
                  <div style={{ fontSize: '0.75rem', color: colors.muted }}>{v.businessName ? v.name : ''}</div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px', height: 'fit-content', background: v.isActive ? '#dcfce7' : '#f3f4f6', color: v.isActive ? '#166534' : '#6b7280' }}>
                  {v.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} color={colors.gold} /> {v.district}, {v.state}</div>
              <div style={{ fontSize: '0.75rem', color: colors.muted }}>Login: {[v.email, v.phone].filter(Boolean).join(' / ')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', textAlign: 'center' }}>
                {[['Products', v.stats?.products], ['Units', v.stats?.units], ['Open orders', v.stats?.openOrders]].map(([l, n]) => (
                  <div key={l} style={{ background: colors.cream, borderRadius: '6px', padding: '0.35rem' }}>
                    <div style={{ fontWeight: 800 }}>{n ?? 0}</div>
                    <div style={{ fontSize: '0.65rem', color: colors.muted, fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                <Button size="sm" onClick={() => setStockFor(v)}><Boxes size={12} /> Stock</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(v)}><Pencil size={12} /> Edit</Button>
                <Button size="sm" variant="outline" loading={busy === v.id} onClick={() => toggle(v)}><Power size={12} /> {v.isActive ? 'Pause' : 'Activate'}</Button>
                <Button size="sm" variant="danger" onClick={() => remove(v)} aria-label="Delete vendor"><Trash2 size={12} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? `Edit ${editing.businessName || editing.name}` : 'Add vendor'} onClose={() => setEditing(null)}>
          <VendorForm initial={editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} />
        </Modal>
      )}
      {stockFor && (
        <Modal title={`Stock — ${stockFor.businessName || stockFor.name}`} width={900} onClose={() => { setStockFor(null); reload(); }}>
          <VendorStockManager basePath={`/vendors/${stockFor.id}`} />
        </Modal>
      )}
    </div>
  );
}

// ── Stock overview ─────────────────────────────────────────

function StockOverviewSection() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api('/vendors/stock-overview').then(setData).catch(err => setError(err.message)); }, []);

  if (error) return <Card><div style={{ color: colors.red }}>{error}</div></Card>;
  if (!data) return <Card><EmptyState title="Loading stock..." text="" /></Card>;

  const q = query.trim().toLowerCase();
  const products = data.products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));
  const cell = { padding: '0.5rem 0.6rem', borderBottom: `1px solid ${colors.border}`, fontSize: '0.8rem', textAlign: 'center', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." style={inputStyle} />
      <Card style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ background: colors.cream }}>
              <th style={{ ...cell, textAlign: 'left' }}>Product</th>
              <th style={cell}>Main store</th>
              {data.vendors.map(v => <th key={v.id} style={{ ...cell, color: v.isActive ? colors.text : colors.muted }}>{v.name}</th>)}
              <th style={cell}>Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const vendorTotal = data.vendors.filter(v => v.isActive).reduce((s, v) => s + (p.vendorStock[v.id] || 0), 0);
              return (
                <tr key={p._id}>
                  <td style={{ ...cell, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ProductThumb src={p.image} size={30} />
                      <span style={{ fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={cell}>{p.mainStock}</td>
                  {data.vendors.map(v => (
                    <td key={v.id} style={{ ...cell, color: p.vendorStock[v.id] === undefined ? '#cbd5e1' : colors.text }}>
                      {p.vendorStock[v.id] === undefined ? '—' : p.vendorStock[v.id]}
                    </td>
                  ))}
                  <td style={{ ...cell, fontWeight: 800 }}>{p.mainStock + vendorTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && <EmptyState title="No products" text="" />}
      </Card>
      <div style={{ fontSize: '0.75rem', color: colors.muted }}>
        Main store stock is managed in "Stock Control". Use a vendor's "Stock" button to change their quantities. Paused vendors' stock is not counted in the total or shown to customers.
      </div>
    </div>
  );
}

// ── Order routing ──────────────────────────────────────────

function OrdersSection({ vendors }) {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('open');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [expanded, setExpanded] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api('/vendors/orders').then(setOrders).catch(err => setError(err.message)), []);
  useEffect(() => { load(); }, [load]);

  const reroute = async (orderId, target) => {
    setBusy(orderId); setError('');
    try {
      const updated = await api(`/vendors/orders/${orderId}/route`, { method: 'PUT', body: { target } });
      setOrders(list => list.map(o => (o._id === orderId ? updated : o)));
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  if (!orders) return <Card><EmptyState title={error || 'Loading orders...'} text="" /></Card>;

  const shown = orders.filter(o =>
    (filter === 'all' || !['Delivered', 'Cancelled'].includes(o.status)) &&
    (vendorFilter === 'all' || (vendorFilter === 'main' ? !o.vendorId : o.vendorId === vendorFilter)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="sm" variant={filter === 'open' ? 'primary' : 'outline'} onClick={() => setFilter('open')}>Open</Button>
        <Button size="sm" variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => setFilter('all')}>All</Button>
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
          <option value="all">All fulfilment</option>
          <option value="main">Main store</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.businessName || v.name}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
      </div>
      {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>{error}</div>}

      {shown.length === 0 ? <Card><EmptyState title="No orders" text="" /></Card> : shown.map(o => {
        const a = o.address || {};
        const open = expanded === o._id;
        return (
          <Card key={o._id} style={{ padding: '0.75rem 0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>#{o._id} <span style={{ color: colors.muted, fontWeight: 600, fontSize: '0.75rem' }}>{formatDate(o.createdAt) || o.date}</span></div>
                <div style={{ fontSize: '0.78rem', color: colors.muted }}>
                  {o.user} · {money(o.total)} · <MapPin size={11} style={{ verticalAlign: '-1px' }} /> {a.district ? `${a.district}, ` : <span style={{ color: colors.red }}>no district, </span>}{a.state}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <StatusBadge status={o.status} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: o.vendorId ? colors.wine : colors.muted }}>
                  → {o.vendorName || (o.vendorStatus ? 'Main store' : 'Main store (not routed)')}
                </span>
              </div>
              <select
                value=""
                disabled={busy === o._id}
                onChange={e => e.target.value && reroute(o._id, e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
              >
                <option value="">Re-assign...</option>
                <option value="auto">Nearest vendor with stock</option>
                <option value="main">Main store</option>
                {vendors.filter(v => v.id !== o.vendorId).map(v => <option key={v.id} value={v.id}>{v.businessName || v.name} ({v.district}){v.isActive ? '' : ' — paused'}</option>)}
              </select>
              <button onClick={() => setExpanded(open ? '' : o._id)} aria-label="Toggle routing history" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted, display: 'flex' }}>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            {open && (
              <div style={{ marginTop: '0.6rem', borderTop: `1px dashed ${colors.border}`, paddingTop: '0.6rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div><b>Items:</b> {(o.itemsList || []).map(it => `${it.name || it.productId} (${[it.size, it.color].filter(Boolean).join('/') || 'std'}) ×${it.qty || it.quantity || 1}`).join(', ')}</div>
                <div><b>Routing history:</b></div>
                {o.routingLog.length === 0 ? <div style={{ color: colors.muted }}>Not routed — placed before the vendor system was switched on, or routing is off.</div> :
                  o.routingLog.map((e, i) => (
                    <div key={i} style={{ color: colors.text }}>
                      <span style={{ color: colors.muted }}>{formatDate(e.at)} · {e.actor}</span>{' '}
                      {e.rejectedBy ? <span style={{ color: colors.red }}>Rejected by {e.vendorName || 'vendor'}{e.note ? ` — "${e.note}"` : ''}</span>
                        : e.status ? <span>{e.vendorName} marked <b>{e.status}</b></span>
                        : <span>→ <b>{e.to}</b>{e.distanceKm !== null && e.distanceKm !== undefined ? ` (${e.distanceKm} km)` : ''}{e.note ? ` · ${e.note}` : ''}</span>}
                    </div>
                  ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Settings + route tester ────────────────────────────────

function SettingsSection() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [test, setTest] = useState({ state: '', district: '' });
  const [ranked, setRanked] = useState(null);

  useEffect(() => { api('/vendors/settings').then(setSettings).catch(err => setMsg(err.message)); }, []);

  const save = async (patch) => {
    setSaving(true); setMsg('');
    try { setSettings(await api('/vendors/settings', { method: 'PUT', body: patch })); setMsg('Saved'); }
    catch (err) { setMsg(err.message); } finally { setSaving(false); }
  };

  const runTest = async (state, district) => {
    setTest({ state, district });
    if (!state) return setRanked(null);
    setRanked(await api(`/vendors/preview-route?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district || '')}`).catch(() => []));
  };

  if (!settings) return <Card><EmptyState title={msg || 'Loading...'} text="" /></Card>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', alignItems: 'start' }}>
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontWeight: 800 }}>Automatic order routing</div>
        <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={settings.enabled} disabled={saving} onChange={e => save({ enabled: e.target.checked })} style={{ marginTop: 3 }} />
          <span>
            <b>Send new orders to the nearest vendor</b><br />
            <span style={{ color: colors.muted }}>The order goes to the closest active vendor (by the customer's district) who has stock for every item. If they don't, the next nearest is tried, and if nobody has it the order stays with the main store.</span>
          </span>
        </label>
        <div>
          <label style={labelStyle}>Maximum distance (km) — 0 means no limit</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="number" min="0" defaultValue={settings.maxDistanceKm} id="vendor-max-km" style={{ ...inputStyle, maxWidth: 140 }} />
            <Button variant="outline" loading={saving} onClick={() => save({ maxDistanceKm: document.getElementById('vendor-max-km').value })}>Save</Button>
          </div>
        </div>
        {settings.enabledAt && <div style={{ fontSize: '0.75rem', color: colors.muted }}>Routing applies to orders placed after {formatDate(settings.enabledAt)}.</div>}
        {msg && <div style={{ fontSize: '0.8rem', color: msg === 'Saved' ? colors.green : colors.red }}>{msg}</div>}
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div style={{ fontWeight: 800 }}>Test: which vendor is nearest?</div>
        <div className="responsive-grid-2" style={{ gap: '0.6rem' }}>
          <SearchableSelect value={test.state} onChange={(st) => runTest(st, '')} options={INDIAN_STATES} placeholder="Customer state" searchPlaceholder="Search state..." />
          <SearchableSelect value={test.district} onChange={(d) => runTest(test.state, d)} options={getDistricts(test.state)} placeholder="Customer district" searchPlaceholder="Search district..." disabled={!test.state} disabledText="Select state first" />
        </div>
        {ranked && (ranked.length === 0 ? <div style={{ fontSize: '0.82rem', color: colors.muted }}>No active vendors.</div> : (
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {ranked.map(r => (
              <li key={r.vendorId}><b>{r.name}</b> — {r.district}, {r.state} <span style={{ color: colors.muted }}>{r.distanceKm !== null ? `· ~${r.distanceKm} km` : ''}</span></li>
            ))}
          </ol>
        ))}
        <div style={{ fontSize: '0.72rem', color: colors.muted }}>Order of preference. Each vendor is used only if they have stock for the whole order.</div>
      </Card>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────

export default function AdminVendorsPanel() {
  const [section, setSection] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try { setVendors(await api('/vendors')); setError(''); } catch (err) { setError(err.message); } finally { setLoaded(true); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const totals = useMemo(() => vendors.reduce((t, v) => ({
    active: t.active + (v.isActive ? 1 : 0),
    units: t.units + (v.stats?.units || 0),
    open: t.open + (v.stats?.openOrders || 0),
  }), { active: 0, units: 0, open: 0 }), [vendors]);

  const sections = [
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'stock', label: 'Stock overview', icon: Boxes },
    { id: 'orders', label: 'Order routing', icon: Route },
    { id: 'settings', label: 'Routing settings', icon: Settings2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Poppins", sans-serif', color: colors.text }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <StatCard label="Vendors" value={vendors.length} icon={Store} />
        <StatCard label="Active vendors" value={totals.active} icon={Power} tone={colors.green} />
        <StatCard label="Units with vendors" value={totals.units} icon={Boxes} tone="#1e40af" />
        <StatCard label="Open vendor orders" value={totals.open} icon={Route} tone={colors.gold} />
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: 2 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: 700, fontSize: '0.82rem',
              background: section === s.id ? colors.wine : '#fff',
              color: section === s.id ? '#fff' : colors.text,
              border: `1px solid ${section === s.id ? colors.wine : colors.border}`,
            }}
          >
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>

      {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>{error}</div>}

      {!loaded ? <Card><EmptyState title="Loading vendors..." text="" /></Card> : (
        <>
          {section === 'vendors' && <VendorsSection vendors={vendors} reload={reload} />}
          {section === 'stock' && <StockOverviewSection />}
          {section === 'orders' && <OrdersSection vendors={vendors} />}
          {section === 'settings' && <SettingsSection />}
        </>
      )}
    </div>
  );
}
