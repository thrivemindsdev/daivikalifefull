'use client';

// A vendor's product list + per-variant stock editing. Used by the vendor
// dashboard (basePath '/vendors/me') and by the admin (basePath '/vendors/:id').
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Trash2, Eye, EyeOff, PackagePlus, X } from 'lucide-react';
import {
  api, colors, inputStyle, Button, Card, ProductThumb, EmptyState, StockStepper, variantLabel, money,
} from './VendorUI';

export default function VendorStockManager({ basePath, onChange, readOnly = false }) {
  const [data, setData] = useState({ products: [], catalog: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await api(`${basePath}/products`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const changed = async () => { await load(); onChange?.(); };

  const saveStock = async (productId, row, stock) => {
    try {
      await api(`${basePath}/stock`, { method: 'PUT', body: { productId, variant: row.variant, color: row.color, stock } });
      setData(d => ({
        ...d,
        products: d.products.map(p => p.productId !== productId ? p : {
          ...p,
          rows: p.rows.map(r => (r.variant === row.variant && r.color === row.color ? { ...r, stock } : r)),
          totalStock: p.rows.reduce((s, r) => s + (r.isActive ? (r.variant === row.variant && r.color === row.color ? stock : r.stock) : 0), 0),
        }),
      }));
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleProduct = async (p) => {
    setBusy(p.productId);
    try {
      await api(`${basePath}/stock`, { method: 'PUT', body: { productId: p.productId, isActive: !p.isActive } });
      await changed();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const removeProduct = async (p) => {
    if (!window.confirm(`Remove "${p.name}" and its stock from this vendor?`)) return;
    setBusy(p.productId);
    try {
      await api(`${basePath}/products/${p.productId}`, { method: 'DELETE' });
      await changed();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const addProduct = async (productId) => {
    setBusy(productId);
    try {
      await api(`${basePath}/products`, { method: 'POST', body: { productId } });
      await changed();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  };

  const q = query.trim().toLowerCase();
  const products = data.products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));
  const cq = catalogQuery.trim().toLowerCase();
  const catalog = data.catalog.filter(p => !cq || p.name.toLowerCase().includes(cq) || (p.code || '').toLowerCase().includes(cq) || (p.category || '').toLowerCase().includes(cq));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search my products..." style={{ ...inputStyle, paddingLeft: '2rem' }} />
        </div>
        {!readOnly && (
          <Button variant={showCatalog ? 'outline' : 'primary'} onClick={() => setShowCatalog(s => !s)}>
            {showCatalog ? <><X size={14} /> Close</> : <><PackagePlus size={14} /> Add products</>}
          </Button>
        )}
      </div>

      {error && <div style={{ background: '#fef2f2', color: colors.red, padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>{error}</div>}

      {showCatalog && (
        <Card style={{ background: colors.cream }}>
          <div style={{ fontWeight: 800, color: colors.wine, marginBottom: '0.6rem' }}>Add products from the Daivika catalog</div>
          <input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder="Search catalog by name, code or category..." style={{ ...inputStyle, marginBottom: '0.6rem' }} />
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {catalog.length === 0 ? (
              <EmptyState title="Nothing to add" text={data.catalog.length ? 'No catalog products match your search.' : 'All catalog products are already in your list.'} />
            ) : catalog.map(p => (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '0.5rem 0.6rem' }}>
                <ProductThumb src={p.image} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '0.72rem', color: colors.muted }}>{[p.code, p.category, money(p.price), `${p.variants} variant${p.variants === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</div>
                </div>
                <Button size="sm" loading={busy === p._id} onClick={() => addProduct(p._id)}><Plus size={12} /> Add</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <EmptyState title="Loading stock..." text="" />
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            title={data.products.length ? 'No products match your search' : 'No products yet'}
            text={data.products.length ? '' : readOnly ? 'This vendor has not added any products.' : 'Use "Add products" to pick the catalog items you have in stock, then enter quantities.'}
          />
        </Card>
      ) : products.map(p => (
        <Card key={p.productId} style={{ opacity: p.isActive ? 1 : 0.65 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <ProductThumb src={p.image} />
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: colors.text }}>{p.name}</div>
              <div style={{ fontSize: '0.74rem', color: colors.muted }}>
                {[p.code, p.category, money(p.price)].filter(Boolean).join(' · ')}
                {p.missing && <span style={{ color: colors.red, fontWeight: 700 }}> · removed from catalog</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: p.totalStock > 0 ? colors.green : colors.red }}>{p.totalStock}</div>
              <div style={{ fontSize: '0.68rem', color: colors.muted, fontWeight: 600 }}>{p.isActive ? 'in stock' : 'hidden'}</div>
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <Button size="sm" variant="outline" loading={busy === p.productId} onClick={() => toggleProduct(p)} title={p.isActive ? 'Stop selling this product' : 'Start selling this product'}>
                  {p.isActive ? <><EyeOff size={12} /> Pause</> : <><Eye size={12} /> Resume</>}
                </Button>
                <Button size="sm" variant="danger" onClick={() => removeProduct(p)} aria-label="Remove product"><Trash2 size={12} /></Button>
              </div>
            )}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.5rem' }}>
            {p.rows.map(r => (
              <div key={`${r.variant}|${r.color}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: colors.cream, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '0.4rem 0.5rem 0.4rem 0.7rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{variantLabel(r)}</span>
                {readOnly ? <b>{r.stock}</b> : <StockStepper value={r.stock} onSave={(n) => saveStock(p.productId, r, n)} />}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
