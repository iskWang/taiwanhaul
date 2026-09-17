# TaiwanHaul

TaiwanHaul is a disposable, low-risk v1 landing page, so it uses plain static HTML and CSS with zero build tooling. This is the smallest implementation that fits the current constraints while keeping the site easy to deploy and replace.

## Layout

- `public/` — deployed site root and all user-facing static files.
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
