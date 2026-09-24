# TaiwanHaul

TaiwanHaul helps travelers (initially from Southeast Asia) discover what's worth buying in Taiwan: things cheaper than back home, classic must-buys, and picks recommended by Taiwanese locals. Visitors search in their own language and the site maps queries to Chinese shopping terms.

The site is still **plain static files with zero build tooling**: HTML, native ES modules (`<script type="module">`) and Tailwind CSS via the Play CDN. There is no bundler, framework or `node_modules`. The Play CDN ships the JIT compiler to the browser instead of a precompiled stylesheet. That was a deliberate v1 tradeoff; revisit it when performance or SEO matters (see *Future work*).

All prices, exchange rates, search results and recommendations are **mock data**, clearly labeled as samples in the UI.

## Layout

```
public/                     deployed site root (Cloudflare Workers static assets)
  index.html                page shell: six sections + contact <dialog>; English copy doubles as no-JS/SEO fallback
  llms.txt                  plain-text site/tool description for AI agents
  data/                     structured mock content, swappable for API responses
    locales/*.js            UI copy: en, zh-TW, th, vi, ms, fil (keys kept in sync by tests)
    markets.js              visitor markets (SG, MY, TH, VN, PH) + Taiwan: currency, flag, localized name
    products.js             product catalog (each product defined once; localized fields; TWD + per-market prices)
    sections.js             homepage curation (references product ids)
    fx.js                   mock exchange rates
    search-terms.js         mock generic-word dictionary for the query normalizer
  js/
    app.js                  entry point: preferences, rendering, event wiring, WebMCP registration
    config.js               public, non-secret config (Turnstile site key)
    i18n.js                 locale resolution, translate(), pick(), data-i18n application
    market.js               market resolution (URL → storage → browser language → default)
    content.js              homepage content source (mock today, API later)
    pricing.js, format.js   price comparison math, Intl money formatting
    analytics.js            vendor-neutral track() + pluggable sinks
    contact.js              contact form validation + POST client
    webmcp.js               WebMCP tool definitions (progressive enhancement)
    search/                 search pipeline (see below)
    ui/                     templates, search results view, contact dialog
worker/                     Cloudflare Worker for POST /api/contact (email delivery + Turnstile)
tests/                      node:test unit tests (no dependencies)
brand-assets/               original brand source files; not deployed
wrangler.json               Cloudflare Workers configuration (static assets + the contact Worker)
.github/workflows/          deploy, PR preview, and test workflows
```

## Local development

```sh
npx wrangler dev      # or: npm run dev (needs Wrangler installed / bunx wrangler)
npm test              # node --test, Node 22+, no install needed
```

Any static file server pointed at `public/` also works. Useful URL parameters: `?lang=en|zh-TW|th|vi|ms|fil`, `?market=SG|MY|TH|VN|PH`, `?q=pineapple%20cake`.

## Architecture notes

### Localization
- Supported locales: English, 繁體中文, ไทย, Tiếng Việt, Bahasa Melayu and Filipino. They cover each visitor market's own language; Singapore uses English/Chinese. `tl` maps to Filipino.
- Locale precedence: `?lang=` → saved choice (`localStorage`) → browser languages → `en`. Market precedence works the same way, using `?market=` and region/language hints such as `en-MY` → MY or `th` → TH.
- Static markup uses `data-i18n="key"` / `data-i18n-attr="attr:key"`. Data fields are `{ en, 'zh-TW' }` objects read with `pick()`, falling back to English.
- To add a locale: add `data/locales/<code>.js`, register it in `LOCALES` in `js/i18n.js`, and add that key to localized data fields (products, recommendations, market names). Tests fail if any locale file's keys diverge, a localized data field is missing a locale, or a suggestion chip returns no results.
- The th/vi/ms/fil copy is a first-pass translation and should get a native-speaker review before launch.

### Search boundary

```
search(query, { locale, market })               js/search/index.js — the only function UI/WebMCP call
  → QueryNormalizer.normalize()                 js/search/normalize.js — mock dictionary today; LLM/translation later
  → SearchAdapter[].search()  (parallel)        js/search/adapters/mock.js — Taiwan shop/marketplace APIs later
  → NormalizedResult[]  (merged, deduped, sorted)
```

Contracts are documented as JSDoc typedefs in `js/search/types.js`. If some adapters fail, the search still returns the others' results. It errors only when every source fails, and searches can be aborted. To go live, replace the normalizer and/or adapters in `createSearchService()`, or move the same pipeline into a Worker endpoint and make `searchService` a thin `fetch` client. UI code does not change either way.

### Content and pricing
`js/content.js` is the only module that reads mock homepage data. `getHomeContent({ market })` is async and returns the shapes an API would return. Price comparisons are computed from `twPrice`, `marketPrices[market]` and FX rates, so adding a market is a data change.

### Analytics
`track(name, props)` in `js/analytics.js` fans out to registered sinks and dispatches a `taiwanhaul:track` DOM event. No vendor is wired in yet. Events carry coarse properties only (query length, counts, codes), never raw search text or form content.

