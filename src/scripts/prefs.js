// Colour theme toggle + URL language switching (Google Website Translator).
import { $ } from './pf.js';

/* ---------- theme ---------- */
const root = document.documentElement;
const tb = $('#theme');
const setTheme = (t, save) => {
  root.setAttribute('data-theme', t);
  if (save) { try { localStorage.setItem('pb_theme', t); } catch (e) { /* storage blocked */ } }
  if (tb) { tb.setAttribute('aria-pressed', String(t === 'dark')); tb.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); }
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#0f1218' : '#d6285f');
};
setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
if (tb) tb.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));

/* ---------- URL-based language switching ---------- */
const LANGS = ['en', 'hi', 'mr', 'bn', 'ta', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'tr', 'id', 'ja', 'zh-CN'];
const sel = $('#lang');

// Detect active language from URL query (?lang=hi), pathname (/hi/...), data-lang, or cookie
const getActiveLang = () => {
  const params = new URLSearchParams(location.search);
  const q = params.get('lang');
  if (q && LANGS.includes(q)) return q;

  const match = location.pathname.match(/^\/([a-z]{2}(?:-[A-Za-z]+)?)(?:\/|$)/);
  if (match && LANGS.includes(match[1])) return match[1];

  const attr = root.getAttribute('data-lang');
  if (attr && LANGS.includes(attr)) return attr;

  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([A-Za-z-]+)/);
  if (m && LANGS.includes(m[1])) return m[1];

  return 'en';
};

const setCookie = (v) => {
  const host = location.hostname;
  const exp = v ? '; max-age=31536000' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const val = v ? '/en/' + v : '';
  document.cookie = 'googtrans=' + val + '; path=/; SameSite=Lax' + exp;
  if (host.indexOf('.') > -1) {
    document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + '; SameSite=Lax' + exp;
  }
};

const activeLang = getActiveLang();

// Ensure cookies match current language
if (activeLang !== 'en') {
  setCookie(activeLang);
} else {
  // If at default English, clear any previous translation cookie
  if (document.cookie.indexOf('googtrans=') > -1) setCookie('');
}

// Sync select dropdown and redirect to same page with selected language
if (sel) {
  sel.value = activeLang;
  sel.addEventListener('change', () => {
    const targetLang = sel.value;
    try { localStorage.setItem('pb_lang', targetLang); } catch (e) { /* ignore */ }

    // Strip any old language prefix from pathname so it doesn't 404
    const match = location.pathname.match(/^\/([a-z]{2}(?:-[A-Za-z]+)?)(?:\/|$)(.*)$/);
    let basePath = location.pathname;
    if (match && LANGS.includes(match[1])) {
      basePath = '/' + (match[2] || '');
    }
    if (!basePath.startsWith('/')) basePath = '/' + basePath;

    // Update query params on the same page
    const params = new URLSearchParams(location.search);
    if (targetLang === 'en') {
      params.delete('lang');
      setCookie('');
    } else {
      params.set('lang', targetLang);
      setCookie(targetLang);
    }

    const qs = params.toString();
    const nextUrl = basePath + (qs ? '?' + qs : '') + location.hash;
    location.href = nextUrl;
  });
}

// Preserve ?lang= parameter across internal link clicks
if (activeLang !== 'en') {
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a || !a.href) return;
    const rawHref = a.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || a.target === '_blank' || a.hasAttribute('download')) return;
    try {
      const u = new URL(a.href, location.origin);
      if (u.origin !== location.origin) return; // external link
      const p = u.pathname;
      if (p.startsWith('/admin') || p.startsWith('/api') || p.startsWith('/uploads') || p.startsWith('/site.webmanifest') || /\.[a-z0-9]+$/i.test(p)) return;

      // Clean path if it has a prefix
      const m = p.match(/^\/([a-z]{2}(?:-[A-Za-z]+)?)(?:\/|$)(.*)/);
      const cleanP = m && LANGS.includes(m[1]) ? '/' + (m[2] || '') : p;

      // Append ?lang= to target link
      const uParams = new URLSearchParams(u.search);
      uParams.set('lang', activeLang);
      a.href = cleanP + '?' + uParams.toString() + u.hash;
    } catch (_) {}
  }, true);
}

// Initialize Google Translate when non-English
if (activeLang !== 'en') {
  root.setAttribute('data-lang', activeLang);
  if (activeLang === 'ar') root.setAttribute('dir', 'rtl');

  let holder = document.getElementById('gt-el');
  if (!holder) {
    holder = document.createElement('div');
    holder.id = 'gt-el';
    document.body.appendChild(holder);
  }

  window.googleTranslateElementInit = () => {
    try {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: LANGS.join(','),
        autoDisplay: false
      }, 'gt-el');
    } catch (e) {
      /* ignore */
    }
  };

  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.head.appendChild(s);
}
