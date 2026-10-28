'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_LOADER_LOGO } from '@/components/loaderLogo';

export default function Loading() {
  const [logoUrl, setLogoUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vaugun_invoice_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.companyLogo && !settings.companyLogo.includes('slaro') && !settings.companyLogo.includes('api/images')) return settings.companyLogo;
        }
      } catch (e) {}
    }
    return DEFAULT_LOADER_LOGO;
  });
  const [brandName, setBrandName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vaugun_invoice_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.companyName) return settings.companyName;
        }
      } catch (e) {}
    }
    return 'Daivika';
  });
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('daivika_initial_loaded');
      if (!shown) {
        setShouldShow(true);
        sessionStorage.setItem('daivika_initial_loaded', 'true');
      }
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vaugun_invoice_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.companyLogo && !settings.companyLogo.includes('slaro') && !settings.companyLogo.includes('api/images')) {
          setLogoUrl(settings.companyLogo);
        } else {
          setLogoUrl(DEFAULT_LOADER_LOGO);
        }
        if (settings.companyName) {
          setBrandName(settings.companyName);
        }
      }
    } catch (e) {
      console.error('Error loading logo from local storage in loader:', e);
    }
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#FAF8F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: '"Poppins", sans-serif',
    }}>
      <style>{`
        @keyframes spin-leaf {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes fade-dots {
          0%, 80%, 100% { opacity: 0; transform: translateY(0); }
          40%            { opacity: 1; transform: translateY(-6px); }
        }
      `}</style>

      {/* Spinning Logo Ring */}
      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '1.5rem' }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid rgba(10, 10, 10, 0.08)',
          borderTopColor: '#0a0a0a',
          borderRightColor: '#0a0a0a',
          animation: 'spin-leaf 1s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite',
        }} />
        {/* Inner logo */}
        <div style={{
          position: 'absolute',
          inset: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse-glow 1.5s ease-in-out infinite',
        }}>
          <img
            src={logoUrl || DEFAULT_LOADER_LOGO}
            alt="Logo"
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            onError={() => setLogoUrl(DEFAULT_LOADER_LOGO)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>

      {/* Brand name */}
      <div style={{
        fontSize: '0.85rem',
        fontWeight: 800,
        color: '#0a0a0a',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        {brandName}
      </div>

      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#0a0a0a',
              animation: `fade-dots 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

