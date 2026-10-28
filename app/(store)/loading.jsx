export default function StoreLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F5',
      fontFamily: '"Poppins", sans-serif',
      padding: '100px 2rem 4rem 2rem',
      maxWidth: '1560px',
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%);
          background-size: 400px 100%;
          animation: skeleton-shimmer 1.4s ease-in-out infinite;
          border-radius: 12px;
        }
      `}</style>

      {/* Hero skeleton */}
      <div className="skeleton" style={{ height: '42vh', minHeight: '280px', borderRadius: '28px', marginBottom: '2.5rem' }} />

      {/* Category tabs skeleton */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'hidden' }}>
        {[120, 140, 110, 130, 120, 145].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: '44px', width: `${w}px`, borderRadius: '50px', flexShrink: 0 }} />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1.5rem',
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ aspectRatio: '1', borderRadius: '18px', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '0.5rem' }} />
            <div className="skeleton" style={{ height: '12px', width: '55%', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: '38px', borderRadius: '10px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
