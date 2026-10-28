'use client';

// Step-by-step spotlight tour over the real dashboard UI.
// Each step: { target?: CSS selector, title, body, tab?: dashboard tab to open first }.
// A missing or hidden target (e.g. the sidebar on a phone) shows the step as a centred card instead.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X, Sparkles } from 'lucide-react';
import { RichText } from '@/components/help/RichText';

const WINE = '#360910';
const GOLD = '#c5831a';
const PAD = 8;

function findTarget(selector) {
  if (!selector || typeof document === 'undefined') return null;
  const el = [...document.querySelectorAll(selector)].find(e => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  });
  return el || null;
}

export default function GuidedTour({ steps, open, onClose, onNavigate, startAt = 0 }) {
  const [index, setIndex] = useState(startAt);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(220);
  const step = steps[index];

  useEffect(() => { if (open) setIndex(startAt); }, [open, startAt]);

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const el = findTarget(step?.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // Open the step's tab, bring the target into view, then measure it
  useEffect(() => {
    if (!open || !step) return undefined;
    setRect(null);
    if (step.tab) onNavigate?.(step.tab);
    let cancelled = false;
    const t1 = setTimeout(() => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, step.tab ? 350 : 60);
    const t2 = setTimeout(() => { if (!cancelled) measure(); }, step.tab ? 800 : 450);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
  }, [open, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  });

  const finish = useCallback(() => onClose?.(index >= steps.length - 1), [onClose, index, steps.length]);
  const next = useCallback(() => (index >= steps.length - 1 ? onClose?.(true) : setIndex(i => i + 1)), [index, steps.length, onClose]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, back, finish]);

  if (!open || !step) return null;

  const cardW = Math.min(360, viewport.w - 32);
  let cardStyle;
  if (rect) {
    const below = rect.top + rect.height + 14;
    const above = rect.top - cardH - 14;
    const right = rect.left + rect.width + 14;
    let top, left;
    if (below + cardH < viewport.h - 12) { top = below; left = rect.left; }
    else if (above > 12) { top = above; left = rect.left; }
    else if (right + cardW < viewport.w - 12) { top = rect.top; left = right; }
    else { top = viewport.h - cardH - 16; left = rect.left; }
    left = Math.max(16, Math.min(left, viewport.w - cardW - 16));
    top = Math.max(12, Math.min(top, viewport.h - cardH - 12));
    cardStyle = { top, left };
  } else {
    cardStyle = { top: Math.max(16, (viewport.h - cardH) / 2), left: (viewport.w - cardW) / 2 };
  }

  const progress = ((index + 1) / steps.length) * 100;

  return (
    <div role="dialog" aria-modal="true" aria-label={step.title} style={{ position: 'fixed', inset: 0, zIndex: 100000, fontFamily: '"Poppins", sans-serif' }}>
      <style>{`
        @keyframes tour-pulse { 0%,100% { box-shadow: 0 0 0 9999px rgba(20,4,8,0.68), 0 0 0 3px ${GOLD}, 0 0 0 9px rgba(197,131,26,0.25); }
                                50% { box-shadow: 0 0 0 9999px rgba(20,4,8,0.68), 0 0 0 3px ${GOLD}, 0 0 0 14px rgba(197,131,26,0.08); } }
        @keyframes tour-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {rect ? (
        <div style={{
          position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 12,
          animation: 'tour-pulse 2s ease-in-out infinite', transition: 'all 0.35s cubic-bezier(.4,0,.2,1)', pointerEvents: 'none',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,4,8,0.68)' }} />
      )}

      <div
        ref={cardRef}
        key={index}
        style={{
          position: 'fixed', ...cardStyle, width: cardW, background: '#fff', borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(197,131,26,0.4)', animation: 'tour-in 0.25s ease-out',
          transition: 'top 0.35s ease, left 0.35s ease',
        }}
      >
        <div style={{ height: 4, background: '#f3e3c3' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${WINE})`, transition: 'width 0.3s' }} />
        </div>
        <div style={{ padding: '1rem 1.1rem 0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: GOLD }}>
              <Sparkles size={12} /> Step {index + 1} of {steps.length}
            </span>
            <button onClick={finish} aria-label="Close tour" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7a6a5c', padding: 2, display: 'flex' }}><X size={16} /></button>
          </div>
          <div style={{ fontFamily: '"Outfit", "Poppins", sans-serif', fontWeight: 800, fontSize: '1.08rem', color: WINE, marginBottom: 6 }}>{step.title}</div>
          <div style={{ fontSize: '0.86rem', color: '#3d3330', lineHeight: 1.6 }}><RichText text={step.body} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.95rem', gap: 8 }}>
            <button onClick={finish} style={{ border: 'none', background: 'transparent', color: '#7a6a5c', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
              {index >= steps.length - 1 ? '' : 'Skip tour'}
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {index > 0 && (
                <button onClick={back} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.45rem 0.8rem', borderRadius: 10, border: '1px solid #ead9c0', background: '#fff', color: WINE, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button onClick={next} autoFocus style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.45rem 0.95rem', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${WINE}, #5c1520)`, color: '#fde68a', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                {index >= steps.length - 1 ? 'Finish' : <>Next <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
