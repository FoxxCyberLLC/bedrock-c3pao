import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    unoptimized: true, // No Vercel image optimization in self-hosted
  },

  // Increase body size limit for Server Actions (file uploads, PDF exports)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // H5: HTTP security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // SAMEORIGIN allows same-origin iframes (e.g. evidence PDF preview);
          // frame-ancestors 'self' in CSP below enforces the same at CSP layer.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.s3.amazonaws.com https://*.s3.us-east-1.amazonaws.com",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'self'",
              "frame-ancestors 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
