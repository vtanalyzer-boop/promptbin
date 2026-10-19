import { defineMiddleware } from 'astro:middleware';
import { isAuthed } from './lib/auth.js';

const PUBLIC_ADMIN = new Set(['/admin/login/', '/api/admin/login/']);
const STORY_PAGE = /^\/web-stories\/[^/]+\/$/; // AMP stories may be embedded by Google, so they are not frame-blocked

const SUPPORTED_LANGS = new Set([
  'en', 'hi', 'mr', 'bn', 'ta', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'tr', 'id', 'ja', 'zh-CN'
]);

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

  // Extract leading language code if present (e.g. /hi/, /hi/faq/, /en/faq/)
  const langMatch = path.match(/^\/([a-z]{2}(?:-[A-Za-z]+)?)(?:\/|$)(.*)/);
  const matchedLang = langMatch && SUPPORTED_LANGS.has(langMatch[1]) ? langMatch[1] : null;
  const restPath = langMatch && matchedLang ? '/' + (langMatch[2] || '') : path;

  // If someone requests /admin or /api prefixed with a language, redirect to un-prefixed route
  if (matchedLang && (restPath.startsWith('/admin') || restPath.startsWith('/api/'))) {
    return context.redirect(restPath);
  }

  // If someone requests a language path (e.g. /hi/, /hi/faq/), redirect to the same page with ?lang=
  if (matchedLang) {
    const cleanTarget = restPath === '/' ? '/' : restPath.replace(/\/?$/, '/');
    if (matchedLang === 'en') {
      return context.redirect(cleanTarget, 301);
    }
    const headers = new Headers();
    headers.set('Location', `${cleanTarget}?lang=${matchedLang}`);
    headers.set('Set-Cookie', `googtrans=/en/${matchedLang}; Path=/; SameSite=Lax`);
    return new Response(null, { status: 302, headers });
  }

  // Admin authentication check
  const isAdmin = path.startsWith('/admin') || path.startsWith('/api/');
  if (isAdmin && !PUBLIC_ADMIN.has(path) && !(await isAuthed(context.request))) {
    return path.startsWith('/api/')
      ? new Response(JSON.stringify({ ok: false, error: 'Please log in again.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS },
        })
      : context.redirect('/admin/login/');
  }

  // Populate locals with active language from query param or default
  const urlLang = context.url.searchParams.get('lang');
  const activeLang = urlLang && SUPPORTED_LANGS.has(urlLang) ? urlLang : 'en';
  context.locals.lang = activeLang;

  const res = await next();
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
    if (!STORY_PAGE.test(path)) res.headers.set('X-Frame-Options', 'DENY');
    if (isAdmin) {
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      res.headers.set('Cache-Control', 'no-store');
    }

    // Attach googtrans cookie matching active language
    if (activeLang !== 'en') {
      res.headers.append('Set-Cookie', `googtrans=/en/${activeLang}; Path=/; SameSite=Lax`);
    } else if (context.cookies.has('googtrans') && !urlLang) {
      // Clear translation cookie on English (default) pages
      res.headers.append('Set-Cookie', 'googtrans=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax');
    }
  } catch {
    /* immutable headers on some responses */
  }
  return res;
});
