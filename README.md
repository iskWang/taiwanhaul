# TaiwanHaul

TaiwanHaul is a disposable, low-risk v1 landing page, so it uses plain static HTML with zero build tooling. Styling is Tailwind CSS via the Play CDN (`<script src="https://cdn.tailwindcss.com">`) — no PostCSS/build step, at the cost of shipping the JIT compiler to the browser instead of a precompiled stylesheet (a deliberate, explicit tradeoff for this disposable v1; revisit if/when this page grows beyond "coming soon").

## Layout

- `public/` — deployed site root and all user-facing static files (`index.html`, favicons, `assets/` images).
- `brand-assets/` — original, unoptimized brand source files (icon, wordmark) kept for future reference; not deployed (outside `public/`).
- `wrangler.json` — Cloudflare Workers static-assets configuration.
- `.github/workflows/` — production deploy and pull-request preview workflows.

## Local development and deployment

These commands require Wrangler installed globally, or available through `bunx wrangler` (matching the reference project's convention):

```sh
wrangler dev
wrangler deploy
```

## GitHub Actions setup

Before the GitHub Actions deploy can work, set both secrets once:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo iskWang/taiwanhaul
gh secret set CLOUDFLARE_ACCOUNT_ID --repo iskWang/taiwanhaul
```

Run those commands without filling in values here; `gh` will prompt for each secret value.

After deployment, connect `taiwanhaul.com` in the Cloudflare dashboard: **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. Connecting the custom domain is a separate manual prerequisite outside this repository.
