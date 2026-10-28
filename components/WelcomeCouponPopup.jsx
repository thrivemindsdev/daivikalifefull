'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';

// Key to store pending coupon for checkout
const PENDING_COUPON_KEY = 'daivika_pending_coupon';
// The popup is shown only once per browser, the first time the site is opened
const SEEN_KEY = 'daivika_coupon_popup_seen';
const hasSeenPopup = () => {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
};
const markPopupSeen = () => {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
};

/* ─── Traditional SVG Motifs ─── */
const LotusTopBorder = () => (
  <svg width="100%" height="13" viewBox="0 0 400 13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="ltpW" x="0" y="0" width="40" height="13" patternUnits="userSpaceOnUse">
        <path d="M20 12 Q10 6 0 12 Q10 1 20 4 Q30 1 40 12 Q30 6 20 12Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="4.5" r="1.8" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="13" fill="url(#ltpW)" />
  </svg>
);

const DiamondDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%' }}>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,131,26,0.45))' }} />
    <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
    <svg width="5" height="5" viewBox="0 0 5 5"><polygon points="2.5,0 5,2.5 2.5,5 0,2.5" fill="#c5831a" opacity="0.5" /></svg>
    <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(197,131,26,0.45))' }} />
  </div>
);

const MandalaStrip = () => (
  <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="18" fill="#2a0508" />
    <defs>
      <pattern id="msW" x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="9" r="3.5" fill="none" stroke="rgba(197,131,26,0.4)" strokeWidth="0.7" />
        <circle cx="10" cy="9" r="1.2" fill="rgba(197,131,26,0.55)" />
        <line x1="10" y1="1" x2="10" y2="17" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
        <line x1="3" y1="9" x2="17" y2="9" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="18" fill="url(#msW)" />
  </svg>
);

