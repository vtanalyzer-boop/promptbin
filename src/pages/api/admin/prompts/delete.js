export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { deletePrompt } from '../../../../lib/store.js';

export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const { id } = await request.json().catch(() => ({}));
  return (await deletePrompt(String(id || ''))) ? json({ ok: true }) : json({ ok: false, error: 'Prompt not found.' }, 404);
}
