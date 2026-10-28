'use client';

import React from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useSearchParams, useParams as useNextParams } from 'next/navigation';

// Router state memory layer
const getRouterState = () => {
  if (typeof window !== 'undefined') {
    return window.__routerState || null;
  }
  return null;
};

const setRouterState = (state) => {
  if (typeof window !== 'undefined') {
    window.__routerState = state;
  }
};

// Emulated useNavigate
export const useNavigate = () => {
  const router = useRouter();

  return (to, options = {}) => {
    if (options.state) {
      setRouterState(options.state);
    } else {
      setRouterState(null);
    }

    if (to === -1) {
      router.back();
    } else {
      if (options.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    }
  };
};

// Emulated useLocation
export const useLocation = () => {
  const pathname = usePathname();
  let searchParams = null;
  try {
    searchParams = useSearchParams();
  } catch (e) {
    searchParams = null;
  }

  return {
    pathname: pathname || '',
    search: searchParams ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: getRouterState(),
  };
};

// Emulated useParams
export const useParams = () => {
  const params = useNextParams();
  return params || {};
};

// Emulated Link component supporting React Router attributes
export const Link = React.forwardRef(({ to, href, state, onClick, ...props }, ref) => {
  const navigate = useNavigate();
  const targetUrl = to || href || '#';

  const handlePress = (e) => {
    if (onClick) onClick(e);
    
    // If state is passed, intercept click and navigate with state memory
    if (!e.defaultPrevented && state) {
      e.preventDefault();
      navigate(targetUrl, { state });
    }
  };

  return (
    <NextLink 
      ref={ref} 
      href={targetUrl} 
      onClick={handlePress} 
      {...props} 
    />
  );
});

Link.displayName = 'Link';
