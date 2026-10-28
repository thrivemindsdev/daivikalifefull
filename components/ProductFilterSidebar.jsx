'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Star, X } from 'lucide-react';

// Left-hand product filters (Amazon / Flipkart style). Purely presentational: the products page owns the filter
// state and passes in the options with their product counts.

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pfs-section">
      <button type="button" className="pfs-section-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }} />
      </button>
      {open && <div className="pfs-section-body">{children}</div>}
    </div>
  );
};

const Option = ({ type = 'radio', checked, onChange, label, count, disabled }) => (
  <label className={`pfs-option${disabled && !checked ? ' pfs-option-disabled' : ''}`}>
    <input type={type} checked={checked} onChange={onChange} disabled={disabled && !checked} />
    <span className="pfs-option-label">{label}</span>
    {count !== undefined && <span className="pfs-option-count">{count}</span>}
  </label>
);

const SIZE_PREVIEW = 8;

const ProductFilterSidebar = ({
  categories, activeCategory, onCategoryChange,
  subcategories = [], activeSubcategory = 'all', onSubcategoryChange,
  sizes, activeSize, onSizeChange,
  priceRanges, priceRange, priceMin, priceMax, onPriceRangeChange, onCustomPrice,
  discounts, minDiscount, onDiscountChange,
  ratings, minRating, onRatingChange,
  inStockCount, inStockOnly, onInStockChange,
  activeCount, onClearAll,
}) => {
  const [showAllSizes, setShowAllSizes] = useState(false);
  const [minInput, setMinInput] = useState(priceMin);
  const [maxInput, setMaxInput] = useState(priceMax);
  useEffect(() => { setMinInput(priceMin); setMaxInput(priceMax); }, [priceMin, priceMax]);

  const visibleSizes = showAllSizes ? sizes : sizes.slice(0, SIZE_PREVIEW);

  return (
    <div className="pfs-root">
      <div className="pfs-header">
        <span className="pfs-title">Filters</span>
        {activeCount > 0 && (
          <button type="button" className="pfs-clear" onClick={onClearAll}>Clear all ({activeCount})</button>
        )}
      </div>

      <Section title="Category">
        <Option checked={activeCategory === 'all'} onChange={() => onCategoryChange('all')} label="All Categories" />
        {categories.map(c => {
          const selected = activeCategory.toLowerCase() === c.name.toLowerCase();
          return (
            <React.Fragment key={c.name}>
              <Option
                checked={selected}
                onChange={() => onCategoryChange(c.name)}
                label={c.name}
                count={c.count}
                disabled={c.count === 0}
              />
              {/* Subcategories of the selected category, indented under it */}
              {selected && subcategories.length > 0 && onSubcategoryChange && (
                <div className="pfs-sub">
                  <Option
                    checked={!activeSubcategory || activeSubcategory === 'all'}
                    onChange={() => onSubcategoryChange('all')}
                    label={`All ${c.name}`}
                  />
                  {subcategories.map(s => (
                    <Option
                      key={s.name}
                      checked={String(activeSubcategory).toLowerCase() === s.name.toLowerCase()}
                      onChange={() => onSubcategoryChange(s.name)}
                      label={s.name}
                      count={s.count}
                      disabled={s.count === 0}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </Section>

      <Section title="Price">
        {priceRanges.map(r => (
          <Option
            key={r.id}
            checked={priceRange === r.id}
            onChange={() => onPriceRangeChange(priceRange === r.id ? '' : r.id)}
            type="checkbox"
            label={r.label}
            count={r.count}
            disabled={r.count === 0}
          />
        ))}
        <form
          className="pfs-price-form"
          onSubmit={(e) => { e.preventDefault(); onCustomPrice(minInput, maxInput); }}
        >
          <input inputMode="numeric" placeholder="₹ Min" value={minInput} onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price" />
          <span>to</span>
          <input inputMode="numeric" placeholder="₹ Max" value={maxInput} onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price" />
          <button type="submit">Go</button>
        </form>
      </Section>

      {sizes.length > 0 && (
        <Section title="Size / Variant">
          {visibleSizes.map(s => (
            <Option
              key={s.name}
              type="checkbox"
              checked={activeSize.toLowerCase() === s.name.toLowerCase()}
              onChange={() => onSizeChange(activeSize.toLowerCase() === s.name.toLowerCase() ? 'all' : s.name)}
              label={s.name}
              count={s.count}
            />
          ))}
          {sizes.length > SIZE_PREVIEW && (
            <button type="button" className="pfs-more" onClick={() => setShowAllSizes(v => !v)}>
              {showAllSizes ? 'Show less' : `Show ${sizes.length - SIZE_PREVIEW} more`}
            </button>
          )}
        </Section>
      )}

      <Section title="Discount">
        {discounts.map(d => (
          <Option
            key={d.value}
            type="checkbox"
            checked={minDiscount === d.value}
            onChange={() => onDiscountChange(minDiscount === d.value ? 0 : d.value)}
            label={`${d.value}% or more`}
            count={d.count}
            disabled={d.count === 0}
          />
        ))}
      </Section>

      <Section title="Customer Rating">
        {ratings.map(r => (
          <Option
            key={r.value}
            type="checkbox"
            checked={minRating === r.value}
            onChange={() => onRatingChange(minRating === r.value ? 0 : r.value)}
            label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>{r.value}<Star size={13} fill="#f59e0b" color="#f59e0b" /> & above</span>}
            count={r.count}
            disabled={r.count === 0}
          />
        ))}
      </Section>

      <Section title="Availability">
        <Option type="checkbox" checked={inStockOnly} onChange={() => onInStockChange(!inStockOnly)} label="In stock only" count={inStockCount} />
      </Section>

      <style>{`
        .pfs-root { background: #fff; border: 1px solid rgba(var(--color-primary-rgb), 0.1); border-radius: 16px; padding: 0.4rem 1.1rem 0.6rem; box-sizing: border-box; }
        .pfs-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
        .pfs-title { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .pfs-clear { background: none; border: none; color: var(--color-primary); font-weight: 700; font-size: 0.78rem; cursor: pointer; padding: 0; font-family: inherit; }
        .pfs-section { border-bottom: 1px solid #f1f5f9; }
        .pfs-section:last-of-type { border-bottom: none; }
        .pfs-section-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; padding: 0.85rem 0; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #334155; cursor: pointer; font-family: inherit; }
        .pfs-section-body { display: flex; flex-direction: column; gap: 0.15rem; padding-bottom: 0.85rem; }
        .pfs-option { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0; font-size: 0.86rem; color: #334155; cursor: pointer; line-height: 1.3; }
        /* Radio and checkbox options share one tick box in the site's maroon & gold theme (as in the header) */
        .pfs-option input { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin: 0; flex-shrink: 0; cursor: pointer; display: grid; place-content: center; border: 1.5px solid rgba(92, 21, 32, 0.35); border-radius: 5px; background: #fff; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
        .pfs-option input::after { content: ''; width: 5px; height: 9px; border: solid #fde68a; border-width: 0 2px 2px 0; transform: rotate(45deg) scale(0); margin-top: -2px; transition: transform 0.15s ease; }
        .pfs-option input:checked { background: linear-gradient(135deg, #5c1520 0%, #360910 100%); border-color: #5c1520; }
        .pfs-option input:checked::after { transform: rotate(45deg) scale(1); }
        .pfs-option:hover input:not(:disabled) { border-color: #5c1520; }
        .pfs-option input:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(197, 131, 26, 0.35); }
        .pfs-option-label { flex: 1; min-width: 0; text-transform: capitalize; overflow-wrap: anywhere; }
        .pfs-option-count { font-size: 0.74rem; color: #94a3b8; font-weight: 600; }
        .pfs-option-disabled { opacity: 0.45; cursor: default; }
        .pfs-option-disabled input { cursor: default; }
        .pfs-sub { margin: 0.1rem 0 0.35rem 1.4rem; padding-left: 0.6rem; border-left: 2px solid rgba(var(--color-primary-rgb), 0.15); display: flex; flex-direction: column; gap: 0.05rem; }
        .pfs-sub .pfs-option { font-size: 0.82rem; padding: 0.25rem 0; }
        .pfs-more { align-self: flex-start; background: none; border: none; color: var(--color-primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; padding: 0.3rem 0 0; font-family: inherit; }
        .pfs-price-form { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem; }
        .pfs-price-form input { width: 100%; min-width: 0; padding: 0.45rem 0.55rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.8rem; font-family: inherit; outline: none; box-sizing: border-box; }
        .pfs-price-form input:focus { border-color: var(--color-primary); }
        .pfs-price-form span { font-size: 0.75rem; color: #94a3b8; }
        .pfs-price-form button { padding: 0.45rem 0.75rem; border: none; border-radius: 8px; background: var(--color-primary); color: #fff; font-weight: 700; font-size: 0.78rem; cursor: pointer; font-family: inherit; }
      `}</style>
    </div>
  );
};

// Full-screen slide-in panel used on phones and tablets
export const ProductFilterDrawer = ({ open, onClose, resultCount, children }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex' }} role="dialog" aria-modal="true" aria-label="Filters">
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)' }} />
      <div style={{ position: 'relative', width: 'min(360px, 88vw)', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '8px 0 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0.6rem 0.75rem 0' }}>
          <button type="button" onClick={onClose} aria-label="Close filters" style={{ background: 'none', border: 'none', padding: '0.4rem', cursor: 'pointer', color: '#334155', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem' }}>{children}</div>
        <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <button type="button" onClick={onClose} style={{ width: '100%', padding: '0.85rem', border: 'none', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Show {resultCount} {resultCount === 1 ? 'product' : 'products'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilterSidebar;
