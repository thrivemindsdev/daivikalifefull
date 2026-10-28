'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function VendorLayout({ children }) {
  return (
    <ProtectedRoute vendorOnly={true}>
      {children}
    </ProtectedRoute>
  );
}
