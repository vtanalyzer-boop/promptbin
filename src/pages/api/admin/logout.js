export const prerender = false;
import { cookieHeader, isSecure, sameOrigin } from '../../../lib/auth.js';

export async function POST({ request }) {
  if (!sameOrigin(request)) return new Response('Blocked', { status: 403 });
  return new Response(null, { status: 303, headers: { Location: '/admin/login/', 'Set-Cookie': cookieHeader('', isSecure(request), true) } });
}
