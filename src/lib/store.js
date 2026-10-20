// Prompts, backed by Cloudflare D1.
import { db, clean, slugify, nowIso, randomHex } from './db.js';
import { PROMPTS } from '../data/prompts.js';
import { saveImage, removeImageKey, newImageKey } from './images.js';

/** Public URL of a prompt's uploaded photo (size 400 or 800), or null when it uses the built-in illustration. */
export const imageUrl = (p, size = 400) => (p?.image ? `/uploads/${p.image}-${size}.webp` : null);

export const CATS = ['trending', 'couple', 'family', 'portrait', 'text', 'style', 'background'];

const fromRow = (r) => ({ id: r.id, slug: r.id, title: r.title, text: r.text, cats: r.cats, image: r.image, published: !!r.published, createdAt: r.created_at });

/** Built-in starter prompts, used only if the database is empty or unreachable. */
const fallback = () => PROMPTS.map((p, i) => ({ id: p.slug, slug: p.slug, title: p.title, cats: p.cats, text: p.text, image: null, published: true, createdAt: new Date(Date.parse('2026-10-01T00:00:00Z') - i * 1000).toISOString() }));

export async function listPrompts({ publishedOnly = false } = {}) {
  try {
    const q = publishedOnly ? 'SELECT * FROM prompts WHERE published = 1 ORDER BY created_at DESC' : 'SELECT * FROM prompts ORDER BY created_at DESC';
    const { results } = await db().prepare(q).all();
    return results.map(fromRow);
  } catch (e) {
    console.error('[store] D1 unavailable, using built-in prompts:', e.message);
    return fallback();
  }
}

export async function getPrompt(id) {
  const r = await db().prepare('SELECT * FROM prompts WHERE id = ?').bind(id).first();
  return r ? fromRow(r) : null;
}

export function validate(f) {
  const title = clean(f.title);
  const text = clean(f.text);
  const cats = [...new Set(String(f.cats || '').split(/[\s,]+/).filter((c) => CATS.includes(c)))];
  if (title.length < 3 || title.length > 80) return { error: 'Title must be 3 to 80 characters.' };
  if (text.length < 20 || text.length > 1200) return { error: 'Prompt must be 20 to 1200 characters.' };
  if (!cats.length) return { error: 'Pick at least one category.' };
  return { value: { title, text, cats: cats.join(' '), published: f.published === true || f.published === 'on' || f.published === 'true' } };
}

/** Save the two sizes the browser produced (400x500 and 800x1000). Returns the new image key. */
export async function savePromptImages(file400, file800) {
  const key = newImageKey();
  try {
    await saveImage(file800, key, '800');
    await saveImage(file400, key, '400');
  } catch (e) { await removeImageKey(key); throw e; }
  return key;
}

export async function createPrompt(value, imageKey) {
  let id = slugify(value.title, 48) || 'prompt';
  if (await getPrompt(id)) id += '-' + randomHex(2);
  await db().prepare('INSERT INTO prompts (id, title, text, cats, image, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, value.title, value.text, value.cats, imageKey || null, value.published ? 1 : 0, nowIso()).run();
  return getPrompt(id);
}

export async function updatePrompt(id, value, imageKey) {
  const old = await getPrompt(id);
  if (!old) return null;
  const image = imageKey ?? old.image;
  await db().prepare('UPDATE prompts SET title = ?, text = ?, cats = ?, image = ?, published = ? WHERE id = ?')
    .bind(value.title ?? old.title, value.text ?? old.text, value.cats ?? old.cats, image, (value.published ?? old.published) ? 1 : 0, id).run();
  if (imageKey && old.image && old.image !== imageKey) await removeImageKey(old.image);
  return getPrompt(id);
}

export async function togglePrompt(id) {
  const p = await getPrompt(id);
  return p ? updatePrompt(id, { published: !p.published }) : null;
}

export async function deletePrompt(id) {
  const p = await getPrompt(id);
  if (!p) return false;
  await removeImageKey(p.image);
  await db().prepare('DELETE FROM prompts WHERE id = ?').bind(id).run();
  return true;
}
