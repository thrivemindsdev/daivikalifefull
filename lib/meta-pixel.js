// Meta Pixel & Conversions API Utility Library for DAIVIKA

// Storage keys
const UTM_STORAGE_KEY = 'daivika_meta_utm';

// Capture UTM & Ad click parameters from URL
export function captureAdParameters() {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmContent = urlParams.get('utm_content') || urlParams.get('utm_ad');
    const utmTerm = urlParams.get('utm_term');
    const fbclid = urlParams.get('fbclid');

    // Only update if there are new tracking parameters
    if (utmSource || fbclid || utmCampaign) {
      const trackingData = {
        utm_source: utmSource || (fbclid ? 'meta_ads' : 'direct'),
        utm_medium: utmMedium || (fbclid ? 'paid_social' : ''),
        utm_campaign: utmCampaign || (fbclid ? 'meta_ad_traffic' : ''),
        utm_content: utmContent || '',
        utm_term: utmTerm || '',
        fbclid: fbclid || '',
        landingPage: window.location.pathname,
        referrer: document.referrer || '',
        timestamp: new Date().toISOString()
      };

      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(trackingData));
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(trackingData));
      return trackingData;
    }
  } catch (err) {
    console.warn('Could not capture ad tracking parameters:', err);
  }

  return getCapturedAdParameters();
}

// Retrieve saved UTM tracking data
export function getCapturedAdParameters() {
  if (typeof window === 'undefined') return {};

  try {
    const sessionData = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (sessionData) return JSON.parse(sessionData);

    const localData = localStorage.getItem(UTM_STORAGE_KEY);
    if (localData) return JSON.parse(localData);
  } catch (err) {
    console.warn('Error reading UTM storage:', err);
  }

  return {};
}

// Fire a standard or custom Meta Pixel event
export async function trackMetaPixelEvent(eventName, eventData = {}, customUserData = {}) {
  if (typeof window === 'undefined') return;

  const adParams = getCapturedAdParameters();

  // 1. Dispatch client-side to window.fbq if initialized
  if (window.fbq) {
    try {
      const payload = {
        currency: 'INR',
        ...eventData
      };
      
      // Check if standard event or custom
      const standardEvents = [
        'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout',
        'Purchase', 'Lead', 'Search', 'AddPaymentInfo', 'CompleteRegistration'
      ];

      if (standardEvents.includes(eventName)) {
        window.fbq('track', eventName, payload);
      } else {
        window.fbq('trackCustom', eventName, payload);
      }
    } catch (err) {
      console.warn('Meta Pixel client track error:', err);
    }
  }

  // 2. Log event to DAIVIKA Backend for Dashboard Analytics & Server CAPI
  try {
    const enrichedPayload = {
      eventName,
      eventData: {
        currency: 'INR',
        ...eventData
      },
      userData: {
        ...customUserData,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        url: window.location.href,
        path: window.location.pathname
      },
      adAttribution: adParams,
      timestamp: new Date().toISOString()
    };

    fetch('/api/meta-pixel/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload),
      keepalive: true
    }).catch(() => {});
  } catch (err) {
    // Non-blocking
  }
}
