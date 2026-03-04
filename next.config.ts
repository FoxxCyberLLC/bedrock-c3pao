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

  // Prevent Next.js from bundling native modules
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
