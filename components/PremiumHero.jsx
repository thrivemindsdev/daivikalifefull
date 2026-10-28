'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from '@/hooks/useRouterShim';
import { useTheme } from '@/context/ThemeContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDE_DURATION = 5000;

/**
 * Check if an image URL is an outdated legacy dummy/fashion placeholder
 */
export const isLegacyDummyImage = (url) => {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase();
  return u.includes('/assets/b1') || 
         u.includes('/assets/b2') || 
         u.includes('/assets/b3') || 
         u.includes('/assets/slide') || 
         u.includes('unsplash.com');
};

/**
 * Returns true if the given banner has at least one valid, non-dummy image URL
 */
const isValidBanner = (b) => {
  if (!b) return false;
  const hasDesktop = b.image && !isLegacyDummyImage(b.image);
  const hasMobile = b.mobileImage && !isLegacyDummyImage(b.mobileImage);
  return Boolean(hasDesktop || hasMobile);
};

const PremiumHero = ({ banners: initialBanners }) => {
  const navigate = useNavigate();

  // Initialize immediately from prop or localStorage cache — ZERO latency, no static banners
  const [slides, setSlides] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('vaugun_banners');
        const saved = localStorage.getItem('daivika_banners');
        if (saved && (saved.includes('posters__') || saved.includes('Smart Products'))) {
          localStorage.removeItem('daivika_banners');
        }
      } catch (e) {}
    }
    if (Array.isArray(initialBanners) && initialBanners.length > 0) {
      const valid = initialBanners.filter(isValidBanner);
      if (valid.length > 0) return valid.slice(0, 6);
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daivika_banners');
        if (saved) {
          const parsed = JSON.parse(saved);
          const list = Array.isArray(parsed) ? parsed : (parsed?.data || []);
          const valid = list.filter(isValidBanner);
          if (valid.length > 0) return valid.slice(0, 6);
        }
      } catch (e) {}
    }
    return [];
  });

  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  // Sync with initialBanners prop changes immediately
  useEffect(() => {
    if (Array.isArray(initialBanners) && initialBanners.length > 0) {
      const valid = initialBanners.filter(isValidBanner);
      if (valid.length > 0) {
        setSlides(valid.slice(0, 6));
      }
    }
  }, [initialBanners]);

  // Resize check for mobile/desktop switching
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Background revalidation — fetch newest DB banners without clearing existing slides
  const loadBannerSlides = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vaugun_banners');
      }
      const res = await fetch('/api/public/banners?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || []);
        const valid = list.filter(isValidBanner);
        if (valid.length > 0) {
          setSlides(valid.slice(0, 6));
          if (typeof window !== 'undefined') {
            localStorage.setItem('daivika_banners', JSON.stringify(valid));
          }
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadBannerSlides();

    // Re-load on settings update event (fired after admin saves banners in Site Branding)
    // Always re-fetch from API — never trust stale localStorage after an admin update
    const handleSettingsUpdate = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vaugun_banners');
        localStorage.removeItem('daivika_banners');
      }
      loadBannerSlides();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('daivika_settings_updated', handleSettingsUpdate);
      window.addEventListener('vaugun_settings_updated', handleSettingsUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('daivika_settings_updated', handleSettingsUpdate);
        window.removeEventListener('vaugun_settings_updated', handleSettingsUpdate);
      }
    };
  }, [loadBannerSlides]);

  const activeSlides = slides;

  // Smart Ultra-Fast Preloading:
  // 1. Immediately preload slide #0's screen-specific variant with high fetch priority
  // 2. Defer other slides to idle time to preserve network bandwidth for main page elements
  useEffect(() => {
    if (activeSlides && activeSlides.length > 0 && typeof window !== 'undefined') {
      // First slide — immediate high-priority load
      const firstSlide = activeSlides[0];
      const firstSrc = isMobile
        ? (firstSlide.mobileImage || firstSlide.image)
        : (firstSlide.image || firstSlide.mobileImage);
      if (firstSrc) {
        const firstImg = new Image();
        firstImg.fetchPriority = 'high';
        firstImg.src = firstSrc;
      }

      // Remaining slides — preload after a brief delay so initial page render is 100% smooth
      const idleTimer = setTimeout(() => {
        activeSlides.slice(1).forEach((slide) => {
          const src = isMobile
            ? (slide.mobileImage || slide.image)
            : (slide.image || slide.mobileImage);
          if (src) {
            const img = new Image();
            img.src = src;
          }
        });
      }, 1200);

      return () => clearTimeout(idleTimer);
    }
  }, [activeSlides, isMobile]);

  // Auto-rotation with manual navigation reset
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeSlides.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent(prev => (prev + 1) % activeSlides.length);
      }, SLIDE_DURATION);
    }
  }, [activeSlides.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const nextSlide = useCallback(() => {
    setCurrent(prev => (prev + 1) % activeSlides.length);
    startTimer();
  }, [activeSlides.length, startTimer]);

  const prevSlide = useCallback(() => {
    setCurrent(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
    startTimer();
  }, [activeSlides.length, startTimer]);

  const handleDotClick = useCallback((idx) => {
    setCurrent(idx);
    startTimer();
  }, [startTimer]);

  // Touch Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  if (!activeSlides || activeSlides.length === 0) {
    return null;
  }

  const currentSlide = activeSlides[current] || activeSlides[0] || {};

  const cleanMobile = (currentSlide.mobileImage && !isLegacyDummyImage(currentSlide.mobileImage)) ? currentSlide.mobileImage : '';
  const cleanDesktop = (currentSlide.image && !isLegacyDummyImage(currentSlide.image)) ? currentSlide.image : '';

  // Guard: if no valid image exists for this slide, show shimmer
  // (The actual mobile/desktop image selection is done via CSS <picture> + <source media>
  //  in the render below, not via JS isMobile state, to avoid hydration mismatch.)
  const hasAnyImage = cleanDesktop || cleanMobile;

  if (!hasAnyImage) {
    return (
      <section
        className="daivika-hero-section"
        style={{
          width: '100%',
          position: 'relative',
          backgroundColor: '#0a0a0a',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            width: '100%',
            position: 'relative',
            aspectRatio: isMobile ? '16 / 9' : '3 / 1',
            minHeight: isMobile ? '200px' : '380px',
            maxHeight: isMobile ? '260px' : '620px',
            overflow: 'hidden',
            backgroundColor: '#18181b'
          }}
          className="shimmer-bg"
        />
      </section>
    );
  }

  return (
    <section
      className="daivika-hero-section"
      style={{
        width: '100%',
        position: 'relative',
        backgroundColor: '#0a0a0a',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .daivika-hero-aspect-container {
          width: 100%;
          position: relative;
          aspect-ratio: 3 / 1;
          min-height: 320px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .daivika-hero-aspect-container {
            aspect-ratio: 16 / 9 !important;
            min-height: 180px !important;
          }
        }
      `}</style>
      {/* Aspect Ratio Container: 3:1 Desktop, 16:9 Mobile */}
      <div className="daivika-hero-aspect-container">
        <AnimatePresence initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              willChange: 'opacity, transform',
              transform: 'translateZ(0)'
            }}
          >
            {/* Banner image — uses <picture> with CSS media query so browser picks
                 the correct mobile/desktop src natively, before JS hydration runs.
                 Fallback chain: mobileImage → image (mobile), image → mobileImage (desktop). */}
            {currentSlide.link ? (
              <a
                href={currentSlide.link}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                <picture style={{ display: 'block', width: '100%', height: '100%' }}>
                  {/* Mobile: max-width 768px → prefer mobileImage, fallback to desktop image */}
                  {(cleanMobile || cleanDesktop) && (
                    <source
                      media="(max-width: 768px)"
                      srcSet={cleanMobile || cleanDesktop}
                    />
                  )}
                  {/* Desktop: prefer desktop image, fallback to mobile image */}
                  <img
                    src={cleanDesktop || cleanMobile}
                    alt={currentSlide.title || 'Daivika Banner'}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      imageRendering: '-webkit-optimize-contrast',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                    onError={(e) => {
                      const fallback = e.currentTarget.src.includes(cleanDesktop) ? cleanMobile : cleanDesktop;
                      if (fallback && !e.currentTarget.src.includes(fallback)) {
                        e.currentTarget.src = fallback;
                        return;
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </picture>
              </a>
            ) : (
              <picture style={{ display: 'block', width: '100%', height: '100%' }}>
                {/* Mobile: max-width 768px → prefer mobileImage, fallback to desktop image */}
                {(cleanMobile || cleanDesktop) && (
                  <source
                    media="(max-width: 768px)"
                    srcSet={cleanMobile || cleanDesktop}
                  />
                )}
                {/* Desktop: prefer desktop image, fallback to mobile image */}
                <img
                  src={cleanDesktop || cleanMobile}
                  alt={currentSlide.title || 'Daivika Banner'}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                    imageRendering: '-webkit-optimize-contrast',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                  onError={(e) => {
                    const fallback = e.currentTarget.src.includes(cleanDesktop) ? cleanMobile : cleanDesktop;
                    if (fallback && !e.currentTarget.src.includes(fallback)) {
                      e.currentTarget.src = fallback;
                      return;
                    }
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </picture>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {activeSlides.length > 0 && (
          <>
            <button
              onClick={prevSlide}
              style={{
                position: 'absolute',
                left: isMobile ? '0.75rem' : '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.65)'; }}
              aria-label="Previous Slide"
            >
              <ChevronLeft size={isMobile ? 18 : 22} strokeWidth={2.5} />
            </button>

            <button
              onClick={nextSlide}
              style={{
                position: 'absolute',
                right: isMobile ? '0.75rem' : '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.65)'; }}
              aria-label="Next Slide"
            >
              <ChevronRight size={isMobile ? 18 : 22} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {activeSlides.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: isMobile ? '0.75rem' : '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: '0.35rem 0.8rem',
              borderRadius: '100px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
            }}
          >
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                style={{
                  width: current === idx ? (isMobile ? '18px' : '24px') : (isMobile ? '6px' : '8px'),
                  height: isMobile ? '6px' : '8px',
                  borderRadius: '100px',
                  backgroundColor: current === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none'
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PremiumHero;
