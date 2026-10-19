import { $, copy, say } from './pf.js';

// Copy buttons: any element with data-copy inside .print or .pbox
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const box = b.closest('.print,.pbox');
  const pt = box && $('.pt,p', box);
  const text = b.getAttribute('data-copy') || (pt ? pt.textContent : '') || '';
  const label = b.getAttribute('data-label') || b.textContent;
  copy(text.trim()).then(() => {
    say('Prompt copied');
    b.textContent = 'Copied';
    b.classList.add('ok');
    setTimeout(() => { b.textContent = label; b.classList.remove('ok'); }, 1500);
  });
});

// Expand / collapse prompt text
document.addEventListener('click', (e) => {
  const p = e.target.closest('.print .pt');
  if (p) p.classList.toggle('open');
});

// Mobile nav
const nb = $('#nb'), nav = $('#nav');
if (nb && nav) {
  nb.addEventListener('click', () => {
    const o = nav.classList.toggle('open');
    nb.setAttribute('aria-expanded', o);
  });
}