const WelcomeCouponPopup = () => {
  const { user, loading } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const initialTimerRef = useRef(null);

  const [popupSettings, setPopupSettings] = useState({
    enabled: true,
    imageUrl: '',
    redirectUrl: '',
    delaySeconds: 10,
    title: 'WELCOME OFFER',
    couponCode: 'DAIVIKA10',
    discountText: '10% OFF'
  });

  const loadSettings = async () => {
    try {
      let loadedSettings = null;
      const saved = localStorage.getItem('vaugun_offer_popup_settings');
      if (saved) {
        try { loadedSettings = JSON.parse(saved); } catch (e) {}
      }

      const res = await fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`);
      if (res.ok) {
        const resJson = await res.json();
        const data = resJson.data || resJson;
        if (data?.offer_popup_settings && typeof data.offer_popup_settings === 'object') {
          loadedSettings = { ...loadedSettings, ...data.offer_popup_settings };
          localStorage.setItem('vaugun_offer_popup_settings', JSON.stringify(loadedSettings));
        }
      }

      if (loadedSettings) {
        setPopupSettings(prev => ({ ...prev, ...loadedSettings }));
      }
    } catch (err) {
      console.warn('Failed to load offer popup settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
    const handleSync = () => loadSettings();
    window.addEventListener('vaugun_settings_updated', handleSync);
    return () => window.removeEventListener('vaugun_settings_updated', handleSync);
  }, []);

  useEffect(() => {
    if (initialTimerRef.current) clearTimeout(initialTimerRef.current);

    if (loading) return;
    if (popupSettings.enabled === false || hasSeenPopup()) return;

    const delayMs = (popupSettings.delaySeconds || 10) * 1000;

    initialTimerRef.current = setTimeout(() => {
      markPopupSeen();
      setIsOpen(true);
    }, delayMs);

    return () => {
      if (initialTimerRef.current) clearTimeout(initialTimerRef.current);
    };
  }, [loading, popupSettings.enabled, popupSettings.delaySeconds]);

  // Scale the whole popup down on short screens so it always fits, keeping the 1:1 image
  const fitRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    if (!isOpen) return;
    const el = fitRef.current;
    if (!el) return;
    const update = () => {
      const available = window.innerHeight - 32;
      const h = el.offsetHeight;
      setFitScale(h > available ? available / h : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [isOpen]);

  const handleClose = () => { setIsOpen(false); };

  const handleCopyCode = () => {
    const code = popupSettings.couponCode || 'DAIVIKA10';
    navigator.clipboard.writeText(code).catch(() => {});
    localStorage.setItem(PENDING_COUPON_KEY, code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || popupSettings.enabled === false) return null;

  const couponCode = popupSettings.couponCode || 'DAIVIKA10';
  const hasImage = !!(popupSettings.imageUrl && popupSettings.imageUrl.trim());

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: '"Poppins", Georgia, serif',
          boxSizing: 'border-box'
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(10, 2, 2, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        />

        {/* Modal */}
        <div
          ref={fitRef}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: '360px',
            transform: `scale(${fitScale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '360px',
            background: 'linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 50%, #fdf0d5 100%)',
            borderRadius: '22px',
            border: '2px solid rgba(197,131,26,0.6)',
            boxShadow: '0 0 0 1px rgba(197,131,26,0.15), 0 30px 70px -15px rgba(54,9,16,0.55)',
            overflow: 'hidden',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* Lotus top border */}
          <div style={{ lineHeight: 0, flexShrink: 0 }}>
            <LotusTopBorder />
          </div>

          {/* Traditional Header */}
          <div style={{
            background: 'linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%)',
            padding: '0.7rem 1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            flexShrink: 0,
            flexShrink: 0,
          }}>
            <span style={{ position: 'absolute', top: 5, left: 8, fontSize: '0.6rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', top: 5, right: 40, fontSize: '0.6rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', bottom: 5, left: 8, fontSize: '0.44rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>
            <span style={{ position: 'absolute', bottom: 5, right: 40, fontSize: '0.44rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'radial-gradient(circle, #3d0b10 0%, #1a0306 100%)',
                border: '1.5px solid rgba(253,211,77,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(253,211,77,0.35)', flexShrink: 0,
              }}>
                <img
                  src="/emblem.png"
                  alt="Daivika Divine Eye"
                  style={{
                    width: '20px',
                    height: '20px',
                    objectFit: 'contain',
                    filter: 'brightness(1.15) drop-shadow(0 0 3px rgba(252,211,77,0.5))'
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fde68a', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: 1 }}>
                  {popupSettings.title || 'WELCOME OFFER'}
                </div>
                <div style={{ fontSize: '0.48rem', color: 'rgba(253,211,77,0.6)', letterSpacing: '0.6px', fontStyle: 'italic', marginTop: '2px' }}>
                  ── Divinely Blessed ──
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              aria-label="Close popup"
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: '1px solid rgba(197,131,26,0.5)',
                background: 'rgba(255,255,255,0.1)',
                cursor: 'pointer', color: '#fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: 'none', padding: 0, transition: 'all 0.2s', zIndex: 30,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Mandala strip */}
          <div style={{ lineHeight: 0, flexShrink: 0 }}>
            <MandalaStrip />
          </div>

          {/* Image */}
          {hasImage && (
            <div
              style={{
                width: '100%', aspectRatio: '1 / 1',
                overflow: 'hidden', position: 'relative',
                cursor: popupSettings.redirectUrl ? 'pointer' : 'default',
                borderBottom: '1px solid rgba(197,131,26,0.2)',
              }}
              onClick={() => { if (popupSettings.redirectUrl) window.location.href = popupSettings.redirectUrl; }}
            >
              <img
                src={popupSettings.imageUrl}
                alt={popupSettings.title || 'Welcome Offer'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Body */}
          <div style={{
            padding: '1.1rem 1.25rem 1.25rem',
            flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            gap: '0.85rem', textAlign: 'center',
          }}>
            <div>
              <h2 style={{
                fontSize: '1.55rem', fontWeight: 900,
                margin: '0 0 0.3rem 0', color: '#360910',
                letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                Flat {popupSettings.discountText || '10% OFF'}
              </h2>
              <DiamondDivider />
              <p style={{
                fontSize: '0.72rem', color: '#7c4f2f',
                margin: '0.4rem 0 0', lineHeight: 1.5, fontStyle: 'italic',
              }}>
                {user ? <>Copy this sacred code &amp; apply it at checkout</> : <>Copy this sacred code &amp; login to apply at checkout</>}
              </p>
            </div>

            {/* Coupon box — brass/parchment */}
            <div style={{
              background: 'linear-gradient(135deg, #fdf3d8 0%, #fce7a0 100%)',
              border: '1.5px dashed rgba(197,131,26,0.7)',
              borderRadius: '10px',
              padding: '0.7rem 0.9rem',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '0.5rem',
              boxShadow: 'inset 0 1px 3px rgba(54,9,16,0.06)',
            }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{
                  fontSize: '0.48rem', textTransform: 'uppercase',
                  letterSpacing: '1px', color: '#7c4f2f',
                  display: 'block', fontWeight: 700, marginBottom: '1px',
                }}>
                  ✦ PROMO CODE ✦
                </span>
                <span style={{
                  fontSize: '1.2rem', fontWeight: 900,
                  letterSpacing: '2px', color: '#360910',
                  fontFamily: 'monospace',
                  textShadow: '0 1px 2px rgba(54,9,16,0.1)',
                }}>
                  {couponCode}
                </span>
              </div>

              <button
                onClick={handleCopyCode}
                style={{
                  background: copied
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #3d0b10, #5c1520)',
                  border: 'none',
                  color: copied ? '#ffffff' : '#fde68a',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '7px',
                  fontSize: '0.65rem', fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                  letterSpacing: '0.5px',
                  boxShadow: copied ? '0 2px 8px rgba(22,163,74,0.3)' : '0 3px 10px rgba(54,9,16,0.3)',
                  outline: 'none',
                }}
              >
                {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>

            {/* Shop Now */}
            {popupSettings.redirectUrl && (
              <a
                href={popupSettings.redirectUrl}
                onClick={handleClose}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.4rem',
                  background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                  color: '#2a0508',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px', fontWeight: 900,
                  fontSize: '0.8rem', letterSpacing: '1.5px',
                  textDecoration: 'none', textTransform: 'uppercase',
                  boxShadow: '0 5px 18px rgba(197,131,26,0.4)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                    width: '40%',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>🪔 Shop Now</span>
                <ChevronRight size={14} style={{ position: 'relative', zIndex: 1 }} />
              </a>
            )}

            <div style={{
              fontSize: '0.56rem', color: 'rgba(120,70,30,0.55)',
              letterSpacing: '0.4px', fontStyle: 'italic', marginTop: '-0.2rem',
            }}>
              ── शुभं भवतु · Blessings await you ──
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeCouponPopup;
