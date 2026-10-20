const path = require('path');

// Pin the workspace root to the monorepo. Without this, Next.js infers it from
// the nearest lockfile it finds, which can be a stray one far above the repo
// (e.g. in the home directory); Turbopack then watches that whole tree and
// the dev server runs out of memory.
const workspaceRoot = path.join(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@app-starter/shared'],
  outputFileTracingRoot: workspaceRoot,
  // Next.js automatically loads .env files, no need to manually configure here
  
  // Image configuration
  images: {
    remotePatterns: [
      // Allow images from localhost with any port
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      // Allow images from Cloudflare R2 buckets
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-225f1f57c21749b5bc80f67123ebd579.r2.dev',
      },
    ],
    // Also allow unoptimized images in development if needed
    unoptimized: false,
  },
  
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Turbopack handles hot reloading and file watching automatically,
  // so no custom configuration is needed for the previous webpack watchOptions
  turbopack: {
    root: workspaceRoot,
  },
  
  // Ensure proper static file serving
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

