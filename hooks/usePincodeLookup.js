'use client';

import { useRef, useState } from 'react';
import { API_BASE_URL } from '@/config';

// Address forms: once a 6-digit PIN code is typed, look up its state, district and city
// (GET /api/public/pincode/:pin) and hand them to the form. The fields stay editable.
export default function usePincodeLookup() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const latestPin = useRef('');

  const lookup = async (value, onFound) => {
    const pin = String(value || '').replace(/\D/g, '').slice(0, 6);
    latestPin.current = pin;
    if (pin.length !== 6) {
      setStatus('idle');
      setMessage('');
      return;
    }
    setStatus('loading');
    setMessage('Finding your location...');
    try {
      const res = await fetch(`${API_BASE_URL}/public/pincode/${pin}`);
      const json = await res.json().catch(() => ({}));
      if (latestPin.current !== pin) return; // a newer PIN was typed meanwhile
      if (!res.ok || !json.success || !json.data) {
        setStatus(res.status === 404 ? 'error' : 'idle');
        setMessage(res.status === 404 ? 'PIN code not found. Please check it or fill in the address manually.' : '');
        return;
      }
      onFound?.(json.data);
      setStatus('success');
      setMessage(json.data.state && !json.data.district ? 'State filled in — please select your district.' : '');
    } catch {
      if (latestPin.current === pin) {
        setStatus('idle');
        setMessage('');
      }
    }
  };

  return { status, message, lookup };
}
