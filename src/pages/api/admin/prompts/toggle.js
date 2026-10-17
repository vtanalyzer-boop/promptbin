export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { togglePrompt } from '../../../../lib/store.js';

export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const { id } = await request.json().catch(() => ({}));
  const item = await togglePrompt(String(id || ''));
  return item ? json({ ok: true, item }) : json({ ok: false, error: 'Prompt not found.' }, 404);
}
