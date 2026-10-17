export const prerender = false;
import { readImage } from '../../lib/images.js';

// Serves images stored in the D1 database. File names change when an image is replaced, so they can be cached for a year.
export async function GET({ params }) {
  const img = await readImage(params.file || '').catch(() => null);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img.bytes, {
    headers: { 'Content-Type': img.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline' },
  });
}
