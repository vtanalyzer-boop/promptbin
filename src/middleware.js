import { defineMiddleware } from 'astro:middleware';
import { isAuthed } from './lib/auth.js';

const PUBLIC_ADMIN = new Set(['/admin/login/', '/api/admin/login/']);
const STORY_PAGE = /^\/web-stories\/[^/]+\/$/; // AMP stories may be embedded by Google, so they are not frame-blocked

// Applied to every response the Worker renders. Prerendered files get the same set from public/_headers.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isAdmin = path.startsWith('/admin') || path.startsWith('/api/');

  if (isAdmin && !PUBLIC_ADMIN.has(path) && !(await isAuthed(context.request))) {
    return path.startsWith('/api/')
      ? new Response(JSON.stringify({ ok: false, error: 'Please log in again.' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS } })
      : context.redirect('/admin/login/');
  }

  const res = await next();
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
    if (!STORY_PAGE.test(path)) res.headers.set('X-Frame-Options', 'DENY');
    if (isAdmin) {
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      res.headers.set('Cache-Control', 'no-store');
    }
  } catch { /* immutable headers on some responses */ }
  return res;
});
