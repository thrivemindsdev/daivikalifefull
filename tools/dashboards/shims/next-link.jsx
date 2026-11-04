// next/link for the static dashboard build: a plain link (each page is a full page load)
import React from 'react';

const Link = React.forwardRef(({ href, prefetch, replace, scroll, shallow, locale, legacyBehavior, passHref, ...props }, ref) => (
  <a ref={ref} href={typeof href === 'object' ? href.pathname || '#' : href} {...props} />
));
Link.displayName = 'Link';
export default Link;
