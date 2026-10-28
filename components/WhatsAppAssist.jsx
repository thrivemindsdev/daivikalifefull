'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WhatsAppAssist = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [windowHeight, setWindowHeight] = useState(800);
  const [mounted, setMounted] = useState(false);

  const touchStartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setWindowHeight(window.innerHeight);

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // IntersectionObserver to fade out near footer
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.05,
        rootMargin: '0px 0px 50px 0px' // Starts fading 50px before footer enters viewport
      }
    );

    const footer = document.querySelector('.footer-root');
    if (footer) {
      observer.observe(footer);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (footer) {
        observer.unobserve(footer);
      }
    };
  }, []);

  // Click away listener to close the panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileOpen]);

  if (!mounted) return null;

  const whatsappUrl = "https://wa.me/917510821228?text=Hello%20Daivika!%20I'm%20visiting%20your%20website%20and%20have%20a%20question.";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          drag="y"
          dragConstraints={{ 
            top: 80 - (windowHeight * 0.6), 
            bottom: windowHeight - 120 - (windowHeight * 0.6) 
          }}
          dragElastic={0.1}
          dragMomentum={false}
          style={{
            position: 'fixed',
            left: 0,
            top: '60%',
            zIndex: 99999,
            touchAction: 'none' // Prevents screen scrolling while dragging the widget vertically
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .mobile-wa-container {
              display: flex;
              align-items: center;
              position: relative;
            }
            .mobile-wa-handle {
              background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
              color: #ffffff;
              padding: 16px 14px 16px 12px;
              border-radius: 0 16px 16px 0;
              box-shadow: 4px 4px 16px rgba(18, 140, 126, 0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-left: none;
              user-select: none;
            }
            .mobile-wa-drag-indicator {
              display: flex;
              flex-direction: column;
              gap: 4px;
              opacity: 0.95;
            }
            .mobile-wa-drag-dot {
              width: 5px;
              height: 5px;
              background-color: #ffffff;
              border-radius: 50%;
              box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            .mobile-wa-expanded-panel {
              background: rgba(10, 10, 10, 0.94);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-left: none;
              border-radius: 0 24px 24px 0;
              padding: 8px 12px 8px 14px;
              box-shadow: 10px 10px 30px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .mobile-wa-close-btn {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background-color: rgba(255, 255, 255, 0.08);
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              border: none;
              font-size: 0.85rem;
              font-weight: bold;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .mobile-wa-close-btn:active {
              background-color: rgba(255, 255, 255, 0.18);
            }
            .mobile-wa-chat-link {
              background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 100px;
              text-decoration: none;
              font-family: 'Poppins', sans-serif;
              font-size: 0.8rem;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 6px;
              box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
            }
          ` }} />

          <div className="mobile-wa-container">
            {!mobileOpen ? (
              // Collapsed handle (can swipe right to pull open) - Only shows vertical drag dots
              <div 
                className="mobile-wa-handle"
                onClick={() => setMobileOpen(true)}
                onTouchStart={(e) => {
                  touchStartRef.current = e.touches[0].clientX;
                }}
                onTouchMove={(e) => {
                  if (touchStartRef.current !== null) {
                    const diff = e.touches[0].clientX - touchStartRef.current;
                    if (diff > 30) {
                      setMobileOpen(true);
                      touchStartRef.current = null;
                    }
                  }
                }}
                onTouchEnd={() => {
                  touchStartRef.current = null;
                }}
              >
                <div className="mobile-wa-drag-indicator">
                  <div className="mobile-wa-drag-dot" />
                  <div className="mobile-wa-drag-dot" />
                  <div className="mobile-wa-drag-dot" />
                </div>
              </div>
            ) : (
              // Expanded horizontal panel (can swipe left to push close) - Shows only close button + link
              <motion.div 
                initial={{ x: -120, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -120, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="mobile-wa-expanded-panel"
                onTouchStart={(e) => {
                  touchStartRef.current = e.touches[0].clientX;
                }}
                onTouchMove={(e) => {
                  if (touchStartRef.current !== null) {
                    const diff = touchStartRef.current - e.touches[0].clientX;
                    if (diff > 30) {
                      setMobileOpen(false);
                      touchStartRef.current = null;
                    }
                  }
                }}
                onTouchEnd={() => {
                  touchStartRef.current = null;
                }}
              >
                <button className="mobile-wa-close-btn" onClick={() => setMobileOpen(false)}>
                  ✕
                </button>

                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-wa-chat-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <i className="fa-brands fa-whatsapp" style={{ fontSize: '18px', color: '#ffffff' }}></i>
                  WhatsApp Support
                </a>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatsAppAssist;
