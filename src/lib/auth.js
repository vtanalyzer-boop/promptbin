// Minimal admin auth for Cloudflare Workers: one password, HMAC-signed HttpOnly cookie (Web Crypto, no dependencies).
import { env, db } from './db.js';

export const COOKIE = 'pb_admin';
const HOST_COOKIE = '__Host-pb_admin'; // used over HTTPS: bound to this exact host, Secure, Path=/
export const MIN_PASSWORD = 12;
const WEEK = 7 * 24 * 3600 * 1000;
const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
const secret = async () => env('SESSION_SECRET') || hex(await sha('pb-session:' + env('ADMIN_PASSWORD', '')));

async function sign(v) {
  const key = await crypto.subtle.importKey('raw', enc.encode(await secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(v)));
}
const same = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
};

export const adminEnabled = () => String(env('ADMIN_PASSWORD', '')).length >= MIN_PASSWORD; // a short password disables the console

export async function checkPassword(input) {
  if (!adminEnabled()) return false;
  return same(await sha(input ?? ''), await sha(env('ADMIN_PASSWORD')));
}

export async function makeToken() {
  const exp = String(Date.now() + WEEK);
  return `${exp}.${await sign(exp)}`;
}

async function verify(token) {
  if (!token || !adminEnabled()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(enc.encode(sig), enc.encode(await sign(exp)));
}

export async function isAuthed(request) {
  const raw = request.headers.get('cookie') || '';
  for (const name of [HOST_COOKIE, COOKIE]) {
    const m = raw.split(/;\s*/).find((c) => c.startsWith(name + '='));
    if (m && (await verify(decodeURIComponent(m.slice(name.length + 1))))) return true;
  }
  return false;
}

export const cookieHeader = (token, secure, clear = false) =>
  `${secure ? HOST_COOKIE : COOKIE}=${clear ? '' : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; ${secure ? 'Secure; ' : ''}Max-Age=${clear ? 0 : WEEK / 1000}`;

export const isSecure = (request) =>
  (request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')) === 'https';

/** CSRF defence for state-changing requests: Origin host must equal the Host we were called on. */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  try { return new URL(origin).host === host; } catch { return false; }
}

// Brute-force protection stored in D1 (shared by every Worker instance): 6 failures per IP per 15 minutes.
const WINDOW = 15 * 60 * 1000;
export async function tooMany(ip) {
  try {
    const r = await db().prepare('SELECT n, t FROM login_attempts WHERE ip = ?').bind(ip).first();
    return Boolean(r && r.n >= 6 && Date.now() - r.t < WINDOW);
  } catch { return false; }
}
export async function recordFail(ip) {
  try {
    const r = await db().prepare('SELECT n, t FROM login_attempts WHERE ip = ?').bind(ip).first();
    const fresh = !r || Date.now() - r.t > WINDOW;
    await db().prepare('INSERT OR REPLACE INTO login_attempts (ip, n, t) VALUES (?, ?, ?)').bind(ip, fresh ? 1 : r.n + 1, fresh ? Date.now() : r.t).run();
  } catch { /* ignore */ }
}
export async function clearFails(ip) {
  try { await db().prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run(); } catch { /* ignore */ }
}
