'use client';

// Company name / address / phone / email come from the "invoice_settings" setting in the database
// (Admin → Invoice Control). Pages read the cached copy from localStorage straight away; this fetches
// the latest copy and, when it changed, updates the cache and fires 'vaugun_settings_updated' so they re-read.
import { API_BASE_URL } from '@/config';

const CACHE_KEY = 'vaugun_invoice_settings';
let inFlight = null;

export function refreshCompanyDetails() {
  if (typeof window === 'undefined' || inFlight) return inFlight;
  inFlight = fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`)
    .then(res => (res.ok ? res.json() : null))
    .then(json => {
      const value = (json?.data || json)?.invoice_settings;
      if (!value || typeof value !== 'object') return;
      const prev = localStorage.getItem(CACHE_KEY);
      const next = JSON.stringify({ ...JSON.parse(prev || '{}'), ...value });
      if (next !== prev) {
        localStorage.setItem(CACHE_KEY, next);
        window.dispatchEvent(new Event('vaugun_settings_updated'));
      }
    })
    .catch(() => {})
    .finally(() => { setTimeout(() => { inFlight = null; }, 30000); });
  return inFlight;
}
