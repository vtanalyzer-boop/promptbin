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
    // Content-Security-Policy: Astro adds a <meta> CSP with a hash for every script and style it emits (no 'unsafe-inline' for scripts).
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: {
        strictDynamic: true,
        resources: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://translate.google.com',
          'https://translate.googleapis.com',
          'https://www.gstatic.com',
        ],
        hashes: [
          'sha256-2zWIz9fsIXSyEwXqszTXBbqUeBAobYACRo+L5DwmEsM=',
        ],
      },
      styleDirective: {
        resources: [
          "'self'",
          "'unsafe-inline'",
          'https://www.gstatic.com',
          'https://translate.googleapis.com',
          'https://translate.google.com',
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob: https://www.gstatic.com https://translate.googleapis.com https://translate.google.com https://www.google.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://translate.googleapis.com https://translate.google.com",
        "frame-src https://translate.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://formspree.io",
      ],
    },
  },
});
