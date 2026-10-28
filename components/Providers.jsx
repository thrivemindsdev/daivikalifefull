'use client';

import React, { Suspense } from 'react';
import Script from 'next/script';
import ErrorBoundary from './ErrorBoundary.jsx';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import { AlertProvider } from '@/context/AlertContext';
import { ThemeProvider } from '@/context/ThemeContext';
import MetaPixelTracker from './MetaPixelTracker';

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <AlertProvider>
              <ThemeProvider>
                <Suspense fallback={null}>
                  <MetaPixelTracker />
                </Suspense>
                {children}
              </ThemeProvider>
            </AlertProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
      
      {/* Mount Payment Checkout SDKs on Client Side */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        strategy="afterInteractive"
        onError={(e) => {
          console.error('Razorpay SDK failed to load:', e);
        }}
      />
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js" 
        strategy="lazyOnload"
        onError={(e) => {
          console.error('Cashfree SDK failed to load:', e);
        }}
      />
    </ErrorBoundary>
  );
}

