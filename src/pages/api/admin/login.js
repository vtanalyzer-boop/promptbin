export const prerender = false;
import { adminEnabled, checkPassword, makeToken, cookieHeader, isSecure, sameOrigin, tooMany, recordFail, clearFails } from '../../../lib/auth.js';

export async function POST({ request, clientAddress }) {
  const back = (e) => new Response(null, { status: 303, headers: { Location: `/admin/login/?e=${e}` } });
  if (!sameOrigin(request)) return back('origin');
  if (!adminEnabled()) return back('setup');
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'local';
  if (await tooMany(ip)) return back('wait');
  const form = await request.formData();
  if (!(await checkPassword(String(form.get('password') || '')))) {
    await recordFail(ip);
    return back('bad');
  }
  await clearFails(ip);
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/', 'Set-Cookie': cookieHeader(await makeToken(), isSecure(request)) },
  });
}
