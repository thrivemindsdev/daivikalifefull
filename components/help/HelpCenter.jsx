'use client';

// Help & Tutorials for the admin and vendor dashboards: setup checklist, searchable step-by-step guides,
// troubleshooting and the guided tour. Progress is remembered on this device.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, PlayCircle, CheckCircle2, Circle, Clock, ArrowLeft, ArrowRight, Lightbulb, AlertTriangle, ChevronDown,
  LayoutDashboard, ShoppingCart, ShoppingBag, Layers, Package, Truck, BarChart3, Ruler, Sparkles, Gift, Star, Inbox,
  Bell, Target, Printer, Image as ImageIcon, Users, Settings, Boxes, Store, BookOpen, X, LifeBuoy, ListChecks,
} from 'lucide-react';
import { HELP, HELP_CATEGORIES } from '@/lib/help-content';
import { RichText } from '@/components/help/RichText';

const ICONS = { LayoutDashboard, ShoppingCart, ShoppingBag, Layers, Package, Truck, BarChart3, Ruler, Sparkles, Gift, Star, Inbox, Bell, Target, Printer, Image: ImageIcon, Users, Settings, Boxes, Store };

const C = {
  wine: '#360910', wineSoft: '#5c1520', deep: '#28060b', gold: '#c5831a', goldPale: '#fde68a',
  cream: '#FAF8F5', creamDeep: '#f5ede0', border: '#ecdfcc', text: '#1f1410', muted: '#7a6a5c', green: '#15803d', red: '#b91c1c',
};
const HEADING = '"Outfit", "Poppins", sans-serif';
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: '0 1px 2px rgba(54,9,16,0.04), 0 10px 30px -18px rgba(54,9,16,0.25)' };

function useStoredSet(key) {
  const [set, setSet] = useState(() => new Set());
  useEffect(() => {
    try { setSet(new Set(JSON.parse(localStorage.getItem(key) || '[]'))); } catch {}
  }, [key]);
  const toggle = (id, value) => setSet(prev => {
    const next = new Set(prev);
    const on = value ?? !next.has(id);
    on ? next.add(id) : next.delete(id);
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
    return next;
  });
  return [set, toggle];
}

function ProgressRing({ value, total, size = 64 }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, pct = total ? value / total : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(253,230,138,0.2)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.goldPale} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.6s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEADING, fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{Math.round(pct * 100)}%</div>
    </div>
  );
}

function GuideIcon({ name, size = 18, active }) {
  const Icon = ICONS[name] || BookOpen;
  return (
    <span style={{ width: size + 18, height: size + 18, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? `linear-gradient(135deg, ${C.wine}, ${C.wineSoft})` : C.creamDeep, color: active ? C.goldPale : C.wine }}>
      <Icon size={size} />
    </span>
  );
}

function GuideDetail({ guide, done, onDone, onBack, onNavigate, onOpenGuide, guides, tabLabel, compact }) {
  const idx = guides.findIndex(g => g.id === guide.id);
  const nextGuide = guides[idx + 1];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: '0.4rem 0.8rem', color: C.wine, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
        <ArrowLeft size={14} /> All guides
      </button>

      <div style={{ ...card, padding: compact ? '1rem' : '1.4rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <GuideIcon name={guide.icon} size={22} active />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: HEADING, fontSize: compact ? '1.15rem' : '1.4rem', color: C.wine, lineHeight: 1.25 }}>{guide.title}</h2>
            <p style={{ margin: '0.3rem 0 0', color: C.muted, fontSize: '0.88rem' }}>{guide.summary}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: '0.75rem', color: C.muted, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {guide.minutes} min read</span>
              <span>· {guide.steps.length} steps</span>
              {done && <span style={{ color: C.green, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> Completed</span>}
            </div>
          </div>
        </div>

        <ol style={{ listStyle: 'none', margin: '1.25rem 0 0', padding: 0, display: 'flex', flexDirection: 'column' }}>
          {guide.steps.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: '0.8rem', position: 'relative', paddingBottom: i === guide.steps.length - 1 ? 0 : '1rem' }}>
              {i < guide.steps.length - 1 && <span style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 2, background: C.creamDeep }} />}
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: C.wine, color: C.goldPale, fontWeight: 800, fontSize: '0.78rem', zIndex: 1 }}>{i + 1}</span>
              <span style={{ fontSize: '0.9rem', color: C.text, lineHeight: 1.6, paddingTop: 3 }}><RichText text={s} /></span>
            </li>
          ))}
        </ol>

        {guide.tips?.length > 0 && (
          <div style={{ marginTop: '1.2rem', background: '#fff8e8', border: '1px solid #f3dcaa', borderRadius: 14, padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#92580a', fontSize: '0.82rem', marginBottom: 6 }}><Lightbulb size={15} /> Pro tips</div>
            {guide.tips.map((t, i) => <div key={i} style={{ fontSize: '0.85rem', color: '#5c4310', lineHeight: 1.55, marginTop: i ? 6 : 0 }}>• <RichText text={t} /></div>)}
          </div>
        )}
        {guide.warnings?.length > 0 && (
          <div style={{ marginTop: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: C.red, fontSize: '0.82rem', marginBottom: 6 }}><AlertTriangle size={15} /> Good to know</div>
            {guide.warnings.map((t, i) => <div key={i} style={{ fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.55, marginTop: i ? 6 : 0 }}>• <RichText text={t} /></div>)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '1.2rem' }}>
          {guide.tab && onNavigate && (
            <button onClick={() => onNavigate(guide.tab)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: C.deep, background: `linear-gradient(135deg, #fcd34d, ${C.gold})` }}>
              Open {tabLabel(guide.tab)} <ArrowRight size={15} />
            </button>
          )}
          <button onClick={() => onDone(guide.id, !done)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1rem', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', border: `1px solid ${done ? '#bbf7d0' : C.border}`, background: done ? '#f0fdf4' : '#fff', color: done ? C.green : C.wine }}>
            {done ? <><CheckCircle2 size={15} /> Completed</> : <><Circle size={15} /> Mark as completed</>}
          </button>
        </div>
      </div>

      {nextGuide && (
        <button onClick={() => onOpenGuide(nextGuide.id)} style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <GuideIcon name={nextGuide.icon} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.gold }}>Next guide</span>
            <span style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem' }}>{nextGuide.title}</span>
          </span>
          <ArrowRight size={16} color={C.muted} />
        </button>
      )}
    </div>
  );
}

