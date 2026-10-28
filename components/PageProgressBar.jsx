'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const completeRef = useRef(null);
  // Skip the very first render (initial site load)
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip progress bar on initial page load — only show for client-side navigations
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Start bar on route change
    setVisible(true);
    setProgress(10);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(timerRef.current);
          return 85;
        }
        return prev + Math.random() * 12;
      });
    }, 200);

    // Complete after a tick (page has loaded)
    completeRef.current = setTimeout(() => {
      clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }, 600);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(completeRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        height: '3px',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #b5e76d, #63d68e, #b5e76d)',
          backgroundSize: '200% 100%',
          transition: progress === 100
            ? 'width 0.3s ease, opacity 0.4s ease'
            : 'width 0.2s ease',
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 10px rgba(181, 231, 109, 0.8), 0 0 4px rgba(181, 231, 109, 0.5)',
          borderRadius: '0 2px 2px 0',
          animation: 'shimmer-bar 1.5s linear infinite',
        }}
      />
      <style>{`
        @keyframes shimmer-bar {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
