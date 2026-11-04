// next/script for the static dashboard build: adds the script tag once
import { useEffect } from 'react';

export default function Script({ src, strategy, onLoad, onError, ...attrs }) {
  useEffect(() => {
    if (!src || document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => { if (typeof v === 'string') s.setAttribute(k, v); });
    if (onLoad) s.onload = onLoad;
    if (onError) s.onerror = onError;
    document.body.appendChild(s);
  }, [src]);
  return null;
}
