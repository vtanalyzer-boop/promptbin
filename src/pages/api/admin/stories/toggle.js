export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { toggleStory } from '../../../../lib/stories.js';

export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const { id } = await request.json().catch(() => ({}));
  const item = await toggleStory(String(id || ''));
  return item ? json({ ok: true, item }) : json({ ok: false, error: 'Story not found.' }, 404);
}
