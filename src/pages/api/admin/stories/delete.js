export const prerender = false;
import { guard, json } from '../../../../lib/http.js';
import { deleteStory } from '../../../../lib/stories.js';

export async function POST({ request }) {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const { id } = await request.json().catch(() => ({}));
  return (await deleteStory(String(id || ''))) ? json({ ok: true }) : json({ ok: false, error: 'Story not found.' }, 404);
}
