# TaiwanHaul

TaiwanHaul is a multilingual Taiwanese product search and discovery site for travelers from Southeast Asia (Singapore, Malaysia, Thailand, Vietnam, the Philippines). Visitors search in their own language, see suggested Chinese search terms, and find Taiwanese shops that sell the product. TaiwanHaul is not a store: no checkout, payments or logistics.

The site is a React 19 + TypeScript single-page application built with Vite 8 and Tailwind CSS v4. `bun run build` compiles it for Cloudflare Workers Static Assets; the Cloudflare Vite plugin also runs the Worker during local development. The product and price data are still mock data, clearly labeled as samples in the UI.

All prices, exchange rates, search results and recommendations are **mock data**, clearly labeled as samples in the UI.

## Docs

- [`docs/README.md`](docs/README.md) — documentation index; current rules, architecture, infrastructure, ADRs, and dated research.

## Layout

```
index.html                  React app entry page
privacy.html                static English privacy notice
src/
  Container/                app, search, and contact state and orchestration
  Presentation/             home, search, and contact UI
  Component/                 shared UI components
  Hook/                      browser integrations and UI hooks
  Lib/                       localization, mock data, pricing, analytics, and search
    search/                  in-browser search pipeline and mock adapter
    data/                    localized copy and sample content
worker/                      Cloudflare Worker for POST /api/contact
public/                      static files (robots.txt, llms.txt, favicons, assets/)
experiments/workers-go-search/ Go Search API proof of concept
tests/                       Bun test suite
dist/                         generated build output (not source-controlled)
wrangler.json                 Cloudflare Workers configuration
.github/workflows/            install with Bun, build, deploy, and test
```

## Local development

```sh
bun install
bun run dev       # Vite + local Cloudflare Worker
bun test          # tests/*.test.js
bun run typecheck # tsc --noEmit
bun run build
```

URL parameters: `?lang=en|zh-TW|th|vi|ms|fil`, `?market=SG|MY|TH|VN|PH`, `?q=pineapple%20cake`.

## Architecture notes

### Localization
- Supported locales: English, 繁體中文, ไทย, Tiếng Việt, Bahasa Melayu and Filipino. They cover each visitor market's own language; Singapore uses English/Chinese. `tl` maps to Filipino.
- Locale precedence: `?lang=` → saved choice (`localStorage`) → browser languages → `en`. Market precedence works the same way, using `?market=` and region/language hints such as `en-MY` → MY or `th` → TH.
- React components call `t()` for localized messages; localized data fields use `pick()`.
- To add a locale: add `src/Lib/data/locales/<code>.ts` and register it in `LOCALES` in `src/Lib/i18n.ts`. Add the locale to localized data fields where needed. Tests check locale message keys and localized data.
- The th/vi/ms/fil copy is a first-pass translation and should get a native-speaker review before launch.

### Search boundary

```
search(query, { locale, market })               src/Lib/search/index.ts — the UI/WebMCP search entry
  → normalizeQuery()                            src/Lib/search/normalize.ts — dictionary and passthroughs
  → mock SearchAdapter.search()                 src/Lib/search/adapters/mock.ts — public sample Products
  → NormalizedResult[]                          src/Lib/search/type.ts
```

Search runs in the browser and returns mock results. If some adapters fail, the search still returns the others' results. Search can be aborted.

### Content and pricing
`src/Lib/content.ts` reads mock homepage data (`getCheaperInTaiwan`, `getMustBuy`, `getRecommended`). Price comparisons use sample prices and FX rates.

