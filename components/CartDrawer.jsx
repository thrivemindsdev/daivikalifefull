import React, { useEffect, useState } from 'react';
import { X, Minus, Plus, ArrowRight, Gift, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '@/hooks/useRouterShim';
import { API_BASE_URL } from '@/config';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';

/* ─── Decorative SVG motifs ─── */

const DivineEyeSymbol = ({ size = 22 }) => (
  <img
    src="/emblem.png"
    alt="Daivika Divine Eye"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      filter: 'brightness(1.15) drop-shadow(0 0 3px rgba(252,211,77,0.5))'
    }}
  />
);

const LotusTopBorder = () => (
  <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="lotusPatternT" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse">
        <path d="M20 13 Q10 7 0 13 Q10 1 20 4 Q30 1 40 13 Q30 7 20 13Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="5" r="2" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="14" fill="url(#lotusPatternT)" />
  </svg>
);

const LotusBottomBorder = () => (
  <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="lotusPatternB" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse">
        <path d="M20 1 Q10 7 0 1 Q10 13 20 10 Q30 13 40 1 Q30 7 20 1Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="9" r="2" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="14" fill="url(#lotusPatternB)" />
  </svg>
);

const DiamondDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', width: '100%' }}>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,131,26,0.5))' }} />
    <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill="#c5831a" opacity="0.7" /></svg>
    <svg width="6" height="6" viewBox="0 0 6 6"><polygon points="3,0 6,3 3,6 0,3" fill="#c5831a" opacity="0.5" /></svg>
    <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill="#c5831a" opacity="0.7" /></svg>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(197,131,26,0.5))' }} />
  </div>
);

