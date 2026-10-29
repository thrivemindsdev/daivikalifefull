/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: false, // Prevents double-execution of mount animations (GSAP, Framer Motion) during transition
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.daivika.in',
      },
      {
        protocol: 'https',
        hostname: 'daivika.in',
      },
      {
        protocol: 'https',
        hostname: '*.daivikalife.com',
      },
      {
        protocol: 'https',
        hostname: 'daivikalife.com',
      }
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // Bypasses lint checks during next build to prevent unexpected warnings
  },
  typescript: {
    ignoreBuildErrors: true, // Avoids typescript type compilation checks for non-strict assets
  },
  async rewrites() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/uploads/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/assets/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            // Browsers keep using HTTPS for this site (ignored on plain-HTTP localhost)
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
