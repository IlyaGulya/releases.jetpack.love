import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Since we're using Cloudflare Pages, we don't need a trailing slash
  trailingSlash: false,
  // Ensure we can fetch data during static generation
  experimental: {
    workerThreads: false,
    cpus: 1
  }
};

export default nextConfig;