const DiyaEmptyIcon = () => (
  <svg width="88" height="88" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="flameGrad" cx="50%" cy="80%" r="60%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
      </radialGradient>
      <radialGradient id="flameInner" cx="50%" cy="80%" r="50%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
      </radialGradient>
      <radialGradient id="diyaBody" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <ellipse cx="45" cy="18" rx="5" ry="10" fill="url(#flameGrad)" opacity="0.9">
      <animate attributeName="ry" values="10;13;10;8;10" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="cy" values="18;16;18;20;18" dur="1.8s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="45" cy="22" rx="3" ry="5" fill="url(#flameInner)" opacity="0.9">
      <animate attributeName="ry" values="5;7;5;4;5" dur="1.8s" repeatCount="indefinite" />
    </ellipse>
    <line x1="45" y1="28" x2="45" y2="36" stroke="#78350f" strokeWidth="1.5" />
    <path d="M25 50 Q30 36 45 35 Q60 36 65 50 Q62 62 45 65 Q28 62 25 50Z" fill="url(#diyaBody)" />
    <path d="M30 52 Q35 42 45 41 Q55 42 60 52 Q57 60 45 62 Q33 60 30 52Z" fill="rgba(251,191,36,0.4)" />
    <path d="M60 48 Q68 44 70 50 Q68 56 60 53Z" fill="#b45309" />
    <ellipse cx="45" cy="52" rx="9" ry="4" fill="rgba(251,191,36,0.35)" />
    <ellipse cx="45" cy="72" rx="22" ry="5" fill="rgba(180,83,9,0.25)" />
    <circle cx="45" cy="20" r="16" fill="rgba(251,191,36,0.08)">
      <animate attributeName="r" values="16;22;16" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.08;0.2;0.08" dur="1.8s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const MandalaStrip = () => (
  <svg width="100%" height="28" viewBox="0 0 400 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="28" fill="#2a0508" />
    <defs>
      <pattern id="kolamStrip" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="14" cy="14" r="5" fill="none" stroke="rgba(197,131,26,0.4)" strokeWidth="0.8" />
        <circle cx="14" cy="14" r="9" fill="none" stroke="rgba(197,131,26,0.2)" strokeWidth="0.6" />
        <line x1="14" y1="5" x2="14" y2="23" stroke="rgba(197,131,26,0.22)" strokeWidth="0.5" />
        <line x1="5" y1="14" x2="23" y2="14" stroke="rgba(197,131,26,0.22)" strokeWidth="0.5" />
        <circle cx="14" cy="14" r="1.8" fill="rgba(197,131,26,0.55)" />
      </pattern>
    </defs>
    <rect width="100%" height="28" fill="url(#kolamStrip)" />
  </svg>
);

const CartDrawer = () => {
  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isCartOpen]);

  // Screen size detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
      const handleResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 2, 2, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 1000000,
            }}
          />


          {/* Traditional Cart Drawer */}
          <motion.div
            initial={{ x: '110%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{
              position: 'fixed',
              top: isMobile ? '0.5rem' : '0.75rem',
              right: isMobile ? '0.5rem' : '0.75rem',
              bottom: isMobile ? '0.5rem' : '0.75rem',
              height: isMobile ? 'calc(100vh - 1rem)' : 'calc(100vh - 1.5rem)',
              width: isMobile ? 'calc(100vw - 1rem)' : '470px',
              maxWidth: '100%',
              background: 'linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 40%, #fdf0d5 100%)',
              borderRadius: '22px',
              border: '2px solid rgba(197, 131, 26, 0.6)',
              boxShadow: '0 0 0 1px rgba(197,131,26,0.15), 0 30px 80px -20px rgba(54,9,16,0.5), inset 0 1px 0 rgba(255,255,255,0.7)',
              zIndex: 1000001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: '"Poppins", Georgia, serif',
              boxSizing: 'border-box',
            }}
          >
            {/* Top lotus petal border */}
            <div style={{ flexShrink: 0, lineHeight: 0 }}>
              <LotusTopBorder />
            </div>

            {/* ── HEADER ── */}
            <div style={{
              padding: '0.9rem 1.4rem',
              background: 'linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              flexShrink: 0,
            }}>
              {/* Corner ornaments */}
              <span style={{ position: 'absolute', top: 6, left: 10, fontSize: '0.7rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
              <span style={{ position: 'absolute', top: 6, right: 46, fontSize: '0.7rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
              <span style={{ position: 'absolute', bottom: 6, left: 10, fontSize: '0.5rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>
              <span style={{ position: 'absolute', bottom: 6, right: 46, fontSize: '0.5rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {/* Divine Eye emblem badge */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'radial-gradient(circle, #3d0b10 0%, #1a0306 100%)',
                  border: '1.5px solid rgba(253,211,77,0.65)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(253,211,77,0.35)',
                  flexShrink: 0,
                }}>
                  <DivineEyeSymbol size={22} />
                </div>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: '1.05rem', fontWeight: 800,
                    color: '#fde68a', letterSpacing: '1.5px',
                    textTransform: 'uppercase', lineHeight: 1,
                  }}>
                    Sacred Cart
                  </h2>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(253,211,77,0.6)', letterSpacing: '0.8px', marginTop: '2px', fontStyle: 'italic' }}>
                    ── Divinely Curated ──
                  </div>
                </div>
                {cartItems.length > 0 && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 900,
                    background: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
                    color: '#360910', padding: '0.2rem 0.6rem',
                    borderRadius: '100px', border: '1px solid rgba(253,211,77,0.5)',
                    boxShadow: '0 2px 6px rgba(253,211,77,0.3)', lineHeight: 1, flexShrink: 0,
                  }}>
                    {cartItems.reduce((a, c) => a + c.quantity, 0)} items
                  </span>
                )}
              </div>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(253,211,77,0.15)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart"
                style={{
                  width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%',
                  border: '1px solid rgba(197,131,26,0.5)', background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer', color: '#fde68a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: 'none', padding: 0, transition: 'all 0.2s',
                }}
              >
                <X size={15} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Mandala kolam strip */}
            <div style={{ flexShrink: 0, lineHeight: 0 }}>
              <MandalaStrip />
            </div>

            {/* ── ITEMS PANEL ── */}
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '1rem 1.1rem',
              display: 'flex', flexDirection: 'column', gap: '0.85rem',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(197,131,26,0.3) transparent',
            }}>
              {cartItems.length === 0 ? (
                /* ── EMPTY STATE ── */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%',
                  padding: '2rem 1rem', textAlign: 'center',
                }}>
                  {/* Ornamental diya circle */}
                  <div style={{
                    width: '128px', height: '128px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(252,211,77,0.12) 0%, rgba(197,131,26,0.04) 70%)',
                    border: '2px dashed rgba(197,131,26,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.5rem', position: 'relative',
                    boxShadow: '0 0 24px rgba(252,211,77,0.1)',
                  }}>
                    {/* Lotus petals */}
                    {[0, 60, 120, 180, 240, 300].map((a, i) => (
                      <div key={i} style={{
                        position: 'absolute', width: '12px', height: '20px',
                        borderRadius: '50%', background: 'rgba(197,131,26,0.18)',
                        top: '50%', left: '50%',
                        transform: `rotate(${a}deg) translateY(-58px) translateX(-6px)`,
                        transformOrigin: '6px 58px',
                      }} />
                    ))}
                    <DiyaEmptyIcon />
                  </div>

                  <DiamondDivider />

                  <h3 style={{
                    fontSize: '1.1rem', fontWeight: 800, color: '#360910',
                    margin: '1rem 0 0.35rem', letterSpacing: '0.5px',
                  }}>
                    Your Sacred Space is Empty
                  </h3>
                  <p style={{
                    fontSize: '0.75rem', color: '#7c4f2f', margin: '0 0 0.4rem',
                    lineHeight: 1.6, fontStyle: 'italic', letterSpacing: '0.3px',
                  }}>
                    "आरंभे शुभं" — Begin with the auspicious
                  </p>
                  <p style={{
                    fontSize: '0.8rem', color: '#7c4f2f', margin: '0 0 1.5rem',
                    maxWidth: '240px', lineHeight: '1.6',
                  }}>
                    Fill your cart with divinely crafted offerings
                  </p>

                  <DiamondDivider />

                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 12px 30px rgba(54,9,16,0.3)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsCartOpen(false)}
                    style={{
                      marginTop: '1.5rem',
                      padding: '0.85rem 2rem',
                      background: 'linear-gradient(135deg, #360910 0%, #5c1520 100%)',
                      color: '#fde68a', border: '1.5px solid rgba(197,131,26,0.6)',
                      borderRadius: '6px', fontSize: '0.82rem', fontWeight: 800,
                      letterSpacing: '1.5px', textTransform: 'uppercase',
                      cursor: 'pointer', outline: 'none',
                      boxShadow: '0 6px 20px rgba(54,9,16,0.25)',
                    }}
                  >
                    🪔 Begin Shopping
                  </motion.button>
                </div>
              ) : (
                cartItems.map((item, index) => {
                  const itemKey = item.cartId || item.id || item._id;

                  /* ── FREE GIFT ── */
                  if (item.isFreeGift) {
                    return (
                      <motion.div
                        key={itemKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        whileHover={{ y: -2 }}
                        style={{
                          display: 'flex', gap: '0.85rem', padding: '0.85rem',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                          border: '1.5px dashed #10b981', boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
                          <img
                            src={getOptimizedImageUrl(item.image || '/logo.png', 150)}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', border: '1px solid #a7f3d0' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                          />
                          <div style={{
                            position: 'absolute', bottom: '-4px', right: '-4px',
                            backgroundColor: '#10b981', color: '#fff', borderRadius: '50%',
                            width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Sparkles size={10} />
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#10b981', color: '#fff', fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: '100px', letterSpacing: '0.4px', textTransform: 'uppercase', width: 'fit-content' }}>
                            <Gift size={9} /> FREE GIFT
                          </div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name.replace(/\(Free Gift.*?\)/i, '').trim()}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#047857' }}>🎁 Unlocked with: {item.parentProductName || 'Selected Product'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#059669' }}>FREE (₹0)</span>
                            <button onClick={() => removeFromCart(itemKey)} style={{ color: '#9ca3af', fontSize: '0.66rem', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}>Remove</button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  /* ── REGULAR ITEM ── */
                  return (
                    <motion.div
                      key={itemKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.07 }}
                      whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(54,9,16,0.14)' }}
                      style={{
                        display: 'flex', gap: '0.85rem', padding: '0.9rem',
                        borderRadius: '16px',
                        background: 'linear-gradient(145deg, #fffdf5 0%, #fdf3d8 100%)',
                        border: '1.5px solid rgba(197,131,26,0.42)',
                        borderTop: '3px solid #c5831a',
                        boxShadow: '0 4px 16px rgba(54,9,16,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Lotus watermark */}
                      <div style={{
                        position: 'absolute', bottom: -10, right: -6,
                        fontSize: '3.5rem', color: 'rgba(197,131,26,0.06)',
                        lineHeight: 1, userSelect: 'none', pointerEvents: 'none', fontFamily: 'serif',
                      }}>
                        ❁
                      </div>

                      {/* Product image with ornamental frame */}
                      <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: -3, left: -3, fontSize: '0.62rem', color: '#c5831a', lineHeight: 1, zIndex: 2 }}>✦</span>
                        <span style={{ position: 'absolute', top: -3, right: -3, fontSize: '0.62rem', color: '#c5831a', lineHeight: 1, zIndex: 2 }}>✦</span>
                        <span style={{ position: 'absolute', bottom: -3, left: -3, fontSize: '0.62rem', color: '#c5831a', lineHeight: 1, zIndex: 2 }}>✦</span>
                        <span style={{ position: 'absolute', bottom: -3, right: -3, fontSize: '0.62rem', color: '#c5831a', lineHeight: 1, zIndex: 2 }}>✦</span>
                        <img
                          src={getOptimizedImageUrl(item.image || '/logo.png', 150)}
                          alt={item.name}
                          style={{
                            width: '100%', height: '100%', borderRadius: '10px',
                            objectFit: 'cover', border: '2px solid rgba(197,131,26,0.5)',
                            boxShadow: '0 3px 10px rgba(54,9,16,0.12)',
                          }}
                          onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                        />
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.14rem' }}>
                        {/* Sanctified badge */}
                        <span style={{
                          fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.6px',
                          textTransform: 'uppercase', color: '#7c2d12',
                          background: 'linear-gradient(90deg, rgba(252,211,77,0.25), rgba(197,131,26,0.15))',
                          border: '1px solid rgba(197,131,26,0.35)',
                          padding: '1px 6px', borderRadius: '3px',
                          width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: '3px',
                        }}>
                          🪔 Sanctified
                        </span>

                        {/* Name */}
                        <div style={{
                          fontSize: '0.85rem', fontWeight: 800, color: '#1e0608',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.3, marginTop: '1px',
                        }}>
                          {item.name.split(' (')[0]}
                        </div>

                        {/* Variants */}
                        {(item.selectedColor || item.selectedTexture || item.selectedVariant) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', marginTop: '1px' }}>
                            {item.selectedColor && (
                              <div title={`Color: ${item.selectedColor.name}`} style={{
                                width: '11px', height: '11px', borderRadius: '50%',
                                backgroundColor: item.selectedColor.code || '#ccc',
                                border: '1px solid rgba(197,131,26,0.5)',
                              }} />
                            )}
                            {item.selectedVariant && (
                              <span style={{
                                fontSize: '0.58rem', fontWeight: 700, color: '#54111c',
                                background: 'rgba(197,131,26,0.12)', padding: '1px 5px',
                                borderRadius: '3px', border: '1px solid rgba(197,131,26,0.25)',
                              }}>
                                {item.selectedVariant.name}
                              </span>
                            )}
                            {(item.selectedColor || item.selectedTexture) && (
                              <span style={{ fontSize: '0.6rem', color: '#7c4f2f', fontWeight: 600 }}>
                                {item.selectedColor ? item.selectedColor.name : item.selectedTexture.name}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price */}
                        <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#360910', marginTop: '2px' }}>
                          ₹{item.price.toLocaleString('en-IN')}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                          {/* Brass qty capsule */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center',
                            background: 'linear-gradient(135deg, #fdf3d8 0%, #fce7a0 100%)',
                            border: '1.5px solid rgba(197,131,26,0.55)',
                            borderRadius: '100px', padding: '2px', gap: '2px',
                            boxShadow: 'inset 0 1px 2px rgba(54,9,16,0.08)',
                          }}>
                            <button
                              onClick={() => updateQuantity(itemKey, -1)}
                              aria-label="Decrease quantity"
                              style={{
                                width: '25px', height: '25px', minWidth: '25px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #fff 0%, #fef3c7 100%)',
                                border: '1px solid rgba(197,131,26,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#360910',
                                boxShadow: '0 1px 3px rgba(54,9,16,0.12)',
                                outline: 'none', padding: 0,
                              }}
                            >
                              <Minus size={10} strokeWidth={2.5} />
                            </button>
                            <span style={{
                              padding: '0 0.5rem', fontSize: '0.8rem', fontWeight: 900,
                              color: '#360910', minWidth: '20px', textAlign: 'center',
                            }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(itemKey, 1)}
                              aria-label="Increase quantity"
                              style={{
                                width: '25px', height: '25px', minWidth: '25px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #fff 0%, #fef3c7 100%)',
                                border: '1px solid rgba(197,131,26,0.35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#360910',
                                boxShadow: '0 1px 3px rgba(54,9,16,0.12)',
                                outline: 'none', padding: 0,
                              }}
                            >
                              <Plus size={10} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeFromCart(itemKey)}
                            style={{
                              color: '#a8947f', fontSize: '0.68rem', fontWeight: 700,
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0.2rem 0.5rem', borderRadius: '5px',
                              outline: 'none', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#991b1b'; e.currentTarget.style.background = 'rgba(153,27,27,0.06)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#a8947f'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* ── FOOTER ── */}
            {cartItems.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ lineHeight: 0 }}>
                  <MandalaStrip />
                </div>
                <div style={{
                  padding: '1.1rem 1.4rem 1.3rem',
                  background: 'linear-gradient(180deg, #3d0b10 0%, #2a0508 100%)',
                  display: 'flex', flexDirection: 'column', gap: '0.85rem',
                }}>
                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(253,211,77,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                        ✦ TOTAL OFFERING ✦
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(253,211,77,0.65)' }}>
                        Consecrated Order
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 900, color: '#fde68a',
                      textShadow: '0 0 20px rgba(252,211,77,0.35)', letterSpacing: '-0.5px',
                    }}>
                      ₹{getCartTotal().toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Golden checkout button with shimmer */}
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 14px 36px rgba(252,211,77,0.35)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setIsCartOpen(false); navigate('/checkout'); }}
                    style={{
                      width: '100%', padding: '0.95rem 1.5rem',
                      background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                      color: '#2a0508', border: 'none', borderRadius: '7px',
                      fontSize: '0.88rem', fontWeight: 900, letterSpacing: '1.5px',
                      textTransform: 'uppercase', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      outline: 'none',
                      boxShadow: '0 6px 24px rgba(197,131,26,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Shimmer */}
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                        width: '40%',
                      }}
                    />
                    <span style={{ position: 'relative', zIndex: 1 }}>🪔 Proceed to Checkout</span>
                    <ArrowRight size={15} strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
                  </motion.button>

                  {/* Sanskrit blessing */}
                  <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'rgba(253,211,77,0.4)', letterSpacing: '0.5px', fontStyle: 'italic' }}>
                    ── शुभं भवतु · May your order be blessed ──
                  </div>
                </div>
                {/* Bottom lotus strip */}
                <div style={{ lineHeight: 0 }}>
                  <LotusBottomBorder />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;

