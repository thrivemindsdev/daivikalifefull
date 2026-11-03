// Vendor dashboard entry: the same providers and route guard as the Next.js app (app/layout.jsx, app/(vendor)/layout.jsx)
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '@/components/Providers';
import PageProgressBar from '@/components/PageProgressBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import VendorDashboard from '@/app/(vendor)/vendor/dashboard/page.jsx';

createRoot(document.getElementById('daivika-dashboard')).render(
  <Providers>
    <Suspense fallback={null}><PageProgressBar /></Suspense>
    <ProtectedRoute vendorOnly={true}><VendorDashboard /></ProtectedRoute>
  </Providers>,
);
