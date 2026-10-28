import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Traditional SVG Motifs ─── */
const LotusTopBorder = () => (
  <svg width="100%" height="13" viewBox="0 0 400 13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="ltpG" x="0" y="0" width="40" height="13" patternUnits="userSpaceOnUse">
        <path d="M20 12 Q10 6 0 12 Q10 1 20 4 Q30 1 40 12 Q30 6 20 12Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="4.5" r="1.8" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="13" fill="url(#ltpG)" />
  </svg>
);

const LotusBottomBorder = () => (
  <svg width="100%" height="13" viewBox="0 0 400 13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="lbpG" x="0" y="0" width="40" height="13" patternUnits="userSpaceOnUse">
        <path d="M20 1 Q10 7 0 1 Q10 12 20 9 Q30 12 40 1 Q30 7 20 1Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="8.5" r="1.8" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="13" fill="url(#lbpG)" />
  </svg>
);

const MandalaStrip = () => (
  <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="18" fill="#2a0508" />
    <defs>
      <pattern id="msG" x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="9" r="3.5" fill="none" stroke="rgba(197,131,26,0.4)" strokeWidth="0.7" />
        <circle cx="10" cy="9" r="1.2" fill="rgba(197,131,26,0.55)" />
        <line x1="10" y1="1" x2="10" y2="17" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
        <line x1="3" y1="9" x2="17" y2="9" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="18" fill="url(#msG)" />
  </svg>
);

const DiamondDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%', margin: '0.5rem 0' }}>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,131,26,0.45))' }} />
    <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
    <svg width="5" height="5" viewBox="0 0 5 5"><polygon points="2.5,0 5,2.5 2.5,5 0,2.5" fill="#c5831a" opacity="0.5" /></svg>
    <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="#c5831a" opacity="0.7" /></svg>
    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(197,131,26,0.45))' }} />
  </div>
);

const GenderSelectionModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSelection = (gender) => {
    localStorage.setItem('vaugun_store_gender', gender);
    window.dispatchEvent(new Event('vaugun_store_gender_changed'));
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(10, 2, 2, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '1rem',
          fontFamily: '"Poppins", Georgia, serif',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '440px',
            maxHeight: 'calc(100dvh - 2rem)',
            overflowY: 'auto',
            background: 'linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 40%, #fdf0d5 100%)',
            border: '2px solid rgba(197,131,26,0.6)',
            borderRadius: '22px',
            boxShadow: '0 0 0 1px rgba(197,131,26,0.15), 0 30px 70px -15px rgba(54,9,16,0.55)',
            overflowX: 'hidden',
            position: 'relative',
          }}
        >
          {/* Lotus top border */}
          <div style={{ lineHeight: 0 }}>
            <LotusTopBorder />
          </div>

          {/* Traditional header */}
          <div style={{
            background: 'linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%)',
            padding: '0.85rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
          }}>
            <span style={{ position: 'absolute', top: 6, left: 10, fontSize: '0.65rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', top: 6, right: 10, fontSize: '0.65rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', bottom: 6, left: 10, fontSize: '0.48rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>
            <span style={{ position: 'absolute', bottom: 6, right: 10, fontSize: '0.48rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'radial-gradient(circle, #3d0b10 0%, #1a0306 100%)',
                border: '1.5px solid rgba(253,211,77,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(253,211,77,0.35)',
              }}>
                <img
                  src="/emblem.png"
                  alt="Daivika Divine Eye"
                  style={{
                    width: '22px',
                    height: '22px',
                    objectFit: 'contain',
                    filter: 'brightness(1.15) drop-shadow(0 0 3px rgba(252,211,77,0.5))'
                  }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fde68a', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: 1 }}>
                  Daivika Experience
                </div>
                <div style={{ fontSize: '0.5rem', color: 'rgba(253,211,77,0.6)', letterSpacing: '0.6px', fontStyle: 'italic', marginTop: '2px' }}>
                  ── Choose Your Sacred Path ──
                </div>
              </div>
            </div>
          </div>

          {/* Mandala strip */}
          <div style={{ lineHeight: 0 }}>
            <MandalaStrip />
          </div>

          {/* Body */}
          <div style={{ padding: '1.75rem 2rem 1.5rem', textAlign: 'center' }}>
            {/* Divine Eye decorative circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                width: '68px', height: '68px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(61,11,16,0.06) 0%, rgba(197,131,26,0.12) 100%)',
                border: '2px dashed rgba(197,131,26,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem auto',
                boxShadow: '0 0 20px rgba(252,211,77,0.2)',
              }}
            >
              <img
                src="/emblem.png"
                alt="Daivika Sacred Eye"
                style={{
                  width: '42px',
                  height: '42px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(197,131,26,0.35))'
                }}
              />
            </motion.div>

            <h2 style={{
              fontSize: '1.5rem', fontWeight: 800, color: '#1e0608',
              marginBottom: '0.4rem', letterSpacing: '-0.3px', lineHeight: 1.2,
            }}>
              Define Your Style
            </h2>

            <DiamondDivider />

            <p style={{
              fontSize: '0.8rem', color: '#7c4f2f', marginBottom: '1.75rem',
              lineHeight: 1.6, fontStyle: 'italic', marginTop: '0.5rem',
            }}>
              Choose your preferred collection to begin a divine shopping experience
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Men's */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(54,9,16,0.18)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelection('men')}
                style={{
                  width: '100%', padding: '1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3d0b10 0%, #5c1520 100%)',
                  border: '1.5px solid rgba(197,131,26,0.5)',
                  color: '#fde68a',
                  fontSize: '0.88rem', fontWeight: 800,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: '0 4px 14px rgba(54,9,16,0.2)',
                  outline: 'none', position: 'relative', overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🧔</span>
                Men's Collection
              </motion.button>

              {/* Women's */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(197,131,26,0.4)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelection('women')}
                style={{
                  width: '100%', padding: '1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                  border: '1.5px solid rgba(197,131,26,0.6)',
                  color: '#2a0508',
                  fontSize: '0.88rem', fontWeight: 800,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: '0 4px 14px rgba(197,131,26,0.35)',
                  outline: 'none', position: 'relative', overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>👸</span>
                Women's Collection
              </motion.button>
            </div>

            <DiamondDivider />

            <p style={{
              fontSize: '0.62rem', color: 'rgba(120,70,30,0.55)',
              marginTop: '0.75rem', fontWeight: 500,
              fontStyle: 'italic', letterSpacing: '0.3px',
            }}>
              ── शुभं भवतु · You can change this preference anytime ──
            </p>
          </div>

          {/* Bottom lotus strip */}
          <div style={{ lineHeight: 0 }}>
            <LotusBottomBorder />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GenderSelectionModal;
