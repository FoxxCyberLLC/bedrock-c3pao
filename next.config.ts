import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Always standalone for Docker container deployment
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

  // Allow connecting to the SaaS API
  async rewrites() {
    return [];
  },
};

export default nextConfig;
