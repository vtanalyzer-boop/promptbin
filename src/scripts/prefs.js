// Colour theme toggle + language selector (Google Website Translator, loaded only when a language is chosen).
import { $ } from './pf.js';

/* ---------- theme ---------- */
const root = document.documentElement, tb = $('#theme');
const setTheme = (t, save) => {
  root.setAttribute('data-theme', t);
  if (save) { try { localStorage.setItem('pb_theme', t); } catch (e) { /* storage blocked */ } }
  if (tb) { tb.setAttribute('aria-pressed', String(t === 'dark')); tb.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); }
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#0f1218' : '#d6285f');
};
setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
if (tb) tb.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));

/* ---------- language ---------- */
const LANGS = ['en', 'hi', 'mr', 'bn', 'ta', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'tr', 'id', 'ja', 'zh-CN'];
const sel = $('#lang');
const current = () => { const m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([A-Za-z-]+)/); return m && LANGS.includes(m[1]) ? m[1] : 'en'; };
const setCookie = (v) => {
  const host = location.hostname, exp = v ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const val = v ? '/en/' + v : '';
  document.cookie = 'googtrans=' + val + '; path=/; SameSite=Lax' + exp;
  if (host.indexOf('.') > -1) document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + '; SameSite=Lax' + exp;
};
const lang = current();
if (sel) {
  sel.value = lang;
  sel.addEventListener('change', () => {
    try { localStorage.setItem('pb_lang', sel.value); } catch (e) { /* ignore */ }
    setCookie(sel.value === 'en' ? '' : sel.value);
    location.reload();
  });
}
if (lang !== 'en') {
  document.documentElement.setAttribute('data-lang', lang);
  const holder = document.createElement('div'); holder.id = 'gt-el'; document.body.appendChild(holder);
  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: LANGS.join(','), autoDisplay: false }, 'gt-el');
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true; document.head.appendChild(s);
}