### Contact form
The Contact CTA opens a native `<dialog>` form. It validates on the client and POSTs JSON to `/api/contact`. The browser only ever knows that URL; delivery is handled by the Worker described below. The request/response contract is documented in `js/contact.js`, and the form has a honeypot field and a Cloudflare Turnstile widget mounted at `[data-turnstile-slot]`.

### WebMCP
When a browser exposes `navigator.modelContext` ([WebMCP](https://github.com/webmachinelearning/webmcp), experimental), `js/webmcp.js` registers four tools: `search_taiwan_products`, `list_featured_products`, `set_preferences` and `open_contact_form`. The tools reuse the same functions as the UI. None of them submits anything on the visitor's behalf. Browsers without the API are unaffected. `public/llms.txt` describes the same capabilities in plain text.

## Deployment

Cloudflare Workers static assets, unchanged from v1:

```sh
wrangler dev
wrangler deploy
```

### GitHub Actions setup

Before the GitHub Actions deploy can work, set both secrets once:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo iskWang/taiwanhaul
gh secret set CLOUDFLARE_ACCOUNT_ID --repo iskWang/taiwanhaul
```

Run those commands without filling in values here; `gh` will prompt for each secret value.

After deployment, connect `taiwanhaul.com` in the Cloudflare dashboard: **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. Connecting the custom domain is a separate manual prerequisite outside this repository.

## Contact form backend

`POST /api/contact` is handled by a small Cloudflare Worker (`worker/`), routed with `assets.run_worker_first: ["/api/*"]` in `wrangler.json` so every other request keeps being served as a static asset, unchanged.

Flow, on a request to `/api/contact`:

1. **Origin check** — only `https://taiwanhaul.com`, `https://www.taiwanhaul.com`, `https://*.workers.dev` (Worker version previews) and `http://localhost`/`http://127.0.0.1` (any port, local dev) are accepted. A missing/other Origin gets `400 {"error":"server"}` — deliberately not `403`, since the client already maps `403` to the Turnstile-failure message.
2. **Request shape** — non-JSON `Content-Type` → `415`; body over 10 KB → `413`; malformed JSON → `400` with empty `fields`.
3. **Validation** — the Worker imports and re-runs the *same* `validateContact()` from `public/js/contact.js` that the client uses, so the two can't drift. Failures return `400 {"ok":false,"error":"validation","fields":{...}}` with the same field codes the client renders.
4. **Honeypot** — if the hidden `website` field is filled, the Worker returns `200 {"ok":true}` without verifying Turnstile or sending anything.
5. **Turnstile** — `turnstileToken` is verified server-side against Cloudflare's `siteverify` endpoint using the `TURNSTILE_SECRET` Worker secret. A missing secret or a failed/unreachable verification never sends email (fails closed): verification failure → `403 {"error":"captcha"}`, a broken `siteverify` call or missing secret → `500 {"error":"server"}`.
6. **Email** — on success, the Worker hand-builds an RFC 5322 message (CRLF headers, base64 `text/plain` body, RFC 2047 encoded Subject so non-Latin names/messages survive) and sends it through the `SEND_EMAIL` `send_email` binding via `cloudflare:email`. `From` is the fixed `CONTACT_FROM` var; `To` is the `CONTACT_TO` secret; `Reply-To` is the visitor's email. Header values are checked for `CR`/`LF` before being used, to rule out header injection.

Nothing in this repository — code, config, tests or commit history — contains the maintainer's real destination email address; it only ever exists as the `CONTACT_TO` Worker secret.

### Manual Cloudflare prerequisites (one-time, outside this repo)

- **Email Routing**: enable it for `taiwanhaul.com` in the Cloudflare dashboard (Email → Email Routing) and verify the destination address that submissions should land in.
- **Turnstile**: create a Turnstile widget for `taiwanhaul.com` (and the preview hostnames under `*.workers.dev`), then set its site key in `public/js/config.js` (`TURNSTILE_SITE_KEY`, replacing the TODO placeholder) and its secret with `wrangler secret put TURNSTILE_SECRET`.
- **Destination secret**: `wrangler secret put CONTACT_TO` — the verified address from the Email Routing step above.

### Local development

```sh
cp .dev.vars.example .dev.vars   # git-ignored; holds Cloudflare's documented Turnstile test keys
wrangler dev
```

`.dev.vars` ships with Cloudflare's published always-pass Turnstile test secret and a placeholder `CONTACT_TO`, so the flow works end-to-end locally without touching any real secret or inbox. `npm test` runs the Worker's unit tests (`tests/worker.test.js`) with fake `fetch`/`EmailMessage` implementations — no network or Cloudflare account needed.

## Future work (not in this MVP)

- Real query translation (LLM, OpenRouter-compatible) and Taiwan shop adapters behind the search boundary.
- Real pricing/FX source for the price comparison.
- Analytics sink (GA and/or a Grafana-backed collector).
- Precompiled Tailwind + prerendered/locale-prefixed pages (`/zh-tw/`) for performance and SEO.
- Real product imagery and a maintainer avatar in the footer.
