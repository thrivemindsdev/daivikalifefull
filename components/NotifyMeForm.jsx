'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL, getHeaders } from '@/config';

// Shown on a sold-out product: the customer leaves a mobile number and is told when it is back in stock
export default function NotifyMeForm({ productId, variant = '', color = '', defaultPhone = '' }) {
  const [phone, setPhone] = useState(String(defaultPhone || '').replace(/\D/g, '').slice(-10));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // A different variant is a separate request
  useEffect(() => { setDone(false); setError(''); }, [productId, variant, color]);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/public/stock-notify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, variant, color, phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not save your request. Please try again.');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', marginTop: '0.75rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>
        <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> We will message +91 {phone} when this is back in stock.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fdf8f0', border: '1px solid #ead9c0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#360910', marginBottom: '0.5rem' }}>
        <Bell size={15} /> Notify me when it is back in stock
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          aria-label="Mobile number"
          placeholder="10-digit mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))}
          style={{ flex: '1 1 160px', minWidth: 0, height: '44px', padding: '0 0.85rem', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '16px', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{ flex: '0 0 auto', height: '44px', padding: '0 1.1rem', borderRadius: '10px', border: 'none', backgroundColor: '#360910', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {busy && <Loader2 size={14} className="animate-spin" />} Notify Me
        </button>
      </div>
      {error && <div role="alert" style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.4rem' }}>{error}</div>}
    </form>
  );
}
