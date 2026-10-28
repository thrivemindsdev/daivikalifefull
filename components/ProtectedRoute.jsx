import React from 'react';
import Navigate from './Navigate';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const ProtectedRoute = ({ children, adminOnly = false, vendorOnly = false }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show a stunning, interactive loading screen during auth validation
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 40%, #5c1520 0%, #360910 45%, #28060b 100%)',
        color: '#fde68a',
        gap: '1.25rem',
        fontFamily: '"Poppins", sans-serif'
      }}>
        <img src="/logo-light.png" alt="Daivika" style={{ height: '64px', width: 'auto', objectFit: 'contain' }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <Loader2 size={28} color="#c5831a" strokeWidth={2.5} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' }}
        >
          Signing you in
        </motion.div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If admin permission is required but user is not admin
  if ((adminOnly && user?.role !== 'admin') || (vendorOnly && user?.role !== 'vendor')) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0515',
        color: '#fff',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '2.5rem',
            borderRadius: '32px',
            maxWidth: '500px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <ShieldAlert size={44} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>ACCESS RESTRICTED</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {vendorOnly
                ? 'This dashboard is only for vendor accounts created by the Daivika admin.'
                : 'This interface is reserved for authorized store administrators. Regular customer profiles cannot access this system.'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#fff',
              color: '#000',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }}
          >
            RETURN TO HOMEPAGE
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
