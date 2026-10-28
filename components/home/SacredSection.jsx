'use client';

// Home page building blocks: a titled section header, a themed product grid and the Sacred Stories gallery
import React, { useRef } from 'react';
import { Link } from '@/hooks/useRouterShim';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { isCloudinaryVideo, cloudinaryVideoThumb } from '@/lib/cloudinary-upload';

const GOLD = '#c5831a';
const WINE = '#360910';

export function SectionHeading({ eyebrow, title, description, isMobile, action, align = 'left' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: isMobile ? '1rem' : '1.5rem', flexWrap: 'wrap', textAlign: align }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: '760px', flex: '1 1 320px', alignItems: align === 'center' ? 'center' : 'flex-start', margin: align === 'center' ? '0 auto' : 0 }}>
        <span style={{ color: GOLD, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.2px', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.6rem' }}>✦</span>{eyebrow}
        </span>
        <h2 style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 800, color: '#0a0a0a', fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif", margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {title}
        </h2>
        {description && (
          <p style={{ margin: '0.25rem 0 0', color: '#5f5a55', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: 1.65 }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ViewAllLink({ to, label = 'View all' }) {
  return (
    <Link to={to} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: WINE, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', padding: '0.5rem 0.95rem', borderRadius: '999px', border: `1px solid rgba(197,131,26,0.45)`, background: '#fff', whiteSpace: 'nowrap' }}>
      {label} <ArrowRight size={14} />
    </Link>
  );
}

// A home section of product cards. Hidden when there are no products once loading has finished.
export function ThemedProductSection({ eyebrow, title, description, products, loading, viewAllHref, isMobile, renderCard, renderSkeleton, background = '#FAF8F5', limit = 8 }) {
  if (!loading && (!products || products.length === 0)) return null;
  return (
    <section style={{ padding: isMobile ? '1.5rem 0.5rem' : '2.5rem 1.5rem', backgroundColor: background, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1560px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          isMobile={isMobile}
          action={!loading && viewAllHref && products.length > 0 && <ViewAllLink to={viewAllHref} />}
        />
        <div className="home-product-grid">
          {loading
            ? [1, 2, 3, 4].map(i => <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>)
            : products.slice(0, limit).map(p => <React.Fragment key={p.id || p._id}>{renderCard(p)}</React.Fragment>)}
        </div>
      </div>
    </section>
  );
}

const youTubeId = (url = '') => (url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/) || [])[1];

// Admin-managed gallery of images / videos (setting "sacred_stories")
export function StoriesGallery({ eyebrow, title, description, stories, isMobile }) {
  const track = useRef(null);
  const items = (stories || []).filter(s => s && (s.image || youTubeId(s.link) || isCloudinaryVideo(s.link)));
  if (!items.length) return null;
  const scroll = (dir) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <section style={{ padding: isMobile ? '1.75rem 0' : '3rem 0', background: `linear-gradient(180deg, ${WINE} 0%, #28060b 100%)`, width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .stories-track { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 0 ${isMobile ? '0.75rem' : '1.5rem'} 0.25rem; }
        .stories-track::-webkit-scrollbar { display: none; }
        .story-card { flex: 0 0 ${isMobile ? '78%' : '300px'}; scroll-snap-align: start; border-radius: 18px; overflow: hidden; position: relative; aspect-ratio: 4 / 5; background: #1a0306; text-decoration: none; color: #fff; box-shadow: 0 18px 40px -20px rgba(0,0,0,0.7); border: 1px solid rgba(197,131,26,0.3); }
        .story-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.6s ease; }
        .story-card:hover img { transform: scale(1.05); }
      `}</style>
      <div style={{ maxWidth: '1560px', margin: '0 auto', padding: isMobile ? '0 0.75rem' : '0 1.5rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: isMobile ? '1rem' : '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: '760px', flex: '1 1 320px' }}>
            <span style={{ color: '#fcd34d', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.2px' }}>✦ {eyebrow}</span>
            <h2 style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif", margin: 0, lineHeight: 1.2 }}>{title}</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'rgba(253,244,220,0.78)', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: 1.65 }}>{description}</p>
          </div>
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[[-1, ChevronLeft, 'Previous'], [1, ChevronRight, 'Next']].map(([dir, Icon, label]) => (
                <button key={label} onClick={() => scroll(dir)} aria-label={label} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(252,211,77,0.45)', background: 'transparent', color: '#fcd34d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div ref={track} className="stories-track" style={{ maxWidth: '1560px', margin: '0 auto' }}>
        {items.map((s, i) => {
          const yt = youTubeId(s.link);
          const uploadedVideo = isCloudinaryVideo(s.link);
          const img = s.image
            ? getOptimizedImageUrl(s.image, 600)
            : uploadedVideo ? cloudinaryVideoThumb(s.link, 640) : `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
          const Tag = s.link ? 'a' : 'div';
          return (
            <Tag key={i} className="story-card" {...(s.link ? { href: s.link, target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <img src={img} alt={s.title || 'Daivika story'} loading="lazy" />
              {(yt || uploadedVideo || /instagram\.com\/(reel|p)\//.test(s.link || '')) && (
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(54,9,16,0.75)', border: '1px solid rgba(252,211,77,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={22} color="#fcd34d" fill="#fcd34d" />
                </span>
              )}
              {(s.title || s.caption) && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '2.5rem 1rem 1rem', background: 'linear-gradient(180deg, transparent, rgba(20,2,5,0.92))' }}>
                  {s.title && <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fde68a' }}>{s.title}</div>}
                  {s.caption && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 1.5 }}>{s.caption}</div>}
                </div>
              )}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
