'use client';

import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const AlertContext = createContext({
  showAlert: () => Promise.resolve(),
  showConfirm: () => Promise.resolve(false)
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [dialog, setDialog] = useState({
    isOpen: false,
    message: '',
    title: '',
    type: 'alert', // 'alert' or 'confirm'
    resolve: null
  });

  const showAlert = (message, title = 'Notice') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        message,
        title,
        type: 'alert',
        resolve
      });
    });
  };

  const showConfirm = (message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        message,
        title,
        type: 'confirm',
        resolve
      });
    });
  };

  const handleClose = (value) => {
    if (dialog.resolve) {
      dialog.resolve(value);
    }
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      <AnimatePresence>
        {dialog.isOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dialog.type === 'alert' && handleClose(true)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(6, 61, 51, 0.4)',
                backdropFilter: 'blur(4px)'
              }}
            />

            {/* Dialog Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(6, 61, 51, 0.15)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '420px',
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(6, 61, 51, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                fontFamily: '"Poppins", sans-serif'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <div style={{
                  backgroundColor: '#f4fbf9',
                  borderRadius: '12px',
                  padding: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #d1fae5',
                  flexShrink: 0,
                  color: '#0a0a0a'
                }}>
                  {dialog.type === 'confirm' ? (
                    <AlertTriangle size={22} color="#a67c52" />
                  ) : (
                    <CheckCircle2 size={22} color="#0a0a0a" />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0a0a0a', margin: 0, lineHeight: 1.3 }}>
                    {dialog.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0.4rem 0 0 0', lineHeight: 1.5, fontWeight: 500, textAlign: 'left' }}>
                    {dialog.message}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                {dialog.type === 'confirm' && (
                  <button
                    onClick={() => handleClose(false)}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '100px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #d1d5db',
                      color: '#4b5563',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => handleClose(true)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '100px',
                    backgroundColor: '#0a0a0a',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(6, 61, 51, 0.15)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
};
