import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Production domain. Override with the SITE env var at build time if needed (e.g. a preview URL).
const SITE = process.env.SITE || 'https://promptbin.in';

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  compressHTML: true,
  // Runs on Cloudflare Workers. Blog/FAQ/legal pages are prerendered to static HTML at build time.
  adapter: cloudflare(),
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'always' },
  vite: {
    build: {
      cssMinify: true,
      minify: 'esbuild',
    },
  },
  security: {
    checkOrigin: false, // origin is verified in src/lib/auth.js
  },
});
