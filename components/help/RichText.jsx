'use client';

import React from 'react';

// Renders help text with **bold** segments (the only formatting the help content uses)
export function RichText({ text }) {
  if (!text) return null;
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: 'inherit' }}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}
