'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown } from 'lucide-react';

// Dropdown with a search box, styled like the checkout form fields
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No matches found',
  disabled = false,
  disabledText,
  accent = '#0a0a0a',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter(o => o.toLowerCase().includes(q)) : options;

  const close = () => { setOpen(false); setQuery(''); };
  const choose = (opt) => { onChange(opt); close(); };

  return (
    <div style={{ position: 'relative' }}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(!open); } }}
        style={{
          width: '100%',
          padding: '0.65rem 0.85rem',
          borderRadius: '6px',
          border: '1px solid ' + (open ? accent : '#d1d5db'),
          backgroundColor: disabled ? '#f9fafb' : '#fff',
          color: value ? '#111827' : '#9ca3af',
          fontSize: '0.9rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          height: '39px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {value || (disabled && disabledText) || placeholder}
        </span>
        <ChevronDown size={14} color="#6b7280" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>

      {open && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'transparent' }} />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              zIndex: 9999,
              maxHeight: '240px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minWidth: '220px',
            }}
          >
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f9fafb' }}>
              <Search size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length) { e.preventDefault(); choose(filtered[0]); }
                  if (e.key === 'Escape') close();
                }}
                style={{ width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#111827', padding: '0.2rem 0' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
              {filtered.length > 0 ? filtered.map(opt => (
                <div
                  key={opt}
                  onClick={() => choose(opt)}
                  style={{
                    padding: '0.55rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: value === opt ? 700 : 500,
                    color: value === opt ? '#0a0a0a' : '#374151',
                    backgroundColor: value === opt ? '#fdfbf9' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {opt}
                </div>
              )) : (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#6b7280' }}>{emptyText}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableSelect;
