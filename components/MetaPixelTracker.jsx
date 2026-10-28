'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureAdParameters, trackMetaPixelEvent } from '@/lib/meta-pixel';

export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedPixelIdRef = useRef(null);

  // Initialize or re-initialize Meta Pixel script from backend settings
  useEffect(() => {
    let isMounted = true;

    async function initPixel() {
      try {
        const res = await fetch(`/api/meta-pixel/config?t=${Date.now()}`, { cache: 'no-store' });
        const config = await res.json();

        if (!isMounted) return;

        const pixelSettings = config?.data || config;
        const pixelId = (pixelSettings?.pixelId || config?.pixelId)?.trim();
        const isActive = (pixelSettings?.isActive !== undefined ? pixelSettings.isActive : config?.isActive) !== false;

        if (pixelId && isActive && initializedPixelIdRef.current !== pixelId) {
          initializedPixelIdRef.current = pixelId;

          // Inject Meta Pixel base script if not already present
          if (!window.fbq) {
            /* eslint-disable */
            (function(f, b, e, v, n, t, s) {
              if (f.fbq) return;
              n = f.fbq = function() {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
              };
              if (!f._fbq) f._fbq = n;
              n.push = n;
              n.loaded = !0;
              n.version = '2.0';
              n.queue = [];
              t = b.createElement(e);
              t.async = !0;
              t.src = v;
              s = b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t, s);
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            /* eslint-enable */
          }

          if (window.fbq) {
            window.fbq('init', pixelId);
            window.fbq('track', 'PageView');
          }
        }
      } catch (err) {
        console.warn('Meta Pixel initialization check error:', err);
      }
    }

    initPixel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Track route changes & capture UTM parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture any incoming UTM parameters or fbclid
    captureAdParameters();

    // Trigger PageView on route navigation
    trackMetaPixelEvent('PageView', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pathname
    });
  }, [pathname, searchParams]);

  return (
    <>
      {initializedPixelIdRef.current ? (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${initializedPixelIdRef.current}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      ) : null}
    </>
  );
}
