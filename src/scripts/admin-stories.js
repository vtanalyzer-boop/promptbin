import { $, $$, say } from './pf.js';
import { cropToBlob } from './imgtools.js';

const { rows, limits: L } = JSON.parse($('#data').textContent);
const byId = Object.fromEntries(rows.map((s) => [s.id, s]));
const f = $('#f'), msg = $('#msg'), box = $('#slides'), MAX = 15 * 1024 * 1024;
const show = (m, ok) => { msg.textContent = m; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let slides = [];   // { image, url, file, heading, text }
let cover = null;  // { file, url }
let editing = null;

const counters = () => {
  $('#c-title').textContent = `${$('#f-title').value.length} / ${L.title}`;
  $('#c-desc').textContent = `${$('#f-desc').value.length} / ${L.description}`;
  $('#c-slides').textContent = `(${slides.length} of ${L.minSlides} to ${L.maxSlides})`;
};
$('#f-title').addEventListener('input', counters);
$('#f-desc').addEventListener('input', counters);

function render() {
  box.innerHTML = slides.map((s, i) => `
    <div class="slide" data-i="${i}">
      <div class="slide-img drop"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Image for slide ${i + 1}" />
        ${s.url ? `<img src="${esc(s.url)}" alt="" />` : '<span>Add 9:16 image</span>'}</div>
      <div class="slide-f">
        <div class="slide-h"><b>Slide ${i + 1}</b>
          <span><button type="button" class="btn alt sm" data-m="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
          <button type="button" class="btn alt sm" data-m="down" ${i === slides.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
          <button type="button" class="btn alt sm dng" data-m="rm" aria-label="Remove slide">&times;</button></span></div>
        <input type="text" data-k="heading" maxlength="${L.heading}" placeholder="Headline" value="${esc(s.heading)}" aria-label="Headline for slide ${i + 1}" />
        <textarea data-k="text" maxlength="${L.text}" style="min-height:70px" placeholder="One or two short lines (optional)" aria-label="Text for slide ${i + 1}">${esc(s.text)}</textarea>
      </div>
    </div>`).join('');
  counters();
}

box.addEventListener('input', (e) => {
  const row = e.target.closest('.slide'); if (!row) return;
  const s = slides[+row.dataset.i];
  if (e.target.dataset.k) s[e.target.dataset.k] = e.target.value;
});
box.addEventListener('change', (e) => {
  if (e.target.type !== 'file') return;
  const s = slides[+e.target.closest('.slide').dataset.i], fl = e.target.files[0];
  if (!fl) return;
  if (fl.size > MAX) { say('That photo is larger than 15 MB.'); return; }
  s.file = fl; s.url = URL.createObjectURL(fl); render();
});
box.addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  const i = +b.closest('.slide').dataset.i;
  if (b.dataset.m === 'rm') slides.splice(i, 1);
  else { const j = b.dataset.m === 'up' ? i - 1 : i + 1; [slides[i], slides[j]] = [slides[j], slides[i]]; }
  render();
});
$('#add').addEventListener('click', () => {
  if (slides.length >= L.maxSlides) return say(`At most ${L.maxSlides} slides.`);
  slides.push({ image: '', url: '', file: null, heading: '', text: '' }); render();
  box.lastElementChild.querySelector('[data-k=heading]').focus();
});

$('#f-cover').addEventListener('change', (e) => {
  const fl = e.target.files[0]; if (!fl) return;
  if (fl.size > MAX) { show('That photo is larger than 15 MB.', false); e.target.value = ''; return; }
  cover = { file: fl, url: URL.createObjectURL(fl) };
  $('#cover-prev').src = cover.url; $('#cover-prev').hidden = false; $('#cover-t').textContent = fl.name;
});

function reset() {
  f.reset(); editing = null; $('#f-id').value = ''; $('#ft').textContent = 'New web story';
  cover = null; $('#cover-prev').hidden = true; $('#cover-t').textContent = 'Click or drop a cover image';
  slides = Array.from({ length: L.minSlides }, () => ({ image: '', url: '', file: null, heading: '', text: '' }));
  $('#f-pub').checked = true; $('#cancel').hidden = true; msg.className = 'msg'; render();
}
$('#cancel').addEventListener('click', reset);

function edit(s) {
  reset(); editing = s;
  $('#f-id').value = s.id; $('#f-title').value = s.title; $('#f-desc').value = s.description;
  $('#f-url').value = s.outlinkUrl || ''; $('#f-cta').value = s.outlinkText || ''; $('#f-pub').checked = s.published;
  $('#cover-prev').src = s.coverUrl; $('#cover-prev').hidden = false; $('#cover-t').textContent = 'Choose a new cover to replace this one (optional)';
  slides = s.slides.map((x) => ({ image: x.image, url: x.url, file: null, heading: x.heading, text: x.text }));
  $('#ft').textContent = 'Edit web story'; $('#cancel').hidden = false; render();
  f.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#f-title').focus();
}

async function post(url, body, isJson) {
  const r = await fetch(url, { method: 'POST', body: isJson ? JSON.stringify(body) : body, headers: isJson ? { 'Content-Type': 'application/json' } : {}, credentials: 'same-origin' });
  if (r.status === 401) { location.href = '/admin/login/'; return { ok: false, error: 'Logged out.' }; }
  return r.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }));
}

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#save');
  const fail = (m) => { btn.disabled = false; btn.textContent = 'Save story'; show(m, false); };
  if (slides.length < L.minSlides) return show(`Add at least ${L.minSlides} slides.`, false);
  if (!editing && !cover) return show('Add a cover image.', false);
  const i0 = slides.findIndex((s) => !s.image && !s.file);
  if (i0 >= 0) return show(`Slide ${i0 + 1} needs an image.`, false);

  btn.disabled = true; btn.textContent = 'Processing images...';
  const fd = new FormData();
  try {
    if (cover) fd.set('cover', await cropToBlob(cover.file, 640, 853, 0.8), 'cover.webp');
    for (const [i, s] of slides.entries()) if (s.file) fd.set(`slide_${i}`, await cropToBlob(s.file, 720, 1280, 0.78), `slide${i}.webp`);
  } catch (err) { return fail(err.message); }

  fd.set('meta', JSON.stringify({
    id: $('#f-id').value, title: $('#f-title').value, description: $('#f-desc').value,
    outlinkUrl: $('#f-url').value, outlinkText: $('#f-cta').value, published: $('#f-pub').checked,
    slides: slides.map((s) => ({ image: s.file ? '' : s.image, heading: s.heading, text: s.text })),
  }));
  btn.textContent = 'Saving...';
  const res = await post('/api/admin/stories/', fd, false);
  if (!res.ok) return fail(res.error);
  show('Saved. Reloading...', true); say('Saved');
  setTimeout(() => location.reload(), 500);
});

$('#rows').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const id = b.closest('.arow').dataset.id, s = byId[id];
  if (b.dataset.a === 'edit') return edit(s);
  if (b.dataset.a === 'toggle') { const r = await post('/api/admin/stories/toggle/', { id }, true); return r.ok ? location.reload() : say(r.error); }
  if (b.dataset.a === 'del' && confirm(`Delete "${s.title}"? This also deletes its images.`)) {
    const r = await post('/api/admin/stories/delete/', { id }, true); return r.ok ? location.reload() : say(r.error);
  }
});
$('#s').addEventListener('input', (e) => {
  const t = e.target.value.trim().toLowerCase();
  $$('#rows .arow').forEach((r) => { r.hidden = t && !r.textContent.toLowerCase().includes(t); });
});

reset();
