'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CartDrawer from '../../components/CartDrawer';
import FloatingCart from '../../components/FloatingCart';
import ScrollToTop from '../../components/ScrollToTop';
import WelcomeCouponPopup from '../../components/WelcomeCouponPopup';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StoreLayout({ children }) {
  const pathname = usePathname();
  const isCheckout = pathname === '/checkout';
  const { user, loading } = useAuth();
  const hideHeaderFooter = isCheckout;
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer;
    const handleToast = (e) => {
      const { message, type = 'success' } = e.detail || {};
      setToast({ show: true, message, type });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
    };
    window.addEventListener('show_toast', handleToast);
    return () => {
      window.removeEventListener('show_toast', handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vaugun_store_gender', 'all');
    }
  }, []);

  useEffect(() => {
    // Strictly force static premium Green & Gold colors
    const primaryColor = '#0a0a0a';
    const primaryRgb = '6, 36, 30';
    const accentColor = '#0a0a0a';

    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-rgb', primaryRgb);
    document.documentElement.style.setProperty('--color-accent', accentColor);
    document.documentElement.style.setProperty('--color-accent-hover', primaryColor);

    // Clear any existing legacy local storage theme to prevent other side effects
    localStorage.removeItem('vaugun_theme_settings');
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setShowLogoutToast(true);
      setTimeout(() => setShowLogoutToast(false), 4000);
    };
    window.addEventListener('vaugun_logout_success', handleLogout);
    return () => window.removeEventListener('vaugun_logout_success', handleLogout);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="app-container">
      {!hideHeaderFooter && (
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
      )}
      
      {/* Premium Logout Toast */}
      <AnimatePresence>
        {showLogoutToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              width: 'max-content',
              zIndex: 9999999,
              backgroundColor: '#111827',
              color: '#fff',
              padding: '1rem 2rem',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(54, 9, 16, 0.15)',
              color: '#360910',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
               <CheckCircle2 size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.5px' }}>Successfully logged out</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Securely disconnected from this device</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Global Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(e, info) => {
              if (Math.abs(info.offset.x) > 80) {
                setToast(prev => ({ ...prev, show: false }));
              }
            }}
            whileDrag={{ scale: 0.95 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: 0,
              right: 0,
              margin: '0 auto',
              width: 'max-content',
              maxWidth: 'calc(100vw - 2rem)',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              padding: '0.6rem 1.4rem',
              borderRadius: '9999px',
              zIndex: 99999999,
              fontWeight: 600,
              fontSize: '0.825rem',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none',
              fontFamily: "'Poppins', sans-serif"
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: toast.type === 'error' ? '#ef4444' : '#360910',
              boxShadow: `0 0 10px ${toast.type === 'error' ? '#ef4444' : '#360910'}`,
              flexShrink: 0
            }}></span>
            {toast.type === 'error' ? (
              <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={14} color="#360910" style={{ flexShrink: 0 }} />
            )}
            <span style={{ 
              letterSpacing: '-0.1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
 
      {!hideHeaderFooter && (
        <>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <CartDrawer />
          <WelcomeCouponPopup />
        </>
      )}
      {!isCheckout && !hideHeaderFooter && <FloatingCart />}
 
      <main 
        className={`main-content ${pathname === '/' ? 'home-page' : ''} ${pathname.startsWith('/product/') ? 'product-page' : ''}`}
      >
        <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontWeight: 600 }}>Loading...</div>}>
          {children}
        </Suspense>
        {!hideHeaderFooter && <Footer />}
      </main>
 
    </div>
  );
}

