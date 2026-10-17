// Cloudflare bindings (D1 database + secrets). Works on Workers and in `astro dev` (local D1 via Miniflare).
import { env as cfEnv } from 'cloudflare:workers';

export const env = (k, d) => cfEnv[k] ?? d;
export const db = () => {
  if (!cfEnv.DB) throw new Error('D1 binding "DB" is missing. Check wrangler.jsonc.');
  return cfEnv.DB;
};

export const nowIso = () => new Date().toISOString();

export const randomHex = (bytes = 6) =>
  [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');

export const clean = (s) =>
  String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim();

export const slugify = (s, max = 60) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '');

/** True when the D1 tables exist (migrations applied). Lets public pages fall back instead of crashing. */
export async function ready() {
  try { await db().prepare('SELECT 1 FROM prompts LIMIT 1').first(); return true; } catch { return false; }
}
