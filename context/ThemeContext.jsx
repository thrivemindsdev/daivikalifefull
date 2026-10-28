'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ThemeContext = createContext({
  theme: 'daivika',
  setTheme: () => {},
  toggleTheme: () => {},
  isJewels: false
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('daivika');
  const pathname = usePathname();

  const setTheme = (newTheme) => {
    setThemeState('daivika');
    if (typeof window !== 'undefined') {
      localStorage.setItem('daivika_theme', 'daivika');
      document.documentElement.setAttribute('data-theme', 'daivika');
      document.body.setAttribute('data-theme', 'daivika');
      
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0a0a0a');
      }

      window.dispatchEvent(new CustomEvent('daivika_theme_changed', { detail: { theme: 'daivika' } }));
    }
  };

  const toggleTheme = () => {
    setTheme('daivika');
  };

  // Ensure theme is always unified Daivika
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setThemeState('daivika');
    localStorage.setItem('daivika_theme', 'daivika');
    document.documentElement.setAttribute('data-theme', 'daivika');
    document.body.setAttribute('data-theme', 'daivika');
  }, [pathname]);

  // Listen for custom event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleThemeEvent = (e) => {
      setThemeState('daivika');
      document.documentElement.setAttribute('data-theme', 'daivika');
      document.body.setAttribute('data-theme', 'daivika');
    };

    window.addEventListener('daivika_theme_changed', handleThemeEvent);
    return () => window.removeEventListener('daivika_theme_changed', handleThemeEvent);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme: 'daivika',
      setTheme,
      toggleTheme,
      isJewels: false
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
