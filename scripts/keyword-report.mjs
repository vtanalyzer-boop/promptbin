// Usage: node scripts/keyword-report.mjs http://localhost:4321
// Crawls the live site (via sitemap.xml), strips header/footer/scripts and counts keyword phrases in the main page content.
const base = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const KEYS = [
  'chatgpt ai photo editing prompts',
  'chatgpt photo editing prompts',
  'chatgpt photo editing prompts trending instagram',
  'chatgpt prompt for photo editing',
  'prompt seen chatgpt',
  'chatgpt photo editing prompts text',
  'couple prompt chatgpt',
];
const get = async (p) => (await fetch(base + p)).text();
const sm = await get('/sitemap.xml');
const paths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const strip = (h) => {
  const main = (h.match(/<main[\s\S]*?<\/main>/i) || [h])[0];
  return main.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;|&#39;|&rsquo;|&#x27;/g, "'").replace(/\s+/g, ' ').toLowerCase();
};
const count = (t, k) => (t.match(new RegExp(k.replace(/ /g, '\\s+'), 'g')) || []).length;
const totals = Object.fromEntries(KEYS.map((k) => [k, 0]));
let words = 0;
const rows = [];
for (const p of paths) {
  const t = strip(await get(p));
  words += t.split(' ').length;
  const r = KEYS.map((k) => count(t, k));
  KEYS.forEach((k, i) => (totals[k] += r[i]));
  rows.push([p, t.split(' ').length, ...r]);
}
console.log('page'.padEnd(58), 'words', 'K1 K2 K3 K4 K5 K6 K7');
for (const r of rows) console.log(String(r[0]).padEnd(58), String(r[1]).padStart(5), r.slice(2).map((n) => String(n).padStart(2)).join(' '));
console.log('\nTOTALS across', paths.length, 'pages /', words, 'words of main content');
KEYS.forEach((k, i) => console.log(`K${i + 1}`, String(totals[k]).padStart(3), k));
const standalone = totals[KEYS[1]] - totals[KEYS[2]] - totals[KEYS[5]];
console.log('K2 standalone (excluding K3 and K6 matches):', standalone);
