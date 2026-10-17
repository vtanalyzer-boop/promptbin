export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { removeImageKey } from '../../../../lib/images.js';
import { validate, getStory, createStory, updateStory, saveSlideImage, saveCoverImage } from '../../../../lib/stories.js';

const isFile = (f) => f && typeof f === 'object' && f.size > 0;

// Create (no id) or update (id) a web story.
// multipart/form-data: meta (JSON: id?, title, description, outlinkUrl, outlinkText, published, slides[{heading,text,image}]),
// cover? (3:4 WebP), slide_0 .. slide_N (9:16 WebP) for slides whose image was added or replaced.
export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let form, meta;
  try { form = await request.formData(); meta = JSON.parse(String(form.get('meta') || '{}')); } catch { return json({ ok: false, error: 'Could not read the form.' }, 400); }

  const id = String(meta.id || '');
  const v = validate(meta);
  if (v.error) return json({ ok: false, error: v.error }, 400);
  const old = id ? await getStory(id) : null;
  if (id && !old) return json({ ok: false, error: 'That story no longer exists.' }, 404);

  const created = []; // keys saved during this request, removed again if anything fails
  try {
    // Slides: new file -> store it; otherwise keep the image the story already has.
    const slides = [];
    for (const [i, s] of v.value.slides.entries()) {
      const file = form.get(`slide_${i}`);
      if (isFile(file)) {
        const key = await saveSlideImage(file);
        created.push(key);
        slides.push({ ...s, image: key });
      } else {
        const known = old?.slides.some((o) => o.image === s.image) && s.image;
        if (!known) throw new Error(`Slide ${i + 1} needs an image.`);
        slides.push(s);
      }
    }
    let cover = null;
    const coverFile = form.get('cover');
    if (isFile(coverFile)) { cover = await saveCoverImage(coverFile); created.push(cover); }
    else if (!old) throw new Error('Add a cover image (it is the poster people see in search and on the stories page).');

    const value = { ...v.value, slides };
    const item = old ? await updateStory(id, value, cover) : await createStory(value, cover);
    return json({ ok: true, item });
  } catch (e) {
    for (const k of created) await removeImageKey(k);
    return json({ ok: false, error: e.message || 'Save failed.' }, 400);
  }
}
