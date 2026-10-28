import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // If ChunkLoadError / network loading failed, automatically reload page once
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to load resource');

    if (isChunkError && typeof window !== 'undefined') {
      const reloaded = sessionStorage.getItem('chunk_error_reloaded');
      if (!reloaded) {
        sessionStorage.setItem('chunk_error_reloaded', '1');
        window.location.reload();
        return;
      }
    }
  }

  componentDidMount() {
    // Reset the reload tracker when app loads successfully
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chunk_error_reloaded');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          color: '#111827',
          fontFamily: '"Poppins", sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', maxWidth: '400px', marginBottom: '2rem' }}>
            We encountered an unexpected error. Our team has been notified.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0a0a0a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
