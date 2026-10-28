'use client';

// Shared building blocks for the vendor dashboard and the admin Vendors panel
import React, { useState } from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { getSafeImageUrl } from '@/lib/image-optimizer';

export const colors = {
  wine: '#360910',
  wineSoft: '#5c1520',
  gold: '#c5831a',
  cream: '#fdf8f0',
  border: '#ead9c0',
  text: '#1f1410',
  muted: '#7a6a5c',
  green: '#15803d',
  red: '#b91c1c',
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vaugun_token') : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
}

export const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  color: '#111827',
  outline: 'none',
  fontSize: '0.88rem',
  boxSizing: 'border-box',
};

export const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.35rem' };

export function Button({ children, variant = 'primary', size = 'md', loading, style, ...props }) {
  const variants = {
    primary: { background: colors.wine, color: '#fff', border: `1px solid ${colors.wine}` },
    gold: { background: colors.gold, color: '#fff', border: `1px solid ${colors.gold}` },
    outline: { background: '#fff', color: colors.wine, border: `1px solid ${colors.border}` },
    danger: { background: '#fff', color: colors.red, border: '1px solid #fecaca' },
    ghost: { background: 'transparent', color: colors.muted, border: '1px solid transparent' },
  };
  const sizes = {
    sm: { padding: '0.35rem 0.7rem', fontSize: '0.75rem' },
    md: { padding: '0.55rem 1rem', fontSize: '0.85rem' },
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: '6px',
        fontWeight: 700,
        cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '1rem', ...style }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = colors.wine }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      {Icon && (
        <div style={{ width: 40, height: 40, borderRadius: '8px', background: `${tone}14`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: colors.text, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: colors.muted, fontWeight: 600 }}>{label}</div>
      </div>
    </Card>
  );
}

const statusTones = {
  Assigned: ['#fef3c7', '#92400e'],
  Accepted: ['#e0f2fe', '#075985'],
  Processing: ['#fef3c7', '#92400e'],
  Packed: ['#ede9fe', '#5b21b6'],
  Shipped: ['#dbeafe', '#1e40af'],
  Delivered: ['#dcfce7', '#166534'],
  Cancelled: ['#fee2e2', '#991b1b'],
  'Main store': ['#f3f4f6', '#374151'],
};

export function StatusBadge({ status }) {
  const [bg, fg] = statusTones[status] || ['#f3f4f6', '#374151'];
  return (
    <span style={{ background: bg, color: fg, fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
      {status || '—'}
    </span>
  );
}

export function ProductThumb({ src, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '6px', overflow: 'hidden', background: '#f5efe6', flexShrink: 0 }}>
      {src && <img src={getSafeImageUrl(src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: colors.muted }}>
      <div style={{ fontWeight: 800, color: colors.text, marginBottom: '0.3rem' }}>{title}</div>
      <div style={{ fontSize: '0.85rem' }}>{text}</div>
    </div>
  );
}

// Inline stock editor for one variant row: −/+ buttons and a number box, saved on blur/Enter
export function StockStepper({ value, onSave, disabled }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [saving, setSaving] = useState(false);
  React.useEffect(() => { setDraft(String(value ?? 0)); }, [value]);

  const commit = async (next) => {
    const n = Math.max(0, parseInt(next, 10) || 0);
    setDraft(String(n));
    if (n === value) return;
    setSaving(true);
    try { await onSave(n); } finally { setSaving(false); }
  };

  const btn = { width: 28, height: 30, border: `1px solid ${colors.border}`, background: '#fff', color: colors.wine, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
      <button type="button" disabled={disabled || saving} onClick={() => commit((value || 0) - 1)} style={{ ...btn, borderRadius: '6px 0 0 6px' }} aria-label="Decrease stock"><Minus size={12} /></button>
      <input
        type="number"
        min="0"
        value={draft}
        disabled={disabled || saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ width: 58, height: 30, border: `1px solid ${colors.border}`, borderLeft: 'none', borderRight: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
      />
      <button type="button" disabled={disabled || saving} onClick={() => commit((value || 0) + 1)} style={{ ...btn, borderRadius: '0 6px 6px 0' }} aria-label="Increase stock"><Plus size={12} /></button>
    </div>
  );
}

export const variantLabel = (r) => [r.variant, r.color].filter(Boolean).join(' / ') || 'Standard';

export const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
