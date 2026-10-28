'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_LOADER_LOGO } from './loaderLogo';

export default function PageLoader({ loading }) {
  // Start the same as the server render (stored values are applied before the first paint below);
  // reading browser storage here made returning visitors' pages fail hydration.
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOADER_LOGO);
  const [isActive, setIsActive] = useState(true);

  // Already shown once in this browser session: hide before the browser paints, so it never flashes
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem('daivika_initial_loaded')) setIsActive(false);
    } catch {}
  }, []);

  // Keep brand details updated if localStorage changes
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
      }
    } catch (e) {
      console.error('Error loading logo from local storage in loader:', e);
    }
  }, []);

  // Enforce a minimum display time of 2200ms to allow the premium intro to play fully
  useEffect(() => {
    let timer;
    const minDuration = 2200;
    const startTime = Date.now();

    const checkAndExit = () => {
      if (!loading) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= minDuration) {
          setIsActive(false);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('daivika_initial_loaded', 'true');
          }
        } else {
          timer = setTimeout(() => {
            setIsActive(false);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('daivika_initial_loaded', 'true');
            }
          }, minDuration - elapsed);
        }
      }
    };

    checkAndExit();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  // Lock body scroll while loader is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  const handleLogoError = () => {
    setLogoUrl(DEFAULT_LOADER_LOGO);
  };

  const activeLogo = logoUrl || DEFAULT_LOADER_LOGO;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ 
            y: '-100%', 
            transition: { duration: 0.95, ease: [0.76, 0, 0.24, 1] } 
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#FAF8F5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            pointerEvents: 'all',
            overflow: 'hidden',
          }}
        >
          {/* Main Logo Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            exit={{ 
              opacity: 0,
              y: -15,
              transition: { duration: 0.4, ease: 'easeOut' }
            }}
            style={{ 
              position: 'relative',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Base Logo Image (Rendered directly, no background or border boxes) */}
            <img
              src={activeLogo}
              alt="Logo"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: 0.85
              }}
              onError={handleLogoError}
            />

            {/* Glowing / Shining overlay masked precisely to the logo outline */}
            <div style={{
              position: 'absolute',
              inset: 0,
              maskImage: `url(${activeLogo})`,
              WebkitMaskImage: `url(${activeLogo})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              pointerEvents: 'none'
            }}>
              <motion.div
                initial={{ x: '-150%' }}
                animate={{ x: '150%' }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatDelay: 0.8,
                  ease: "easeInOut"
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.85) 45%, rgba(166, 124, 82, 0.6) 50%, rgba(255, 255, 255, 0.85) 55%, transparent 70%)',
                  transform: 'skewX(-20deg)'
                }}
              />
            </div>
          </motion.div>

          {/* Minimal 1px Progress Bar at the bottom */}
          <div style={{
            position: 'absolute',
            bottom: '5rem',
            width: '80px',
            height: '1px',
            backgroundColor: 'rgba(166, 124, 82, 0.1)',
            overflow: 'hidden'
          }}>
            <motion.div
              initial={{ scaleX: 0, transformOrigin: 'left' }}
              animate={{ scaleX: 1 }}
              transition={{ 
                duration: 2.2, 
                ease: 'easeInOut'
              }}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#a67c52'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
