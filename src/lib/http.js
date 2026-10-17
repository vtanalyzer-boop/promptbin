import { isAuthed, sameOrigin } from './auth.js';

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Guard for every admin API call: logged in + same-origin POST. Returns a Response if blocked. */
export async function guard(request) {
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ ok: false, error: 'Blocked: request came from another site.' }, 403);
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Please log in again.' }, 401);
  if (Number(request.headers.get('content-length') || 0) > 12 * 1024 * 1024) return json({ ok: false, error: 'Upload is too large.' }, 413);
  return null;
}
