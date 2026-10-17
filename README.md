# promptbin (Astro + Cloudflare Workers + D1)

Website: **promptbin** · Domain: **promptbin.in** · Contact: promptbin@gmail.com
Platform manager: Kamlesh Mohabe (set in `src/data/site.js`).

SEO-first site for "ChatGPT AI photo editing prompts" with an admin console for posting **prompts** and **web stories**.

- Blog, FAQ, tool, About and legal pages are prerendered static HTML.
- The home grid, **/web-stories/**, **/admin/**, **/api/** and **/sitemap.xml** run on a Cloudflare Worker and read the **Cloudflare D1 database** (`promptbin-db`).
- D1 stores prompts, web stories, uploaded images (resized to WebP in the browser) and login-attempt counters.

## First-time Cloudflare setup
```
npm install
npx wrangler login
npx wrangler d1 create promptbin-db            # copy the printed database_id into wrangler.jsonc
npx wrangler d1 migrations apply promptbin-db --remote   # creates tables + 3 starter web stories
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run build && npx wrangler deploy
```
Then add `promptbin.in` under Workers & Pages > promptbin > Settings > Domains & Routes.

## Run locally
```
npm install
cp .dev.vars.example .dev.vars                 # set ADMIN_PASSWORD
npx wrangler d1 migrations apply promptbin-db --local
npm run dev                                    # http://localhost:4321  (admin: /admin/)
```

## Admin console (`/admin/`)
- **Prompts:** title, categories, prompt text, photo (cropped 4:5, WebP), publish toggle, edit, delete.
- **Web Stories** (`/admin/stories/`): title, description, 3:4 cover, 4 to 20 slides (9:16 image, headline, text), optional last-slide button, publish toggle, reorder, edit, delete. Published stories appear at `/web-stories/<slug>/` as AMP Web Stories and in `sitemap.xml`.
- Login: `ADMIN_PASSWORD`, 7-day HttpOnly cookie, 6 wrong attempts per IP locks login for 15 minutes. Admin pages are `noindex`.

## Language and light/dark mode
- The header has a language menu (English, Hindi, Marathi, Bengali, Tamil, Spanish, French, German, Portuguese, Russian, Arabic, Turkish, Indonesian, Japanese, Chinese). It uses Google Website Translator and loads Google's script only after a non-English language is chosen. Prompt text and the brand name are marked `translate="no"`. To change the list, edit `src/components/Header.astro` and `LANGS` in `src/scripts/prefs.js`.
- The sun/moon button switches light and dark mode. The choice is saved in the browser; the first visit follows the device setting. Colours are CSS variables in `src/styles/global.css` (`:root[data-theme=dark]`).

## Security
Built in:
- **CSP:** Astro writes a Content-Security-Policy with a hash for every script and style (`security.csp` in `astro.config.mjs`). Google Translate and Formspree are the only outside sources allowed. If you add a new third-party script, add its domain there.
- **Headers:** HSTS, `X-Frame-Options: DENY` (stories can be embedded), `nosniff`, Referrer-Policy, Permissions-Policy and COOP are set by `src/middleware.js` (Worker responses) and `public/_headers` (static files). Admin pages and all `/api/` responses are `no-store` and `noindex`.
- **Admin:** password of at least 12 characters (shorter disables the console), constant-time check, HMAC-signed HttpOnly SameSite=Strict cookie (`__Host-` prefix over HTTPS), same-origin check on every POST, 6 wrong attempts per IP locks login for 15 minutes (stored in D1), 12 MB request cap.
- **Data:** every D1 query is parameterised; uploads are checked by file signature (WebP/JPEG only), size-limited and served with a locked-down CSP; JSON-LD and story pages escape user text.
- `/.well-known/security.txt` lists promptbin@gmail.com for vulnerability reports (renew its `Expires` date yearly).

Do these in Cloudflare (not possible from code):
1. Turn on 2-step login for your Cloudflare account and the Gmail account.
2. SSL/TLS: Full (strict), Always Use HTTPS, Automatic HTTPS Rewrites.
3. Security > WAF: enable the managed rules, and add a rate-limiting rule for `/api/admin/login/` (for example 10 requests per minute per IP).
4. Best protection for `/admin/*`: put it behind Cloudflare Access (free, up to 50 users) so only your email can even reach the login page.
5. Use `wrangler secret put` for `ADMIN_PASSWORD` and `SESSION_SECRET` (long random values); never commit `.dev.vars`.
6. Run `npm audit` and `npm update` regularly; test with `npm run build` before deploying.

## Logo and favicon
Files live in `public/`: `favicon.svg`, `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `logo.png`, `site.webmanifest`, `og-default.png`. Replace any of them with your own files using the same names. The 512 px PNG is also the Web Story publisher logo.

## SEO
- Keyword check: start the site, then `npm run seo:keywords -- http://localhost:4321`.
- Submit `https://promptbin.in/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Validate a story at https://validator.ampproject.org/ after publishing.
- Contact form: set `formAction` in `src/data/site.js` to your Formspree URL. Email links already use `SITE.email`.

## Editing content
Blog: `src/content/blog/*.md` · FAQ: `src/data/faq.js` · Site name, email, manager, nav: `src/data/site.js`.
