import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from '@/hooks/useRouterShim';

const FloatingCart = () => {
  const { getCartCount, getCartTotal, isCartOpen, setIsCartOpen } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const count = getCartCount();
  const total = getCartTotal();

  const [showCart, setShowCart] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detect mobile
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const distanceToBottom = scrollHeight - clientHeight - scrollTop;

      // Hide near footer
      if (distanceToBottom < 360) {
        setShowCart(false);
      } else {
        setShowCart(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [count]);

  if (!mounted || count === 0 || isCartOpen || !showCart) return null;

  return (
    <AnimatePresence>
      <div
        key="full"
        style={{
          position: 'fixed',
          bottom: isMobile ? '78px' : '2.5rem',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: isMobile ? '0 1rem' : '0 1.5rem',
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'bottom 0.3s ease'
        }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.9 }}
          whileHover={{ y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.6rem' : '1.25rem',
            background: 'linear-gradient(135deg, rgba(54, 9, 16, 0.96) 0%, rgba(36, 5, 10, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: '#ffffff',
            padding: isMobile ? '0.3rem 0.35rem 0.3rem 0.95rem' : '0.5rem 0.5rem 0.5rem 1.5rem',
            borderRadius: '100px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            boxShadow: isMobile ? '0 8px 25px rgba(54, 9, 16, 0.4)' : '0 20px 50px rgba(54, 9, 16, 0.5)',
            maxWidth: '100%',
            width: 'auto',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Left: Cart Icon, Count & Subtotal (Clicking opens Cart Drawer) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (setIsCartOpen) setIsCartOpen(true);
            }}
            title="Open Cart Drawer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.55rem' : '1rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <motion.div
              animate={isAnimating ? { y: [-5, 2, -2, 0] } : {}}
              transition={{ duration: 0.35 }}
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <ShoppingCart size={isMobile ? 17 : 22} strokeWidth={2} color="#facc15" />
              <motion.div
                key={count}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  backgroundColor: '#facc15',
                  color: '#360910',
                  width: isMobile ? '16px' : '20px',
                  height: isMobile ? '16px' : '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '0.62rem' : '0.75rem',
                  fontWeight: 900,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  border: '1.5px solid #360910'
                }}
              >
                {count}
              </motion.div>
            </motion.div>

            {/* Divider */}
            <div style={{ width: '1px', height: isMobile ? '18px' : '24px', backgroundColor: 'rgba(212, 175, 55, 0.3)' }} />

            {/* Total Price Display */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: isMobile ? '50px' : '70px' }}>
              <span style={{ fontSize: isMobile ? '0.55rem' : '0.62rem', fontWeight: 600, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sacred Order</span>
              <span style={{ fontSize: isMobile ? '0.82rem' : '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Right: Checkout Button (Clicking navigates to /checkout) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/checkout');
            }}
            title="Proceed to Checkout"
            style={{
              padding: isMobile ? '0.38rem 0.85rem' : '0.75rem 1.75rem',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.3rem' : '0.6rem',
              fontWeight: 800,
              fontSize: isMobile ? '0.72rem' : '0.88rem',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #c5a059 0%, #e0c27b 100%)',
              color: '#2a050c',
              boxShadow: '0 3px 12px rgba(197, 160, 89, 0.4)',
              userSelect: 'none'
            }}
          >
            {/* Sleek Shimmer Reflection */}
            <motion.div
              animate={{ left: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', repeatDelay: 1.5 }}
              style={{
                position: 'absolute',
                top: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                transform: 'skewX(-25deg)',
                pointerEvents: 'none'
              }}
            />

            <span>Checkout</span>
            <motion.div
              animate={isHovered ? { x: 3 } : { x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <ArrowRight size={isMobile ? 13 : 16} strokeWidth={3} />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FloatingCart;
