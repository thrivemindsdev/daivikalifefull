import React, { useState, useEffect } from 'react';

const SubPageHeader = ({ title, subtitle }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="subpage-header-wrapper" style={{
      width: '100%',
      padding: isMobile ? '0.75rem 1rem 1rem 1rem' : '1.25rem 2rem 1.5rem 2rem',
      boxSizing: 'border-box',
      backgroundColor: 'transparent'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: isMobile ? '160px' : '200px',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 100%)',
        fontFamily: '"Poppins", sans-serif',
        borderRadius: isMobile ? '20px' : '32px',
        border: '1px solid rgba(189, 155, 59, 0.18)',
        boxShadow: '0 15px 35px rgba(6, 61, 51, 0.12)',
        boxSizing: 'border-box'
      }}>
        {/* Background floating leaf/doodle detail */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.04,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M10 20c5 0 8 3 8 8s-3 8-8 8-8-3-8-8 3-8 8-8zm40 60c3 0 5-2 5-5s-2-5-5-5-5 2-5 5 2 5 5 5zm30-40c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7zm-40-10c0-6 5-11 11-11s11 5 11 11-5 11-11 11-11-5-11-11zm80 40c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }} />

        {/* Glowing border detail */}
        <div style={{
          position: 'absolute',
          inset: '4px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: isMobile ? '16px' : '28px',
          pointerEvents: 'none'
        }} />

        {/* Content Box */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 1.5rem',
          zIndex: 2,
          boxSizing: 'border-box'
        }}>
          {subtitle && (
            <div style={{
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              fontWeight: 800,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#0a0a0a',
              marginBottom: '0.2rem'
            }}>
              {subtitle}
            </div>
          )}
          <h1 style={{
            fontSize: isMobile ? '1.4rem' : '2rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}>
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default SubPageHeader;

