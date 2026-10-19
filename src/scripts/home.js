import { $, $$ } from './pf.js';

/* ---------- filter + search ---------- */
const chips = $$('.chip'), cards = $$('#lib .print'), q = $('#q'), none = $('#none');
let cur = 'all';
function run() {
  const term = q ? q.value.trim().toLowerCase() : '';
  let n = 0;
  cards.forEach((c) => {
    const show = (cur === 'all' || c.getAttribute('data-c').indexOf(cur) > -1) &&
      (!term || c.textContent.toLowerCase().indexOf(term) > -1);
    c.hidden = !show;
    if (show) n++;
  });
  if (none) none.hidden = n > 0;
}
chips.forEach((c) => c.addEventListener('click', () => {
  cur = c.getAttribute('data-f');
  chips.forEach((x) => x.setAttribute('aria-pressed', x === c));
  run();
}));
if (q) {
  q.addEventListener('input', run);
  const pre = new URLSearchParams(location.search).get('q');
  if (pre) { q.value = pre; run(); }
}

/* ---------- typing animation ---------- */
// The full text is already in the HTML (for SEO / no-JS / reduced motion). JS only replays it as typing.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seen = true;
const hero = $('.hero2--home');
if (hero && 'IntersectionObserver' in window) {
  new IntersectionObserver((e) => { seen = e[0].isIntersecting; }).observe(hero);
}
async function ready() {
  while (!seen || document.hidden) await sleep(400);
}
async function type(el, text, speed) {
  for (let i = 1; i <= text.length; i++) {
    await ready();
    el.textContent = text.slice(0, i);
    await sleep(speed);
  }
}
async function erase(el, speed) {
  const t = el.textContent;
  for (let i = t.length - 1; i >= 0; i--) {
    await ready();
    el.textContent = t.slice(0, i);
    await sleep(speed);
  }
}

// Start visual enhancements only after the initial page load has settled
const initAnimations = () => {
  const typed = $('#typed');
  if (typed && !reduce) {
    const words = JSON.parse(typed.dataset.words || '[]');
    if (words.length > 1) {
      (async () => {
        let i = 0;
        await sleep(3000);
        for (;;) {
          await ready();
          await sleep(2500);
          await erase(typed, 30);
          await sleep(200);
          i = (i + 1) % words.length;
          await type(typed, words[i], 50);
        }
      })();
    }
  }

  const box = $('#composer');
  if (box && !reduce) {
    const items = JSON.parse(box.dataset.items || '[]');
    const out = $('#ctext'), title = $('#ctitle'), btn = $('#ccopy');
    if (out && items.length > 1) {
      (async () => {
        let i = 0;
        await sleep(4500);
        for (;;) {
          await ready();
          await sleep(4000);
          i = (i + 1) % items.length;
          // Smooth fade transition prevents layout jumps and main-thread thrashing
          out.style.transition = 'opacity 0.25s ease';
          out.style.opacity = '0';
          await sleep(250);
          title.textContent = items[i].t;
          out.textContent = items[i].x;
          btn.setAttribute('data-copy', items[i].x);
          out.style.opacity = '1';
        }
      })();
    }
  }
};

if (document.readyState === 'complete') {
  setTimeout(initAnimations, 1000);
} else {
  window.addEventListener('load', () => setTimeout(initAnimations, 1000));
}
