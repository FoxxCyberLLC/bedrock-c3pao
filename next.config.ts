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
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limit referrer information to same origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable unused browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP: 'unsafe-inline' required for Next.js inline scripts and Tailwind CSS 4 styles
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
