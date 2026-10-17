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
    await sleep(speed + Math.random() * speed * 0.6);
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

const typed = $('#typed');
if (typed && !reduce) {
  const words = JSON.parse(typed.dataset.words);
  (async () => {
    let i = 0;
    await sleep(1400);
    for (;;) {
      await erase(typed, 26);
      await sleep(250);
      i = (i + 1) % words.length;
      await type(typed, words[i], 55);
      await sleep(1700);
    }
  })();
}

const box = $('#composer');
if (box && !reduce) {
  const items = JSON.parse(box.dataset.items);
  const out = $('#ctext'), title = $('#ctitle'), btn = $('#ccopy');
  (async () => {
    let i = 0;
    await sleep(2200);
    for (;;) {
      i = (i + 1) % items.length;
      out.textContent = '';
      btn.classList.remove('pulse');
      title.textContent = items[i].t;
      await type(out, items[i].x, 14);
      btn.setAttribute('data-copy', items[i].x);
      btn.classList.add('pulse');
      await sleep(3600);
    }
  })();
}
