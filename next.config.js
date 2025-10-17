/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce memory usage in development
  swcMinify: true,

  // Optimize compilation
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Reduce webpack worker threads
    workerThreads: false,
    cpus: 1,
  },

  // Disable source maps in dev for better performance
  productionBrowserSourceMaps: false,

  // Configure webpack for lighter builds
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