/**
 * audience: 'admin' | 'vendor'
 * onNavigate(tab): open a dashboard tab;  onStartTour(): start the guided tour
 * tabLabels: { [tab]: label } for "Open …" buttons;  initialGuideId: open this guide first
 * compact: drawer layout (no hero)
 */
export default function HelpCenter({ audience = 'admin', onNavigate, onStartTour, tabLabels = {}, initialGuideId, compact = false, onClose }) {
  const { guides, troubleshooting, checklist } = HELP[audience];
  const categories = HELP_CATEGORIES[audience];
  const [done, toggleDone] = useStoredSet(`daivika_help_done_${audience}`);
  const [checked, toggleChecked] = useStoredSet(`daivika_help_checklist_${audience}`);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openId, setOpenId] = useState(initialGuideId || null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => { setOpenId(initialGuideId || null); }, [initialGuideId]);

  const q = query.trim().toLowerCase();
  const matches = (text) => String(text).toLowerCase().includes(q);
  const shownGuides = useMemo(() => guides.filter(g =>
    (category === 'all' || g.category === category) &&
    (!q || matches(g.title) || matches(g.summary) || g.steps.some(matches) || (g.tips || []).some(matches))
  ), [guides, category, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownFaq = troubleshooting.filter(f => !q || matches(f.q) || matches(f.a));
  const tabLabel = (tab) => tabLabels[tab] || 'this section';
  const go = (tab) => { onNavigate?.(tab); onClose?.(); };
  const openGuide = guides.find(g => g.id === openId);

  if (openGuide) {
    return (
      <GuideDetail
        guide={openGuide}
        guides={guides}
        done={done.has(openGuide.id)}
        onDone={toggleDone}
        onBack={() => setOpenId(null)}
        onNavigate={onNavigate ? go : null}
        onOpenGuide={setOpenId}
        tabLabel={tabLabel}
        compact={compact}
      />
    );
  }

  const checklistDone = checklist.filter(c => checked.has(c.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontFamily: '"Poppins", sans-serif', color: C.text }}>
      {!compact && (
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 22, padding: 'clamp(1.2rem, 3vw, 1.8rem)', color: '#fff',
          background: `radial-gradient(circle at 85% 10%, rgba(252,211,77,0.22), transparent 45%), linear-gradient(135deg, ${C.deep} 0%, ${C.wine} 55%, ${C.wineSoft} 100%)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0, flex: '1 1 300px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={13} /> {audience === 'admin' ? 'Admin academy' : 'Vendor academy'}</div>
            <h2 style={{ margin: '0.35rem 0 0.3rem', fontFamily: HEADING, fontSize: 'clamp(1.35rem, 3vw, 1.8rem)', fontWeight: 800 }}>Help & Tutorials</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', maxWidth: 560 }}>
              {audience === 'admin' ? 'Step-by-step guides for every part of the admin panel, a setup checklist and fixes for common problems.' : 'Everything you need to receive, fulfil and report on Daivika orders from your store.'}
            </p>
            {onStartTour && (
              <button onClick={onStartTour} style={{ marginTop: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.65rem 1.1rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.86rem', color: C.deep, background: 'linear-gradient(135deg, #fcd34d, #c5831a)' }}>
                <PlayCircle size={17} /> Start guided tour
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(253,230,138,0.22)', borderRadius: 16, padding: '0.8rem 1rem' }}>
            <ProgressRing value={done.size} total={guides.length} />
            <div>
              <div style={{ fontFamily: HEADING, fontWeight: 800, fontSize: '1.1rem', color: C.goldPale }}>{done.size} / {guides.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>guides completed</div>
            </div>
          </div>
        </div>
      )}

      {compact && onStartTour && (
        <button onClick={() => { onClose?.(); onStartTour(); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.6rem 1rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.84rem', color: C.goldPale, background: `linear-gradient(135deg, ${C.wine}, ${C.wineSoft})` }}>
          <PlayCircle size={16} /> Start guided tour
        </button>
      )}

      {/* Setup checklist */}
      <div style={{ ...card, padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: HEADING, fontWeight: 700, fontSize: '1rem' }}><ListChecks size={18} color={C.gold} /> Setup checklist</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: checklistDone === checklist.length ? C.green : C.muted }}>{checklistDone} of {checklist.length} done</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: C.creamDeep, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${(checklistDone / checklist.length) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.gold}, ${C.wine})`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {checklist.map(item => {
            const isDone = checked.has(item.id);
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.45rem 0.4rem', borderRadius: 10 }}>
                <button onClick={() => toggleChecked(item.id)} aria-label={isDone ? 'Mark as not done' : 'Mark as done'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: isDone ? C.green : C.border }}>
                  {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <span style={{ flex: 1, fontSize: '0.86rem', color: isDone ? C.muted : C.text, textDecoration: isDone ? 'line-through' : 'none' }}>{item.label}</span>
                <button onClick={() => setOpenId(item.guide)} style={{ border: 'none', background: 'transparent', color: C.gold, fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer' }}>How?</button>
                {onNavigate && <button onClick={() => go(item.tab)} style={{ border: `1px solid ${C.border}`, background: '#fff', color: C.wine, fontWeight: 700, fontSize: '0.74rem', borderRadius: 8, padding: '0.25rem 0.6rem', cursor: 'pointer' }}>Open</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the guides — e.g. coupon, stock, invoice, banner…" aria-label="Search help"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 1rem 0.8rem 2.6rem', borderRadius: 14, border: `1px solid ${C.border}`, fontSize: '0.9rem', outline: 'none', background: '#fff' }} />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={16} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[{ id: 'all', label: 'All guides' }, ...categories].map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
              border: `1px solid ${category === c.id ? C.wine : C.border}`, background: category === c.id ? `linear-gradient(135deg, ${C.wine}, ${C.wineSoft})` : '#fff', color: category === c.id ? C.goldPale : C.muted,
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* Guides */}
      {shownGuides.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.75rem' }}>
          {shownGuides.map(g => {
            const isDone = done.has(g.id);
            return (
              <button key={g.id} onClick={() => setOpenId(g.id)} style={{ ...card, padding: '0.95rem 1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
                <GuideIcon name={g.icon} active={isDone} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: C.text, lineHeight: 1.3 }}>{g.title}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{g.summary}</span>
                  <span style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.72rem', color: C.muted, alignItems: 'center' }}>
                    <Clock size={12} /> {g.minutes} min · {g.steps.length} steps
                    {isDone && <span style={{ color: C.green, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={12} /> Done</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ ...card, padding: '1.5rem', textAlign: 'center', color: C.muted, fontSize: '0.88rem' }}>No guides match "{query}". Try another word, or check the common problems below.</div>
      )}

      {/* Troubleshooting */}
      {shownFaq.length > 0 && (
        <div style={{ ...card, padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: HEADING, fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}><LifeBuoy size={18} color={C.gold} /> Common problems & fixes</div>
          {shownFaq.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} style={{ borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                <button onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.75rem 0.2rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.88rem', color: C.text }}>
                  {f.q}
                  <ChevronDown size={16} color={C.muted} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {isOpen && <div style={{ padding: '0 0.2rem 0.85rem', fontSize: '0.86rem', color: '#4a3f3a', lineHeight: 1.6 }}><RichText text={f.a} /></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Side drawer with the guide for the current page (opened from the "?" button)
export function HelpDrawer({ open, onClose, ...props }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99990 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,4,8,0.45)' }} />
      <aside role="dialog" aria-label="Help" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', background: C.cream, boxShadow: '-20px 0 50px -20px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.1rem', background: `linear-gradient(135deg, ${C.deep}, ${C.wine})`, color: '#fff' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: HEADING, fontWeight: 800 }}><BookOpen size={18} color="#fcd34d" /> Help for this page</span>
          <button onClick={onClose} aria-label="Close help" style={{ border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <HelpCenter compact onClose={onClose} {...props} />
        </div>
      </aside>
    </div>
  );
}
