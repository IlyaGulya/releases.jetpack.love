/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pnpm-workspace-root');
    }
    return config;
  }
};

module.exports = nextConfig; 