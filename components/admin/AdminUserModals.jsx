'use client';

// Manage Users: creating sub-users with only the sections they need, and the customer details view.
import React, { useEffect, useState } from 'react';
import { X, ChevronDown, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { API_BASE_URL, getHeaders } from '@/config';
import { orderNo } from '@/lib/orders-excel';

// Same keys as App\Services\Permissions on the server; each one is a dashboard tab
export const PERMISSION_SECTIONS = [
  ['overview', 'Dashboard'],
  ['orders', 'Orders List'],
  ['products', 'Products'],
  ['product-groups', 'Product Groups'],
  ['stock', 'Stock Control'],
  ['vendors', 'Vendors'],
  ['categories', 'Categories'],
  ['sizes', 'Manage Sizes'],
  ['users', 'Manage Users (view customers)'],
  ['reports', 'Reports & Analytics'],
  ['coupons', 'Coupons'],
  ['free-gift', 'Free Gift Offer'],
  ['product-reviews', 'Product Reviews'],
  ['leads-inbox', 'Leads Inbox'],
  ['invoice-control', 'Invoice Control'],
  ['shipping-control', 'Shipping Control'],
  ['site-control', 'Hero Banners & Branding'],
  ['meta-ads', 'Meta Ads & Pixel'],
  ['broadcast', 'Broadcast System'],
  ['settings', 'Settings (COD)'],
];

const overlay = { position: 'fixed', inset: 0, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
const panel = { backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem', boxSizing: 'border-box' };
const label = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' };
const input = { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: '#111827' };
const closeBtn = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem', display: 'flex' };

const Header = ({ title, onClose }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>{title}</h3>
    <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}><X size={18} /></button>
  </div>
);

function PermissionDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (key) => onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  const allSelected = selected.length === PERMISSION_SECTIONS.length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ ...input, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
      >
        <span>{selected.length ? `${selected.length} section${selected.length > 1 ? 's' : ''} selected` : 'Choose sections'}</span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '6px', maxHeight: '220px', overflowY: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            <input type="checkbox" checked={allSelected} onChange={() => onChange(allSelected ? [] : PERMISSION_SECTIONS.map(([k]) => k))} />
            Select all
          </label>
          {PERMISSION_SECTIONS.map(([key, name]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem', color: '#111827', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
              {name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// `account` given: change that account's sections. Otherwise: create a new sub-user.
export function SubUserModal({ account, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [permissions, setPermissions] = useState(Array.isArray(account?.permissions) ? account.permissions : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const send = async (url, method, body) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not save. Please try again.');
      onSaved(json.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!permissions.length) {
      setError('Tick at least one section.');
      return;
    }
    if (account) send(`/admin/users/${account._id}/permissions`, 'PUT', { permissions });
    else send('/admin/users', 'POST', { ...form, permissions });
  };

  return (
    <div style={overlay} onClick={onClose}>
      <form style={{ ...panel, maxWidth: '440px' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <Header title={account ? `Permissions: ${account.name}` : 'Create Sub-user'} onClose={onClose} />
        {!account && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><label style={label}>Name</label><input required style={input} value={form.name} onChange={set('name')} autoComplete="off" /></div>
            <div><label style={label}>Mobile number (used to log in)</label><input required type="tel" inputMode="numeric" style={input} value={form.phone} onChange={set('phone')} autoComplete="off" /></div>
            <div><label style={label}>Email (optional)</label><input type="email" style={input} value={form.email} onChange={set('email')} autoComplete="off" /></div>
            <div><label style={label}>Password (min. 6 characters)</label><input required type="password" minLength={6} style={input} value={form.password} onChange={set('password')} autoComplete="new-password" /></div>
          </div>
        )}
        <label style={label}>Sections this user can see</label>
        <PermissionDropdown selected={permissions} onChange={setPermissions} />
        {error && <div role="alert" style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.6rem' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {account?.role === 'staff' ? (
            <button type="button" disabled={busy} onClick={() => send(`/admin/users/${account._id}/permissions`, 'PUT', { revoke: true })} style={{ padding: '0.55rem 0.9rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#ffffff', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              Remove access
            </button>
          ) : <span />}
          <button type="submit" disabled={busy} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: 'none', backgroundColor: '#111827', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {busy && <Loader2 size={14} className="animate-spin" />} {account ? 'Save' : 'Create Sub-user'}
          </button>
        </div>
      </form>
    </div>
  );
}

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export function CustomerDetailsModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/users/${userId}`, { headers: getHeaders() })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || 'Could not load this customer.');
        setData(json.data);
      })
      .catch((err) => setError(err.message));
  }, [userId]);

  const orders = data?.orders || [];
  const spent = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const addresses = [...new Set(orders.map(o => {
    const a = o.address || {};
    return [a.street, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ');
  }).filter(Boolean))];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...panel, maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <Header title="Customer Details" onClose={onClose} />
        {error && <div role="alert" style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>}
        {!data && !error && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 size={22} className="animate-spin" /></div>}
        {data && (
          <>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{data.user.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '0.4rem 0 1rem', fontSize: '0.85rem', color: '#4b5563' }}>
              {data.user.phone && <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}><Phone size={13} /> {data.user.phone}</span>}
              {data.user.email && <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', wordBreak: 'break-all' }}><Mail size={13} /> {data.user.email}</span>}
              <span>Joined {new Date(data.user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {[['Orders', orders.length], ['Total spent', money(spent)]].map(([name, value]) => (
                <div key={name} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>{value}</div>
                </div>
              ))}
            </div>

            {addresses.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>Delivery addresses</div>
                {addresses.map(a => (
                  <div key={a} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.82rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                    <MapPin size={13} style={{ flexShrink: 0, marginTop: 3 }} /> {a}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>Order history</div>
            {orders.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>No orders yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {orders.map(o => (
                  <div key={o._id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontWeight: 700, color: '#111827' }}>
                      <span>#{orderNo(o)}</span>
                      <span>{money(o.total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', color: '#6b7280', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      <span>{o.date} · {o.paymentMethod}</span>
                      <span>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
