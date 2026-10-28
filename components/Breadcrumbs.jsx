'use client';

import React from 'react';
import { Link } from '@/hooks/useRouterShim';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs component that renders visual navigation trail
 * along with Google BreadcrumbList JSON-LD schema for rich search snippets.
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  const fullTrail = [
    { name: 'Home', url: '/' },
    ...items
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": fullTrail.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url ? (item.url.startsWith('http') ? item.url : `https://daivika.com${item.url}`) : 'https://daivika.com'
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav aria-label="Breadcrumb" style={{ margin: '0.1rem 0 0.35rem', display: 'flex', alignItems: 'center' }}>
        <ol style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.4rem',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          fontSize: '0.85rem',
          color: '#64748b',
          fontWeight: 500
        }}>
          {fullTrail.map((item, index) => {
            const isLast = index === fullTrail.length - 1;
            return (
              <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {index > 0 && <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />}
                {isLast ? (
                  <span style={{ color: '#0f172a', fontWeight: 700 }} aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link 
                    to={item.url || '/'} 
                    style={{ 
                      color: '#475569', 
                      textDecoration: 'none', 
                      display: 'inline-flex', 
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#000'}
                    onMouseLeave={(e) => e.target.style.color = '#475569'}
                  >
                    {index === 0 && <Home size={14} style={{ marginBottom: '1px' }} />}
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
