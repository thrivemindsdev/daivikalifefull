'use client';

import React from 'react';

// GST rate and HSN code inputs for the add / edit product forms (printed on invoices).
// Prices are taken as GST-inclusive: the invoice splits the GST out of the selling price.
export const GST_RATES = [0, 3, 5, 12, 18, 28];

const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const fieldStyle = { width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '0.85rem', backgroundColor: '#fff', color: '#111827', boxSizing: 'border-box' };

export default function GstFields({ rate, onRateChange, hsn, onHsnChange, accent = '#a67c52' }) {
  const focus = (e) => { e.target.style.borderColor = accent; };
  const blur = (e) => { e.target.style.borderColor = '#d1d5db'; };
  return (
    <>
      <div>
        <label style={labelStyle}>GST Rate (%)</label>
        <select value={rate === null || rate === undefined ? '' : String(rate)} onChange={(e) => onRateChange(e.target.value)} style={fieldStyle} onFocus={focus} onBlur={blur}>
          <option value="">Not set</option>
          {GST_RATES.map(r => <option key={r} value={String(r)}>{r}%</option>)}
        </select>
        <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.35rem' }}>The price includes this GST. The invoice shows the GST split.</div>
      </div>
      <div>
        <label style={labelStyle}>HSN Code</label>
        <input type="text" inputMode="numeric" maxLength={20} placeholder="e.g. 7117" value={hsn || ''} onChange={(e) => onHsnChange(e.target.value.replace(/[^0-9A-Za-z ]/g, ''))} style={fieldStyle} onFocus={focus} onBlur={blur} />
      </div>
    </>
  );
}
