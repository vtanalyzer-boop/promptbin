// Cloudflare bindings (D1 database + secrets). Works on Workers and in `astro dev` (local D1 via Miniflare).
import { env as cfEnv } from 'cloudflare:workers';

export const env = (k, d) => cfEnv[k] ?? d;
export const db = () => {
  // Support DB binding, or fallback names if misnamed in Cloudflare Dashboard
  const d1 = cfEnv.DB || cfEnv.DATABASE || cfEnv['promptbin-db'] || cfEnv.promptbin_db || cfEnv.d1;

  if (!d1) {
    throw new Error(
      'D1 binding "DB" is missing. In Cloudflare Dashboard, go to Settings > Bindings (or Functions > D1 Database Bindings) and add a D1 database binding with variable name "DB".'
    );
  }

  if (typeof d1 === 'string' || typeof d1.prepare !== 'function') {
    throw new Error(
      `D1 binding "DB" was added as a plain text Environment Variable ("${d1}") instead of a D1 Database Binding. In Cloudflare Dashboard, remove "DB" / "database_id" from Environment Variables and add it under D1 Database Bindings.`
    );
  }

  return d1;
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
