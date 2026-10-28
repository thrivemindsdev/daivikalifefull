import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Phone } from 'lucide-react';

import { useNavigate } from '@/hooks/useRouterShim';
import useMobileAuth from '@/hooks/useMobileAuth';

const defaultLogo = '/logo.png?v=daivika_v3';

/* ─── Traditional SVG Motifs ─── */
const LotusTopBorder = () => (
  <svg width="100%" height="13" viewBox="0 0 400 13" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="ltpL" x="0" y="0" width="40" height="13" patternUnits="userSpaceOnUse">
        <path d="M20 12 Q10 6 0 12 Q10 1 20 4 Q30 1 40 12 Q30 6 20 12Z" fill="rgba(197,131,26,0.55)" />
        <circle cx="20" cy="4.5" r="1.8" fill="rgba(197,131,26,0.7)" />
      </pattern>
    </defs>
    <rect width="100%" height="13" fill="url(#ltpL)" />
  </svg>
);

const MandalaStrip = () => (
  <svg width="100%" height="18" viewBox="0 0 400 18" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="18" fill="#2a0508" />
    <defs>
      <pattern id="msL" x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="9" r="3.5" fill="none" stroke="rgba(197,131,26,0.4)" strokeWidth="0.7" />
        <circle cx="10" cy="9" r="1.2" fill="rgba(197,131,26,0.55)" />
        <line x1="10" y1="1" x2="10" y2="17" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
        <line x1="3" y1="9" x2="17" y2="9" stroke="rgba(197,131,26,0.18)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="18" fill="url(#msL)" />
  </svg>
);

// One login for everyone: mobile number + password (the .env number + password gives admin access, vendors use
// their own number). Register and forgot-password verify the number with one OTP.
const LoginModal = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const auth = useMobileAuth({
    onSuccess: (u) => {
      if (u?.role === 'admin') navigate('/admin/dashboard');
      else if (u?.role === 'vendor') navigate('/vendor/dashboard');
      onClose();
    },
  });

  const formError = auth.error;

  if (!isOpen) return null;

  /* shared input style */
  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem 0.8rem 2.6rem',
    borderRadius: '10px',
    border: '1.5px solid rgba(197,131,26,0.35)',
    backgroundColor: 'rgba(253,246,232,0.7)',
    fontSize: '0.9rem',
    color: '#1e0608',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: '"Poppins", serif',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.62rem', fontWeight: 700,
    textTransform: 'uppercase', color: '#7c4f2f',
    letterSpacing: '1px', marginBottom: '0.3rem',
  };
  const focusOn = e => { e.target.style.borderColor = '#c5831a'; e.target.style.backgroundColor = '#fffdf5'; e.target.style.boxShadow = '0 0 0 3px rgba(197,131,26,0.1)'; };
  const focusOff = e => { e.target.style.borderColor = 'rgba(197,131,26,0.35)'; e.target.style.backgroundColor = 'rgba(253,246,232,0.7)'; e.target.style.boxShadow = 'none'; };
  // One labelled input in the popup's style
  const renderInput = (label, Icon, props, extra = null) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Icon size={15} style={{ position: 'absolute', left: '0.9rem', color: '#c5831a', pointerEvents: 'none' }} />
        <input required {...props} style={{ ...inputStyle, ...(extra ? { paddingRight: '2.8rem' } : {}) }} onFocus={focusOn} onBlur={focusOff} />
        {extra}
      </div>
    </div>
  );
  const passwordToggle = (
    <button
      type="button" onClick={() => setShowPassword(!showPassword)}
      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#c5831a', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', outline: 'none' }}
      aria-label="Toggle password visibility"
    >
      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );
  const linkStyle = { background: 'none', border: 'none', color: '#360910', fontWeight: 800, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.75rem' };

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,2,2,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%', maxWidth: '460px',
            maxHeight: 'calc(100dvh - 2rem)',
            overflowY: 'auto',
            background: 'linear-gradient(170deg, #fdf6e8 0%, #f7e8c8 40%, #fdf0d5 100%)',
            borderRadius: '22px',
            border: '2px solid rgba(197,131,26,0.6)',
            boxShadow: '0 0 0 1px rgba(197,131,26,0.15), 0 30px 60px -12px rgba(54,9,16,0.45)',
            overflowX: 'hidden',
            fontFamily: '"Poppins", serif',
          }}
        >
          {/* Lotus top border */}
          <div style={{ lineHeight: 0 }}>
            <LotusTopBorder />
          </div>

          {/* Header bar */}
          <div style={{
            background: 'linear-gradient(135deg, #3d0b10 0%, #5c1520 50%, #3d0b10 100%)',
            padding: '0.85rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative',
          }}>
            <span style={{ position: 'absolute', top: 6, left: 10, fontSize: '0.65rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', top: 6, right: 46, fontSize: '0.65rem', color: 'rgba(197,131,26,0.5)', lineHeight: 1 }}>✦</span>
            <span style={{ position: 'absolute', bottom: 6, left: 10, fontSize: '0.48rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>
            <span style={{ position: 'absolute', bottom: 6, right: 46, fontSize: '0.48rem', color: 'rgba(197,131,26,0.35)', lineHeight: 1 }}>❖</span>

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
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fde68a', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: 1 }}>
                  Daivika
                </div>
                <div style={{ fontSize: '0.5rem', color: 'rgba(253,211,77,0.6)', letterSpacing: '0.6px', fontStyle: 'italic', marginTop: '2px' }}>
                  ── Sacred Experience ──
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                width: '30px', height: '30px', borderRadius: '50%',
                border: '1px solid rgba(197,131,26,0.5)', background: 'rgba(255,255,255,0.1)',
                cursor: 'pointer', color: '#fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: 'none', padding: 0, transition: 'all 0.2s', zIndex: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Mandala strip */}
          <div style={{ lineHeight: 0 }}>
            <MandalaStrip />
          </div>

          {/* Body */}
          <div style={{ padding: '1.75rem 2rem 2rem' }}>
            {/* Logo + title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img src={defaultLogo} alt="Daivika Logo" style={{ height: '44px', width: 'auto', margin: '0 auto 0.75rem auto', display: 'block', objectFit: 'contain' }} />
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.5px', color: '#7c4f2f',
                backgroundColor: 'rgba(197,131,26,0.1)',
                border: '1px solid rgba(197,131,26,0.3)',
                padding: '0.25rem 0.75rem', borderRadius: '100px', marginBottom: '0.6rem',
              }}>
                <Sparkles size={9} color="#c5831a" />
                Daivika Authentic Experience
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e0608', letterSpacing: '-0.3px', margin: '0 0 0.3rem 0' }}>
                {auth.title}
              </h2>
              <p style={{ color: '#7c4f2f', fontSize: '0.82rem', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
                {auth.subtitle}
              </p>
            </div>

            {/* Login / Register tabs (forgot password is reached from the login tab) */}
            <div role="tablist" style={{ display: 'flex', background: 'rgba(197,131,26,0.1)', padding: '0.25rem', borderRadius: '999px', marginBottom: '1.25rem', border: '1px solid rgba(197,131,26,0.25)' }}>
              {[['login', 'Login'], ['signup', 'Register']].map(([id, label]) => {
                const active = auth.mode === id || (id === 'login' && auth.mode === 'reset');
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { if (auth.mode !== id) auth.setMode(id); }}
                    style={{ flex: 1, padding: '0.55rem 1rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 800, color: active ? '#360910' : '#7c4f2f', background: active ? '#fffdf5' : 'transparent', boxShadow: active ? '0 3px 10px rgba(54,9,16,0.12)' : 'none', transition: 'all 0.2s' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={auth.submit}>
              {(
                <>
                  {renderInput('Mobile Number', Phone, { type: 'text', inputMode: 'tel', autoComplete: 'tel', placeholder: '10-digit Mobile Number', value: auth.phone, onChange: e => auth.setPhone(e.target.value) })}

                  {/* Sign-up / reset: after the OTP is sent */}
                  {auth.otpSent && (
                    <>
                      {renderInput('OTP', Lock, { type: 'text', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 8, placeholder: 'Enter OTP', value: auth.otp, onChange: e => auth.setOtp(e.target.value) })}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-0.6rem 0 1rem', fontSize: '0.72rem', color: '#7c4f2f' }}>
                        <span>{auth.info}</span>
                        <button type="button" onClick={auth.resend} disabled={auth.busy} style={linkStyle}>Resend OTP</button>
                      </div>
                    </>
                  )}

                  {auth.mode === 'signup' && auth.otpSent &&
                    renderInput('Full Name', User, { type: 'text', autoComplete: 'name', placeholder: 'Your Full Name', value: auth.name, onChange: e => auth.setName(e.target.value) })}

                  {auth.showPassword &&
                    renderInput(auth.mode === 'login' ? 'Password' : auth.mode === 'reset' ? 'New Password' : 'Set Password', Lock, {
                      type: showPassword ? 'text' : 'password', autoComplete: auth.mode === 'login' ? 'current-password' : 'new-password',
                      placeholder: '••••••••', value: auth.password, onChange: e => auth.setPassword(e.target.value),
                    }, passwordToggle)}

                  {auth.showConfirm &&
                    renderInput('Confirm Password', Lock, {
                      type: showPassword ? 'text' : 'password', autoComplete: 'new-password',
                      placeholder: '••••••••', value: auth.confirmPassword, onChange: e => auth.setConfirmPassword(e.target.value),
                    })}

                  {auth.mode === 'login' && (
                    <div style={{ textAlign: 'right', margin: '-0.5rem 0 1rem' }}>
                      <button type="button" onClick={() => auth.setMode('reset')} style={linkStyle}>Forgot password?</button>
                    </div>
                  )}
                </>
              )}

              {formError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{
                    color: '#991b1b', backgroundColor: 'rgba(254,226,226,0.8)',
                    padding: '0.65rem 1rem', borderRadius: '8px',
                    fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid rgba(253,164,164,0.6)',
                    marginBottom: '1rem', textAlign: 'center',
                  }}
                >
                  {formError}
                </motion.div>
              )}

              {/* Submit button — gold gradient */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: '0 14px 30px rgba(197,131,26,0.4)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '0.95rem',
                  background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                  color: '#2a0508', fontSize: '0.85rem', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                  border: 'none', borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginTop: '0.25rem',
                  boxShadow: '0 6px 20px rgba(197,131,26,0.35)',
                  position: 'relative', overflow: 'hidden', outline: 'none',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                    width: '40%',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>🪔 {auth.submitLabel}</span>
                <ArrowRight size={15} style={{ position: 'relative', zIndex: 1 }} />
              </motion.button>
            </form>

            {/* Below the form: switch between login and register */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: '#7c4f2f' }}>
              {auth.mode === 'signup' ? 'Already have an account? ' : 'New to Daivika? '}
              <button type="button" onClick={() => auth.setMode(auth.mode === 'signup' ? 'login' : 'signup')} style={{ ...linkStyle, fontSize: '0.82rem', marginLeft: '0.25rem' }}>
                {auth.mode === 'signup' ? 'Log In' : 'Create Account'}
              </button>
            </div>

            {/* Sanskrit footer */}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.56rem', color: 'rgba(120,70,30,0.5)', letterSpacing: '0.4px', fontStyle: 'italic' }}>
              ── शुभं भवतु · May your journey be blessed ──
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LoginModal;
