// Browser-side image processing for the admin console: center-crop to an exact size and encode as WebP (JPEG fallback).
export async function cropToBlob(file, w, h, quality = 0.82) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('That file is not a supported image. Use JPG, PNG, WebP or AVIF.'); }
  const scale = Math.max(w / bmp.width, h / bmp.height);
  const sw = w / scale, sh = h / scale;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h);
  bmp.close?.();
  const enc = (type, q) => new Promise((res) => c.toBlob(res, type, q));
  let blob = await enc('image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await enc('image/jpeg', 0.8);
  // Shrink quality until it fits the 450 KB server limit.
  for (let q = quality - 0.1; blob && blob.size > 440 * 1024 && q > 0.4; q -= 0.1) blob = await enc(blob.type, q);
  if (!blob || blob.size > 440 * 1024) throw new Error('That image is too detailed to compress enough. Try a smaller photo.');
  return blob;
}
