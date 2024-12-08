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
  // Copy data files to the output directory
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pnpm-workspace-root');
    }

    // Add a rule to copy data files
    config.module.rules.push({
      test: /\.json$/,
      include: /data\/(libraries|versions)/,
      type: 'asset/resource',
      generator: {
        filename: 'static/data/[path][name][ext]'
      }
    });

    return config;
  }
};

module.exports = nextConfig; 