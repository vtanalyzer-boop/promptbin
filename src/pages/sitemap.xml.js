import { getCollection } from 'astro:content';
import { listStories } from '../lib/stories.js';

export const prerender = false; // lists web stories from the D1 database

// Static pages + every blog post. (The home page grid is dynamic but the URL is constant.)
export async function GET({ site }) {
  const posts = await getCollection('blog');
  const today = new Date().toISOString().slice(0, 10);
  const fixed = [
    ['/', 'daily', '1.0'], ['/ai-photo-prompt-tool/', 'monthly', '0.9'], ['/web-stories/', 'daily', '0.8'], ['/blog/', 'weekly', '0.8'], ['/faq/', 'monthly', '0.7'],
    ['/about/', 'yearly', '0.5'], ['/contact/', 'yearly', '0.4'], ['/privacy-policy/', 'yearly', '0.2'],
    ['/terms-and-conditions/', 'yearly', '0.2'], ['/disclaimer/', 'yearly', '0.2'],
  ].map(([p, f, pr]) => ({ loc: p, lastmod: today, f, pr }));
  const blog = posts.map((p) => ({ loc: `/blog/${p.id}/`, lastmod: (p.data.updatedDate ?? p.data.pubDate).toISOString().slice(0, 10), f: 'monthly', pr: '0.8' }));
  const stories = (await listStories({ publishedOnly: true, limit: 500 })).map((s) => ({ loc: `/web-stories/${s.id}/`, lastmod: s.updatedAt.slice(0, 10), f: 'weekly', pr: '0.7' }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    [...fixed, ...blog, ...stories].map((u) => `<url><loc>${new URL(u.loc, site).href}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.f}</changefreq><priority>${u.pr}</priority></url>`).join('') + `</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
