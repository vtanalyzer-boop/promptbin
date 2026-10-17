export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { validate, savePromptImages, createPrompt, updatePrompt, getPrompt } from '../../../../lib/store.js';
import { removeImageKey } from '../../../../lib/images.js';

// Create (no id) or update (id) a prompt. multipart/form-data: id?, title, text, cats, published, image400?, image800?
// The browser already cropped the photo to 4:5 and converted it to WebP at both sizes.
export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'Could not read the form.' }, 400); }

  const id = String(form.get('id') || '');
  const v = validate({ title: form.get('title'), text: form.get('text'), cats: form.get('cats'), published: form.get('published') });
  if (v.error) return json({ ok: false, error: v.error }, 400);

  const f400 = form.get('image400'), f800 = form.get('image800');
  const hasFile = f400 && f800 && typeof f400 === 'object' && f400.size > 0 && f800.size > 0;
  if (!id && !hasFile) return json({ ok: false, error: 'Choose a photo for this prompt.' }, 400);
  if (id && !(await getPrompt(id))) return json({ ok: false, error: 'That prompt no longer exists.' }, 404);

  let key = null;
  try {
    if (hasFile) key = await savePromptImages(f400, f800);
    const item = id ? await updatePrompt(id, v.value, key) : await createPrompt(v.value, key);
    return json({ ok: true, item });
  } catch (e) {
    if (key) await removeImageKey(key);
    return json({ ok: false, error: e.message || 'Upload failed.' }, 400);
  }
}