### Country flags
Flags in the language and country selectors are emoji. Windows has no flag glyphs and renders 🇸🇬 as the letters "SG". `src/Lib/flags.ts` detects that case and registers a self-hosted, flag-only webfont (`public/assets/fonts/TwemojiCountryFlags.woff2`, about 78 KB). The font is limited by `unicode-range`, so it only draws flags and nothing else. Platforms with native flags never download it. The detection logic is adapted from [country-flag-emoji-polyfill](https://github.com/talkjs/country-flag-emoji-polyfill) (MIT). The flag artwork is [Twemoji](https://github.com/twitter/twemoji), licensed CC-BY 4.0; see `public/assets/fonts/LICENSE-TwemojiCountryFlags.md`.

### Analytics
`track(name, props)` in `src/Lib/analytics.ts` fans out to registered sinks and dispatches a `taiwanhaul:track` browser event. No vendor is wired in yet. Events carry coarse properties only, never raw search text or form content.

### Contact form
The Contact CTA opens a native `<dialog>` form. It validates on the client and POSTs JSON to `/api/contact`. The browser only knows that URL; delivery is handled by the Worker described below. The request/response contract and shared validation live in `src/Lib/contact.ts`; the form has a honeypot field and a Cloudflare Turnstile widget.

### WebMCP
When a browser exposes `navigator.modelContext` ([WebMCP](https://github.com/webmachinelearning/webmcp), experimental), `src/Hook/useWebMcp.ts` registers four tools: `search_taiwan_products`, `list_featured_products`, `set_preferences` and `open_contact_form`. The tools reuse the same functions as the UI. None submits anything on the visitor's behalf. Browsers without the API are unaffected. `public/llms.txt` describes the same capabilities in plain text.

## Deployment

`bun run deploy` builds the Vite application and deploys it with Wrangler. The CI deployment workflow runs `bun install --frozen-lockfile`, `bun run build`, then Wrangler deploy.

### GitHub Actions setup

Before the GitHub Actions deploy can work, set both secrets once:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo iskWang/taiwanhaul
gh secret set CLOUDFLARE_ACCOUNT_ID --repo iskWang/taiwanhaul
```

Run those commands without filling in values here; `gh` will prompt for each secret value.

After deployment, connect `taiwanhaul.com` in the Cloudflare dashboard: **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. Connecting the custom domain is a separate manual prerequisite outside this repository.

## Contact form backend

`POST /api/contact` is handled by a small Cloudflare Worker (`worker/`), routed with `assets.run_worker_first: ["/api/*"]` in `wrangler.json` so other requests are served as static assets.

Flow, on a request to `/api/contact`:

1. **Origin check** — only `https://taiwanhaul.com`, `https://www.taiwanhaul.com`, their plain-`http://` variants (the zone does not force HTTPS, so a visitor on `http://taiwanhaul.com` is served the page and posts with that Origin), `https://*.workers.dev` (Worker version previews) and `http://localhost`/`http://127.0.0.1` (any port, local dev) are accepted. A missing/other Origin gets `400 {"error":"server"}` — deliberately not `403`, since the client already maps `403` to the Turnstile-failure message.
2. **Request shape** — non-JSON `Content-Type` → `415`; body over 10 KB → `413`; malformed JSON → `400` with empty `fields`.
3. **Validation** — The Worker imports and re-runs the same `validateContact()` from `src/Lib/contact.ts` that the client uses, so the two can't drift. Failures return `400 {"ok":false,"error":"validation","fields":{...}}` with the same field codes the client renders.
4. **Honeypot** — if the hidden `website` field is filled, the Worker returns `200 {"ok":true}` without verifying Turnstile or sending anything.
5. **Turnstile** — `turnstileToken` is verified server-side against Cloudflare's `siteverify` endpoint using the `TURNSTILE_SECRET` Worker secret. A missing secret or a failed/unreachable verification never sends email (fails closed): verification failure → `403 {"error":"captcha"}`, a broken `siteverify` call or missing secret → `500 {"error":"server"}`.
6. **Email** — on success, the Worker hand-builds an RFC 5322 message (CRLF headers, base64 `text/plain` body, RFC 2047 encoded Subject so non-Latin names/messages survive) and sends it through the `SEND_EMAIL` `send_email` binding via `cloudflare:email`. `From` is the fixed `CONTACT_FROM` var; `To` is the `CONTACT_TO` secret; `Reply-To` is the visitor's email. Header values are checked for `CR`/`LF` before being used, to rule out header injection.

Nothing in this repository — code, config, tests or commit history — contains the maintainer's real destination email address; it only ever exists as the `CONTACT_TO` Worker secret.

### Manual Cloudflare prerequisites (one-time, outside this repo)

- **Email Routing**: enable it for `taiwanhaul.com` in the Cloudflare dashboard (Email → Email Routing) and verify the destination address that submissions should land in.
- **Turnstile**: create a Turnstile widget for `taiwanhaul.com` (and the preview hostnames under `*.workers.dev`), put its public site key in `src/Lib/config.ts` (`TURNSTILE_SITE_KEY`) and its secret in the Worker secret `TURNSTILE_SECRET`.
- **Destination secret**: Worker secret `CONTACT_TO` — the verified address from the Email Routing step above.
- **Setting the secrets**: set both secrets after the first deploy that includes `worker/`, in **Workers & Pages → taiwanhaul → Settings → Variables and Secrets** (type *Secret*), or with `bunx wrangler secret put CONTACT_TO` / `bunx wrangler secret put TURNSTILE_SECRET`. Secrets persist across later deploys. Until they exist, the endpoint fails closed and the form shows its localized "server" error.

### Local development

```sh
cp .dev.vars.example .dev.vars   # git-ignored; holds Cloudflare's documented Turnstile test keys
bun run dev
```

`.dev.vars` ships with Cloudflare's published always-pass Turnstile test secret and a placeholder `CONTACT_TO`. Under `bun run dev`, `src/Lib/config.ts` switches the client to Cloudflare's always-pass test site key (`import.meta.env.DEV`), so the widget and the Worker's verification both pass locally without any real secret. Production builds (`bun run build`, `vite preview`) use the real site key, which only works on the hostnames registered for that widget. `bun test` runs the unit tests, including `tests/worker.test.js`, with fake `fetch`/`EmailMessage` implementations — no network or Cloudflare account needed.

## Future work (not in this MVP)

- Real query translation and a Search API over the private Product Index (see `docs/architecture.md`).
- Real pricing/FX source for Local Estimates (price comparison itself is deferred; see `docs/product-spec.md`).
- Analytics sink (GA and/or a Grafana-backed collector).
- Prerendered/locale-prefixed pages (`/zh-tw/`) for performance and SEO.
- Real product imagery and a maintainer avatar in the footer.
