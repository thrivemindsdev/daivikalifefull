'use client';

import React, { useRef } from 'react';
import {
  Truck, ShieldCheck, RefreshCw, Sparkles, X, Zap, Headphones, Gift, ShoppingBag,
  Percent, Clock, Star, Heart, Tag, Flame, Award, Package, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
  Truck, ShieldCheck, RefreshCw, Sparkles, Zap, Headphones, Gift, ShoppingBag,
  Percent, Clock, Star, Heart, Tag, Flame, Award, Package, Shield
};

const AnnouncementBar = () => {
  const [shippingThreshold, setShippingThreshold] = React.useState(500);
  const [items, setItems] = React.useState(() => {
    const defaults = [
      { text: "100% Certified Pure Quality!", icon: "ShieldCheck" },
      { text: "Order now & get it within 2-3 days!", icon: "Zap" },
      { text: "Free express delivery above ₹2000!", icon: "Truck" }
    ];
    if (typeof window === 'undefined') return defaults;
    const saved = localStorage.getItem('vaugun_header_ticker') || localStorage.getItem('vaugun_announcements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaults;
  });

  const [visible, setVisible] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('daivika_bar_closed') !== '1';
    }
    return true;
  });
  const barRef = useRef(null);

  React.useEffect(() => {
    const updateSettings = () => {
      const savedTh = localStorage.getItem('vaugun_free_shipping_threshold');
      if (savedTh) {
        setShippingThreshold(parseInt(savedTh) || 500);
      }
      const savedTicker = localStorage.getItem('vaugun_header_ticker') || localStorage.getItem('vaugun_announcements');
      if (savedTicker) {
        try {
          const parsed = JSON.parse(savedTicker);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        } catch (e) {}
      }
    };
    updateSettings();
    window.addEventListener('storage', updateSettings);
    window.addEventListener('vaugun_settings_updated', updateSettings);
    return () => {
      window.removeEventListener('storage', updateSettings);
      window.removeEventListener('vaugun_settings_updated', updateSettings);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={barRef}
          key="announcement-bar"
          initial={{ height: 26, opacity: 1 }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }}
          className="announcement-bar"
          style={{
            backgroundColor: 'var(--color-primary)',
            height: '26px',
            display: 'flex',
            alignItems: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1002,
            fontFamily: '"Poppins", sans-serif',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <style>{`
            @keyframes marquee-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-content {
              display: flex;
              width: max-content;
              animation: marquee-scroll 35s linear infinite;
            }
            .marquee-text {
              padding: 0 1.5rem;
              font-size: 0.68rem;
              font-weight: 600;
              color: #ffffff;
              letter-spacing: 1px;
              text-transform: uppercase;
              display: flex;
              align-items: center;
              gap: 1.5rem;
              white-space: nowrap;
            }
            .ann-close-btn {
              flex-shrink: 0;
              width: 22px;
              height: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.18);
              border: none;
              border-radius: 50%;
              cursor: pointer;
              margin-right: 6px;
              transition: background 0.15s;
              z-index: 2;
            }
            .ann-close-btn:hover, .ann-close-btn:active {
              background: rgba(255,255,255,0.35);
            }
          `}</style>

          {/* Marquee Text */}
          <div className="marquee-content" style={{ flex: 1, overflow: 'hidden' }}>
            {[0, 1].map((group) => (
              <div key={group} style={{ display: 'flex' }}>
                {items.map((item, i) => {
                  const Icon = (typeof item.icon === 'string' ? iconMap[item.icon] : item.icon) || Sparkles;
                  return (
                    <div key={i} className="marquee-text">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Icon size={12} strokeWidth={2.5} style={{ color: '#ffffff', opacity: 1 }} />
                        {item.text?.replace(/\*\*/g, '')}
                      </span>
                      <Sparkles size={10} style={{ color: '#ffffff', opacity: 0.9 }} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Close Button */}
          <button
            className="ann-close-btn"
            onClick={(e) => { e.stopPropagation(); closeBar(); }}
            aria-label="Close announcement bar"
          >
            <X size={11} color="#ffffff" strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBar;
