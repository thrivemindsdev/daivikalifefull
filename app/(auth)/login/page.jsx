'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ArrowLeft, ArrowRight, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from '@/hooks/useRouterShim';
import useMobileAuth from '@/hooks/useMobileAuth';
const defaultLogo = '/logo.png?v=daivika_v3';

// One login for everyone: mobile number + password. The number and password from the server's .env give admin
// access; vendors and customers use their own. Register and forgot-password verify the number with one OTP.
const Login = () => {
  const isLogin = true;
  const [showPassword, setShowPassword] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const auth = useMobileAuth({
    onSuccess: (u) => navigate(u?.role === 'admin' ? '/admin/dashboard' : u?.role === 'vendor' ? '/vendor/dashboard' : '/'),
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const visualPanelRef = useRef(null);

  const handleMouseMove = (e) => {
    if (visualPanelRef.current) {
      const rect = visualPanelRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  // Login / Register tabs (forgot password is reached from the login tab)
  const switchMode = (next) => {
    if (next === auth.mode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      auth.setMode(next);
      setTimeout(() => setIsTransitioning(false), 200);
    }, 150);
  };

  return (
    <div className="login-wrapper">
      <style>{`
        .login-wrapper {
          height: 100vh;
          min-height: 100vh;
          width: 100%;
          background-color: #ffffff;
          font-family: 'Poppins', sans-serif;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }

        .login-split-container {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        /* sliding panels setup on desktop */
        .login-visual-panel {
          width: 58%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 5;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
          transition: transform 0.85s cubic-bezier(0.76, 0, 0.24, 1);
          overflow: hidden;
        }

        .login-visual-panel.state-signup {
          transform: translateX(72.41%); /* Math: moves Visual Pane perfectly to the right */
        }

        .login-visual-panel::before {
          display: none;
        }

        /* Ambient Glowing Mesh & Grid Layers */
        .visual-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 45px 45px;
          z-index: 1;
          pointer-events: none;
        }

        .visual-glow-orb-1 {
          position: absolute;
          top: 10%;
          left: 10%;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(166, 124, 82, 0.09) 0%, rgba(166, 124, 82, 0) 70%);
          filter: blur(80px);
          z-index: 2;
          pointer-events: none;
          animation: float-orb-1 20s infinite alternate ease-in-out;
        }

        .visual-glow-orb-2 {
          position: absolute;
          bottom: 10%;
          right: 15%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%);
          filter: blur(100px);
          z-index: 2;
          pointer-events: none;
          animation: float-orb-2 25s infinite alternate ease-in-out;
        }

        .visual-glow-orb-3 {
          position: absolute;
          top: 40%;
          left: 50%;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0) 70%);
          filter: blur(90px);
          z-index: 2;
          pointer-events: none;
          animation: float-orb-3 22s infinite alternate ease-in-out;
        }

        .visual-spotlight {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle 350px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.07), transparent 80%);
          z-index: 3;
          pointer-events: none;
          transition: background 0.15s ease;
        }

        @keyframes float-orb-1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
          100% { transform: translate(-30px, 80px) scale(0.95); }
        }

        @keyframes float-orb-2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, -60px) scale(1.15); }
          100% { transform: translate(40px, 30px) scale(0.9); }
        }

        @keyframes float-orb-3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 60px) scale(0.9); }
          100% { transform: translate(50px, -30px) scale(1.1); }
        }

        .visual-header {
          display: flex;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .visual-logo-img {
          height: clamp(105px, 15vh, 135px);
          width: auto;
          object-fit: contain;
          margin-left: -20px; /* Precise visual alignment adjustment for larger size */
          margin-top: -15px;
          transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
        }

        .visual-logo-img:hover {
          transform: scale(1.03);
          filter: drop-shadow(0 0 20px rgba(166, 124, 82, 0.25));
        }

        .visual-content {
          position: relative;
          z-index: 10;
          max-width: 500px;
          margin-top: auto;
          transition: opacity 0.25s ease-in-out, transform 0.25s ease-in-out;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 2.2rem 2.5rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .visual-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          color: #a67c52; /* Golden Accent */
          margin-bottom: 1rem;
          border: 1px solid rgba(166, 124, 82, 0.25);
          padding: 0.4rem 0.9rem;
          border-radius: 100px;
          background: rgba(166, 124, 82, 0.04);
        }

        .visual-tag-dot {
          width: 6px;
          height: 6px;
          background-color: #a67c52;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #a67c52;
          animation: pulse-dot 1.8s infinite;
        }

        @keyframes pulse-dot {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 12px #a67c52; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        .visual-title {
          font-size: clamp(1.8rem, 3.8vh, 2.5rem);
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.5px;
          margin-bottom: 1rem;
          background: linear-gradient(120deg, #ffffff 60%, rgba(255,255,255,0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .visual-description {
          font-size: clamp(0.9rem, 1.6vh, 0.95rem);
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.6;
          font-weight: 300;
          margin: 0;
        }

        /* Clean Minimal Form Panel */
        .login-form-panel {
          width: 42%;
          height: 100%;
          position: absolute;
          top: 0;
          right: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem clamp(1.5rem, 5vw, 4rem);
          background-color: #ffffff;
          box-sizing: border-box;
          transition: transform 0.85s cubic-bezier(0.76, 0, 0.24, 1);
          overflow-y: auto;
          scrollbar-width: none;
        }

        .login-form-panel.state-signup {
          transform: translateX(-138.1%); /* Math: moves Form Pane perfectly to the left */
        }
        
        .login-form-panel::-webkit-scrollbar {
          display: none;
        }

        .login-form-container {
          width: 100%;
          max-width: 380px;
          margin: auto;
          position: relative;
          z-index: 2;
          transition: opacity 0.25s ease-in-out, transform 0.25s ease-in-out;
        }

        /* Mobile Logo Styling */
        .mobile-logo-wrapper {
          display: none;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .mobile-logo-img {
          height: 75px;
          width: auto;
          object-fit: contain;
        }

        /* Shifting Ambient glow in Form panel */
        .form-ambient-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(189, 155, 59, 0.07) 0%, rgba(0,0,0,0) 70%);
          pointer-events: none;
          z-index: 1;
          transition: all 1.2s cubic-bezier(0.76, 0, 0.24, 1);
        }

        .form-ambient-glow.state-login {
          bottom: -50px;
          right: -50px;
        }

        .form-ambient-glow.state-signup {
          top: -50px;
          left: -50px;
        }

        .back-to-store-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-decoration: none;
          margin-bottom: clamp(1.2rem, 3vh, 2rem);
          transition: all 0.3s ease;
        }

        .back-to-store-link:hover {
          color: #0a0a0a;
          transform: translateX(-4px);
        }

        .form-header {
          margin-bottom: clamp(1.2rem, 3vh, 2rem);
        }

        .form-title {
          font-size: clamp(1.6rem, 3.5vh, 1.95rem);
          font-weight: 800;
          color: #0a0a0a;
          letter-spacing: -0.5px;
          margin-bottom: 0.4rem;
        }

        .form-subtitle {
          font-size: 0.88rem;
          color: #6b7280;
          line-height: 1.45;
        }

        .input-group-minimal {
          margin-bottom: clamp(1rem, 1.8vh, 1.4rem);
          position: relative;
        }

        .auth-tabs {
          display: flex;
          background: #f3f4f6;
          padding: 0.3rem;
          border-radius: 9999px;
          margin-bottom: 1.6rem;
          border: 1px solid rgba(10, 10, 10, 0.05);
        }

        .auth-tab {
          flex: 1;
          padding: 0.6rem 1rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #6b7280;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-tab.active {
          color: #0a0a0a;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(10, 10, 10, 0.08);
        }

        .label-minimal {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #0a0a0a;
          letter-spacing: 1.5px;
          margin-bottom: 0.4rem;
          transition: color 0.3s ease;
        }

        .input-group-minimal:focus-within .label-minimal {
          color: #0a0a0a;
        }

        .input-wrapper-minimal {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon-minimal {
          position: absolute;
          left: 0;
          color: #0a0a0a;
          pointer-events: none;
          transition: transform 0.3s ease;
        }

        .input-group-minimal:focus-within .input-icon-minimal {
          transform: scale(1.1);
        }

        .input-field-minimal {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 2px solid rgba(6, 36, 30, 0.08);
          border-radius: 0;
          padding: 0.75rem 2.5rem 0.75rem 1.6rem;
          color: #0a0a0a;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.3s ease;
          box-sizing: border-box;
        }

        .input-field-minimal:focus {
          border-bottom-color: #0a0a0a;
        }

        .input-field-minimal::placeholder {
          color: #9ca3af;
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .password-toggle-minimal {
          position: absolute;
          right: 0;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.3s ease;
        }

        .password-toggle-minimal:hover {
          color: #0a0a0a;
        }

        .error-box-minimal {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.04);
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.2rem;
          text-align: center;
        }

        .btn-submit-commercial {
          width: 100%;
          padding: 1.1rem;
          border-radius: 50px;
          background-color: #0a0a0a;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          border: none;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          box-shadow: 0 8px 25px rgba(6, 36, 30, 0.12);
        }

        .btn-submit-commercial:hover {
          background-color: #041915; /* Darker Green on Hover */
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(6, 36, 30, 0.18);
        }

        .btn-submit-commercial:active {
          transform: translateY(1px);
        }

        .toggle-text-minimal {
          text-align: center;
          margin-top: 2.2rem;
          font-size: 0.88rem;
          color: #6b7280;
        }

        .toggle-link-minimal {
          background: none;
          border: none;
          color: #0a0a0a;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-size: 0.88rem;
          margin-left: 0.25rem;
          transition: color 0.3s ease;
        }

        .toggle-link-minimal:hover {
          color: #0a0a0a;
          text-decoration: underline;
        }

        /* Absolute responsiveness overrides */
        @media (max-width: 1024px) {
          .login-split-container {
            display: block;
            overflow-y: auto;
          }
          .login-visual-panel {
            display: none !important;
          }
          .login-form-panel {
            width: 100% !important;
            height: 100vh !important;
            position: relative !important;
            transform: none !important;
            padding: 3rem 1.5rem !important;
          }
          .mobile-logo-wrapper {
            display: block !important;
          }
          .form-header {
            text-align: center;
          }
          .back-to-store-link {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>

      <div className="login-split-container">
        {/* Brand Left Panel */}
        <div 
          className={`login-visual-panel ${isLogin ? 'state-login' : 'state-signup'}`}
        >
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            border: '1px solid rgba(197, 160, 89, 0.25)'
          }}>
            <img 
              src="/login-spiritual-hero.jpg" 
              alt="Daivika Sacred Spiritual Collection" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                display: 'block',
                opacity: 1
              }}
            />
          </div>
        </div>

        {/* Form Right Panel */}
        <div className={`login-form-panel ${isLogin ? 'state-login' : 'state-signup'}`}>
          {/* Ambient Glowing Aura */}
          <div className={`form-ambient-glow ${isLogin ? 'state-login' : 'state-signup'}`} />

          <div 
            className="login-form-container"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
            }}
          >
            {/* Mobile-only logo */}
            <div className="mobile-logo-wrapper">
              <Link to="/" style={{ display: 'inline-block' }}>
                <img src={defaultLogo} alt="Daivika Logo" className="mobile-logo-img" />
              </Link>
            </div>

            {/* Back to store navigation */}
            <Link to="/" className="back-to-store-link">
              <ArrowLeft size={14} /> Back to Store
            </Link>

            {/* Form Header */}
            <div className="form-header">
              <h1 className="form-title">
                {auth.title}
              </h1>
              <p className="form-subtitle">
                {auth.subtitle}
              </p>
            </div>

            {/* Login / Register tabs */}
            <div className="auth-tabs" role="tablist">
              {[['login', 'Login'], ['signup', 'Register']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={auth.mode === id || (id === 'login' && auth.mode === 'reset')}
                  className={`auth-tab ${auth.mode === id || (id === 'login' && auth.mode === 'reset') ? 'active' : ''}`}
                  onClick={() => switchMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>

              <form onSubmit={auth.submit}>
                <div className="input-group-minimal">
                  <label className="label-minimal">Mobile Number</label>
                  <div className="input-wrapper-minimal">
                    <Phone size={16} className="input-icon-minimal" />
                    <input
                      type="text"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="10-digit Mobile Number"
                      value={auth.phone}
                      onChange={(e) => auth.setPhone(e.target.value)}
                      required
                      className="input-field-minimal"
                    />
                  </div>
                </div>

                {/* Sign-up / reset: after the OTP is sent */}
                {auth.otpSent && (
                  <div className="input-group-minimal">
                    <label className="label-minimal">OTP</label>
                    <div className="input-wrapper-minimal">
                      <Lock size={16} className="input-icon-minimal" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        placeholder="Enter OTP"
                        value={auth.otp}
                        onChange={(e) => auth.setOtp(e.target.value)}
                        required
                        className="input-field-minimal"
                      />
                    </div>
                  </div>
                )}

                {auth.otpSent && (
                  <div className="form-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    <span>{auth.info}</span>
                    <button type="button" onClick={auth.resend} disabled={auth.busy} className="toggle-link-minimal">
                      Resend OTP
                    </button>
                  </div>
                )}

                {auth.mode === 'signup' && auth.otpSent && (
                  <div className="input-group-minimal">
                    <label className="label-minimal">Full Name</label>
                    <div className="input-wrapper-minimal">
                      <User size={16} className="input-icon-minimal" />
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="Your Full Name"
                        value={auth.name}
                        onChange={(e) => auth.setName(e.target.value)}
                        required
                        className="input-field-minimal"
                      />
                    </div>
                  </div>
                )}

                {auth.showPassword && (
                  <div className="input-group-minimal">
                    <label className="label-minimal">{auth.mode === 'login' ? 'Password' : auth.mode === 'reset' ? 'New Password' : 'Set Password'}</label>
                    <div className="input-wrapper-minimal">
                      <Lock size={16} className="input-icon-minimal" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={auth.mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="••••••••"
                        value={auth.password}
                        onChange={(e) => auth.setPassword(e.target.value)}
                        required
                        className="input-field-minimal"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-minimal">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {auth.showConfirm && (
                  <div className="input-group-minimal">
                    <label className="label-minimal">Confirm Password</label>
                    <div className="input-wrapper-minimal">
                      <Lock size={16} className="input-icon-minimal" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={auth.confirmPassword}
                        onChange={(e) => auth.setConfirmPassword(e.target.value)}
                        required
                        className="input-field-minimal"
                      />
                    </div>
                  </div>
                )}

                {auth.mode === 'login' && (
                  <div className="form-subtitle" style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    <button type="button" onClick={() => auth.setMode('reset')} className="toggle-link-minimal">
                      Forgot password?
                    </button>
                  </div>
                )}

                {auth.error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="error-box-minimal"
                  >
                    {auth.error}
                  </motion.div>
                )}

                <button type="submit" className="btn-submit-commercial" style={{ position: 'relative' }} disabled={auth.busy}>
                  <span>{auth.submitLabel}</span>
                  <ArrowRight size={16} style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                </button>
              </form>

            {/* Below the form: switch between login and register */}
            <div className="toggle-text-minimal">
              {auth.mode === 'signup' ? 'Already have an account? ' : 'New to Daivika? '}
              <button type="button" onClick={() => switchMode(auth.mode === 'signup' ? 'login' : 'signup')} className="toggle-link-minimal">
                {auth.mode === 'signup' ? 'Log In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

