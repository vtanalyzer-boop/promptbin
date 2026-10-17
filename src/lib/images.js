// Images live in D1 as base64 text. The admin console resizes to WebP in the browser, so no image library is needed on the server.
import { db, nowIso, randomHex } from './db.js';

export const MAX_IMAGE_BYTES = 450 * 1024; // per processed file (a 720x1280 WebP is normally 60 to 150 KB)
export const IMAGE_NAME = /^[a-f0-9]{12}-(400|800|s|p)$/;

const toB64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Returns 'image/webp' | 'image/jpeg' | null by checking the file signature, never the client-declared type. */
export function sniff(u8) {
  if (u8.length > 12 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'image/jpeg';
  if (u8.length > 12 && String.fromCharCode(...u8.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...u8.subarray(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

/** Save one uploaded File under `${key}-${suffix}`. */
export async function saveImage(file, key, suffix) {
  if (!file || typeof file !== 'object' || !file.size) throw new Error('Missing image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('An image is still too large after resizing. Try a smaller photo.');
  const u8 = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(u8);
  if (!mime) throw new Error('Images must be WebP or JPEG (the console converts them for you).');
  await db().prepare('INSERT OR REPLACE INTO images (name, mime, data, created_at) VALUES (?, ?, ?, ?)')
    .bind(`${key}-${suffix}`, mime, toB64(u8), nowIso()).run();
  return key;
}

export const newImageKey = () => randomHex(6);

export async function readImage(name) {
  if (!IMAGE_NAME.test(name)) return null;
  const row = await db().prepare('SELECT mime, data FROM images WHERE name = ?').bind(name).first();
  return row ? { mime: row.mime, bytes: fromB64(row.data) } : null;
}

export async function removeImageKey(key) {
  if (!key || !/^[a-f0-9]{12}$/.test(key)) return;
  await db().prepare('DELETE FROM images WHERE name LIKE ?').bind(`${key}-%`).run();
}
