export const GET = ({ site }) =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/', 'Disallow: /404.html', 'Disallow: /500.html', '', `Sitemap: ${new URL('sitemap.xml', site).href}`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
