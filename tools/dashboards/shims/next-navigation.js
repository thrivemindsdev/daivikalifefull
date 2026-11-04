// next/navigation for the static dashboard build: the browser location stands in for Next's router
import { useEffect, useState } from 'react';

function useLocationTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
}

export function useRouter() {
  return {
    push: (url) => { window.location.href = url; },
    replace: (url) => { window.location.replace(url); },
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.location.reload(),
    prefetch: () => {},
  };
}
export function usePathname() { useLocationTick(); return window.location.pathname; }
export function useSearchParams() { useLocationTick(); return new URLSearchParams(window.location.search); }
export function useParams() { return {}; }
export function redirect(url) { window.location.href = url; }
export function notFound() { window.location.href = '/404'; }
