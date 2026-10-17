// Web Stories (AMP), backed by Cloudflare D1.
import { db, clean, slugify, nowIso, randomHex } from './db.js';
import { saveImage, removeImageKey, newImageKey } from './images.js';

export const LIMITS = { minSlides: 4, maxSlides: 20, title: 60, description: 160, heading: 70, text: 220, cta: 30 };

/** Slide/cover image value: a 12-hex key stored in D1, or a root-relative /public path (starter stories). */
export const slideSrc = (v) => (v && v.startsWith('/') ? v : `/uploads/${v}-s.webp`);
export const coverSrc = (v) => (v && v.startsWith('/') ? v : `/uploads/${v}-p.webp`);

const fromRow = (r) => ({
  id: r.id, slug: r.id, title: r.title, description: r.description, cover: r.cover,
  slides: JSON.parse(r.slides || '[]'), outlinkUrl: r.outlink_url || '', outlinkText: r.outlink_text || '',
  published: !!r.published, createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function listStories({ publishedOnly = false, limit = 100 } = {}) {
  try {
    const q = `SELECT * FROM stories ${publishedOnly ? 'WHERE published = 1' : ''} ORDER BY created_at DESC LIMIT ?`;
    const { results } = await db().prepare(q).bind(limit).all();
    return results.map(fromRow);
  } catch (e) {
    console.error('[stories] D1 unavailable:', e.message);
    return [];
  }
}

export async function getStory(id) {
  const r = await db().prepare('SELECT * FROM stories WHERE id = ?').bind(id).first();
  return r ? fromRow(r) : null;
}

const validUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:'; } catch { return false; } };

/** Validates the JSON "meta" the editor sends. Slide images are checked by the caller. */
export function validate(meta) {
  const title = clean(meta.title);
  const description = clean(meta.description);
  if (title.length < 5 || title.length > LIMITS.title) return { error: `Story title must be 5 to ${LIMITS.title} characters (it becomes the page title, so Google shows it in full).` };
  if (description.length < 70 || description.length > LIMITS.description) return { error: `Description must be 70 to ${LIMITS.description} characters (it becomes the meta description).` };
  const slides = Array.isArray(meta.slides) ? meta.slides : [];
  if (slides.length < LIMITS.minSlides) return { error: `A web story needs at least ${LIMITS.minSlides} slides.` };
  if (slides.length > LIMITS.maxSlides) return { error: `A web story can have at most ${LIMITS.maxSlides} slides.` };
  const out = [];
  for (const [i, s] of slides.entries()) {
    const heading = clean(s.heading), text = clean(s.text);
    if (heading.length < 3 || heading.length > LIMITS.heading) return { error: `Slide ${i + 1}: headline must be 3 to ${LIMITS.heading} characters.` };
    if (text.length > LIMITS.text) return { error: `Slide ${i + 1}: text can be at most ${LIMITS.text} characters.` };
    out.push({ heading, text, image: String(s.image || '') });
  }
  let outlinkUrl = clean(meta.outlinkUrl), outlinkText = clean(meta.outlinkText);
  // A path like /blog/ is allowed (resolved against the site at render time); anything else must be https.
  if (outlinkUrl && !(/^\/(?!\/)[^\s]*$/.test(outlinkUrl) || validUrl(outlinkUrl))) return { error: 'The last-slide link must be a full https:// address (or a path starting with /).' };
  if (outlinkUrl && !outlinkText) outlinkText = 'Read more';
  if (outlinkText.length > LIMITS.cta) return { error: `Button text can be at most ${LIMITS.cta} characters.` };
  return { value: { title, description, slides: out, outlinkUrl, outlinkText, published: meta.published === true || meta.published === 'true' } };
}

export async function saveSlideImage(file) {
  const key = newImageKey();
  try { await saveImage(file, key, 's'); } catch (e) { await removeImageKey(key); throw e; }
  return key;
}
export async function saveCoverImage(file) {
  const key = newImageKey();
  try { await saveImage(file, key, 'p'); } catch (e) { await removeImageKey(key); throw e; }
  return key;
}

const keysOf = (story) => [...new Set([story.cover, ...story.slides.map((s) => s.image)].filter((k) => k && !k.startsWith('/')))];

export async function createStory(value, cover) {
  let id = slugify(value.title, 70) || 'story';
  if (await getStory(id)) id += '-' + randomHex(2);
  const now = nowIso();
  await db().prepare('INSERT INTO stories (id, title, description, cover, slides, outlink_url, outlink_text, published, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id, value.title, value.description, cover, JSON.stringify(value.slides), value.outlinkUrl || null, value.outlinkText || null, value.published ? 1 : 0, now, now).run();
  return getStory(id);
}

export async function updateStory(id, value, cover) {
  const old = await getStory(id);
  if (!old) return null;
  const next = cover || old.cover;
  await db().prepare('UPDATE stories SET title=?, description=?, cover=?, slides=?, outlink_url=?, outlink_text=?, published=?, updated_at=? WHERE id=?')
    .bind(value.title, value.description, next, JSON.stringify(value.slides), value.outlinkUrl || null, value.outlinkText || null, value.published ? 1 : 0, nowIso(), id).run();
  // Clean up images that are no longer referenced.
  const now = await getStory(id);
  const keep = new Set(keysOf(now));
  for (const k of keysOf(old)) if (!keep.has(k)) await removeImageKey(k);
  return now;
}

export async function toggleStory(id) {
  const s = await getStory(id);
  if (!s) return null;
  await db().prepare('UPDATE stories SET published = ?, updated_at = ? WHERE id = ?').bind(s.published ? 0 : 1, nowIso(), id).run();
  return getStory(id);
}

export async function deleteStory(id) {
  const s = await getStory(id);
  if (!s) return false;
  for (const k of keysOf(s)) await removeImageKey(k);
  await db().prepare('DELETE FROM stories WHERE id = ?').bind(id).run();
  return true;
}
