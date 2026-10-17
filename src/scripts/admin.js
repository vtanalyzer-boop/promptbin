import { $, $$, say } from './pf.js';
import { cropToBlob } from './imgtools.js';

const items = JSON.parse($('#data').textContent);
const byId = Object.fromEntries(items.map((p) => [p.id, p]));
const f = $('#f'), msg = $('#msg'), text = $('#f-text'), file = $('#f-img'), prev = $('#prev'), drop = $('#drop');
const MAX = 10 * 1024 * 1024;

const show = (m, ok) => { msg.textContent = m; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
const count = () => { $('#f-count').textContent = text.value.length + ' / 1200'; };
text.addEventListener('input', count); count();

/* photo preview + validation */
function preview(fl) {
  if (!fl) { prev.hidden = true; $('#drop-t').textContent = 'Click or drop a photo'; return; }
  if (fl.size > MAX) { show('That photo is larger than 10 MB.', false); file.value = ''; return; }
  prev.src = URL.createObjectURL(fl); prev.hidden = false;
  $('#drop-t').textContent = fl.name;
}
file.addEventListener('change', () => preview(file.files[0]));
['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, () => drop.classList.add('on')));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, () => drop.classList.remove('on')));

function reset() {
  f.reset(); $('#f-id').value = ''; $('#ft').textContent = 'Add prompt';
  $$('#f-cats input').forEach((c) => (c.checked = false));
  $('#f-pub').checked = true; prev.hidden = true; $('#drop-t').textContent = 'Click or drop a photo';
  $('#cancel').hidden = true; msg.className = 'msg'; count();
}
$('#cancel').addEventListener('click', reset);

function edit(p) {
  reset();
  $('#f-id').value = p.id; $('#f-title').value = p.title; text.value = p.text;
  $$('#f-cats input').forEach((c) => (c.checked = p.cats.split(' ').includes(c.value)));
  $('#f-pub').checked = p.published;
  if (p.thumb) { prev.src = p.thumb; prev.hidden = false; }
  $('#drop-t').textContent = 'Choose a new photo to replace this one (optional)';
  $('#ft').textContent = 'Edit prompt'; $('#cancel').hidden = false; count();
  f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#f-title').focus();
}

async function post(url, body, isJson) {
  const r = await fetch(url, { method: 'POST', body: isJson ? JSON.stringify(body) : body, headers: isJson ? { 'Content-Type': 'application/json' } : {}, credentials: 'same-origin' });
  if (r.status === 401) { location.href = '/admin/login/'; return { ok: false, error: 'Logged out.' }; }
  return r.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }));
}

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cats = $$('#f-cats input:checked').map((c) => c.value).join(' ');
  if (!cats) return show('Pick at least one category.', false);
  const fd = new FormData();
  fd.set('id', $('#f-id').value); fd.set('title', $('#f-title').value); fd.set('text', text.value);
  fd.set('cats', cats); fd.set('published', $('#f-pub').checked ? 'true' : 'false');
  const btn = $('#save'); btn.disabled = true; btn.textContent = 'Saving...';
  if (file.files[0]) {
    try {
      // Crop to 4:5 and convert to WebP here in the browser (400 and 800 px wide), which also strips EXIF/GPS data.
      fd.set('image800', await cropToBlob(file.files[0], 800, 1000, 0.8), 'p800.webp');
      fd.set('image400', await cropToBlob(file.files[0], 400, 500, 0.74), 'p400.webp');
    } catch (err) { btn.disabled = false; btn.textContent = 'Save prompt'; return show(err.message, false); }
  }
  const res = await post('/api/admin/prompts/', fd, false);
  btn.disabled = false; btn.textContent = 'Save prompt';
  if (!res.ok) return show(res.error, false);
  show('Saved. Reloading...', true); say('Saved');
  setTimeout(() => location.reload(), 500);
});

$('#rows').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const id = b.closest('.arow').dataset.id, p = byId[id];
  if (b.dataset.a === 'edit') return edit(p);
  if (b.dataset.a === 'toggle') {
    const r = await post('/api/admin/prompts/toggle/', { id }, true);
    return r.ok ? location.reload() : say(r.error);
  }
  if (b.dataset.a === 'del' && confirm(`Delete "${p.title}"? This also deletes its photo.`)) {
    const r = await post('/api/admin/prompts/delete/', { id }, true);
    return r.ok ? location.reload() : say(r.error);
  }
});

$('#s').addEventListener('input', (e) => {
  const t = e.target.value.trim().toLowerCase();
  $$('#rows .arow').forEach((r) => { r.hidden = t && !r.textContent.toLowerCase().includes(t); });
});
