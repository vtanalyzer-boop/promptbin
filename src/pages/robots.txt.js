import { SITE } from '../data/site.js';

export const GET = ({ site }) => {
  const base = site || SITE.url;
  return new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/', 'Disallow: /404.html', 'Disallow: /500.html', '', `Sitemap: ${new URL('sitemap.xml', base).href}`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
