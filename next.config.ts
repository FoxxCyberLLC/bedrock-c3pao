import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // Enable only for Docker container builds

  images: {
    unoptimized: true, // No Vercel image optimization in self-hosted
  },

  // Increase body size limit for Server Actions (file uploads, PDF exports)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // Expose env vars to edge runtime (middleware)
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
  },
};

export default nextConfig;
