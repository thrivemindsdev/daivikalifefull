import React, { Suspense } from 'react';
import '../styles/globals.css';
import '../styles/App.css';
import Providers from '../components/Providers';
import PageProgressBar from '../components/PageProgressBar';

export const viewport = {
  themeColor: '#360910',
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata = {
  metadataBase: new URL(process.env.FRONTEND_URL || 'http://localhost:3000'),
  title: 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha',
  description: 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, idols, and pure pooja essentials.',
  keywords: 'Karungali mala, 1 Mukhi Rudraksha, Tulasi mala, spiritual wearables, Zodimithra, Daivika, energized rudraksha, pooja essentials, panchaloha, brass diyas, gemstones',
  icons: {
    icon: [
      { url: '/favicon.png?v=daivika_v4', type: 'image/png' },
      { url: '/favicon.ico?v=daivika_v4' }
    ],
    shortcut: '/favicon.png?v=daivika_v4',
    apple: '/favicon.png?v=daivika_v4',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha',
    description: 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, idols, and pure pooja essentials.',
    siteName: 'Daivika by Zodimithra',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha',
    description: 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, idols, and pure pooja essentials.',
    images: ['/og-image.png'],
  }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Daivika",
  "url": "/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "/products?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Daivika",
  "url": "/",
  "logo": "/logo.png",
  "description": "Daivika - Premium quality products and essentials curated for you."
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Daivika Store",
  "image": "/logo.png",
  "url": "/"
};

const sitelinksSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "SiteNavigationElement",
      "position": 1,
      "name": "Products",
      "description": "Browse all Daivika products",
      "url": "/products"
    },
    {
      "@type": "SiteNavigationElement",
      "position": 2,
      "name": "Order Tracking",
      "description": "Track your order status",
      "url": "/order-tracking"
    },
    {
      "@type": "SiteNavigationElement",
      "position": 3,
      "name": "Contact",
      "description": "Contact Daivika support",
      "url": "/contact"
    }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon links with cache buster */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=daivika_v4" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=daivika_v4" />
        <link rel="apple-touch-icon" href="/favicon.png?v=daivika_v4" />
        <link rel="shortcut icon" href="/favicon.ico?v=daivika_v4" />

        {/* Preload brand logo for instant 0ms loader display */}
        <link rel="preload" as="image" href="/logo-light.png?v=daivika_v3" fetchPriority="high" type="image/png" />
        <link rel="preload" as="image" href="/logo.png?v=daivika_v3" fetchPriority="high" type="image/png" />

        {/* Preconnect to external asset servers */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Custom premium Google Fonts used in the storefront */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Font Awesome Icons */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />

        {/* Google Search Sitelinks & Search Box JSON-LD Schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sitelinksSchema) }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <Providers>
          <Suspense fallback={null}>
            <PageProgressBar />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
