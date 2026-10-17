// Built-in placeholder illustrations: src/assets/prompts/<slug>.(svg|jpg|png|webp|avif)
const files = import.meta.glob('../assets/prompts/*.{svg,jpg,jpeg,png,webp,avif}', { eager: true, import: 'default' });

export function getImgSafe(slug) {
  const key = Object.keys(files).find((k) => k.split('/').pop().replace(/\.[^.]+$/, '') === slug);
  return key ? files[key] : null;
}
export const getImg = getImgSafe;
