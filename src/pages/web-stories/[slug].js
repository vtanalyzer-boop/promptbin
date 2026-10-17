// Web Story (AMP), served from Cloudflare D1 so stories posted in /admin/stories/ go live immediately.
// Returned as a raw Response (not an Astro page) so no site scripts are injected: AMP allows only its own scripts.
export const prerender = false;
import { getStory, slideSrc, coverSrc } from '../../lib/stories.js';
import { SITE } from '../../data/site.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BOILER = 'body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}';
const CSS = `amp-story{font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;color:#fff}amp-story-page{background:#161a23}.scrim{background:linear-gradient(to top,rgba(10,12,18,.92) 0%,rgba(10,12,18,.55) 42%,rgba(10,12,18,0) 70%)}.copy{align-content:end;padding:0 24px 56px}.brand{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff9db8;margin:0 0 10px}h1,h2{font-size:34px;line-height:1.1;font-weight:800;margin:0 0 12px;letter-spacing:-.02em}p{font-size:18px;line-height:1.45;margin:0;color:#f1f2f6}.count{font-size:13px;margin-top:14px;color:#c4c9d6}`;

const fit = (t, suffix) => (t.length + suffix.length <= 60 ? t + suffix : t);

export async function GET({ params, site }) {
  let story = null;
  try { story = await getStory(params.slug); } catch { story = null; }
  if (!story || !story.published) return new Response('Story not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

  const abs = (p) => new URL(p, site).href;
  const canonical = abs(`/web-stories/${story.id}/`);
  const poster = abs(coverSrc(story.cover));
  const logo = abs('/web-app-manifest-512x512.png');
  const last = story.slides.length - 1;
  const outlink = story.outlinkUrl ? abs(story.outlinkUrl) : '';
  const schema = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: story.title, description: story.description,
    image: [poster], mainEntityOfPage: canonical, datePublished: story.createdAt, dateModified: story.updatedAt,
    author: { '@type': 'Person', name: SITE.manager.name },
    publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: logo } },
  };
  const pages = story.slides.map((s, i) => `<amp-story-page id="p${i + 1}"${i === last ? '' : ' auto-advance-after="7s"'}>
<amp-story-grid-layer template="fill"><amp-img src="${esc(abs(slideSrc(s.image)))}" width="720" height="1280" layout="fill" alt="${esc(`${s.heading} - ChatGPT AI photo editing prompts`)}"></amp-img></amp-story-grid-layer>
<amp-story-grid-layer template="fill"><div class="scrim"></div></amp-story-grid-layer>
<amp-story-grid-layer template="vertical" class="copy">${i === 0 ? `<p class="brand">${esc(SITE.name)}</p>` : ''}<${i === 0 ? 'h1' : 'h2'}>${esc(s.heading)}</${i === 0 ? 'h1' : 'h2'}>${s.text ? `<p>${esc(s.text)}</p>` : ''}<p class="count">${i + 1} / ${story.slides.length}</p></amp-story-grid-layer>${i === last && outlink ? `<amp-story-page-outlink layout="nodisplay"><a href="${esc(outlink)}">${esc(story.outlinkText || 'Read more')}</a></amp-story-page-outlink>` : ''}
</amp-story-page>`).join('\n');

  const html = `<!doctype html>
<html amp lang="en"><head><meta charset="utf-8"><title>${esc(fit(story.title, ` | ${SITE.name}`))}</title>
<link rel="canonical" href="${esc(canonical)}"><meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<meta name="description" content="${esc(story.description)}">
<meta property="og:title" content="${esc(story.title)}"><meta property="og:description" content="${esc(story.description)}"><meta property="og:image" content="${esc(poster)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:site_name" content="${esc(SITE.name)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(story.title)}"><meta name="twitter:description" content="${esc(story.description)}"><meta name="twitter:image" content="${esc(poster)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<style amp-boilerplate>${BOILER}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
<style amp-custom>${CSS}</style></head>
<body><amp-story standalone title="${esc(story.title)}" publisher="${esc(SITE.name)}" publisher-logo-src="${esc(logo)}" poster-portrait-src="${esc(poster)}">
${pages}
</amp-story></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } });
}
