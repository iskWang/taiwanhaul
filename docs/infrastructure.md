# TaiwanHaul Infrastructure

Current infrastructure stays on Cloudflare. Terraform is used for a disposable DNS exercise and the Email Routing contact rule, not as a platform cutover. Inventory is as of 2026-10-29.

## Scope and inventory

This document and Terraform under `infra/` cover TaiwanHaul resources only; see the [project scope rule](../AGENTS.md#project-scope).

| Resource | Current owner and state |
|---|---|
| `taiwanhaul.com` zone | Cloudflare Free Website plan; Dashboard |
| DNS records (6) | Workers custom domain owns apex `AAAA` (`read_only`); Email Routing owns 3 `MX`, DKIM `TXT` (`cf2024-1._domainkey`) and apex SPF `TXT`. No hand-made record exists to import. |
| Worker `taiwanhaul`, versions, static assets, bindings, vars, secrets, observability | Wrangler; React/Vite build output in `dist/`, served with SPA fallback. Deploy workflow builds on push to `main`; preview workflow uploads a Worker version without routing production traffic. |
| Custom domain `taiwanhaul.com` | Dashboard; not declared in Wrangler |
| `CONTACT_FROM`, `SEND_EMAIL`, `CONTACT_TO`, `TURNSTILE_SECRET` | Worker configuration/binding/secrets; Wrangler or Dashboard; secret values stay out of the repo |
| Email Routing | Enabled; `contact@taiwanhaul.com` forwards to the operator's verified inbox; catch-all disabled. Terraform owns only this contact rule. |
| Turnstile widget `taiwanhaul-contact` | Dashboard; managed mode; domains `iskwang.workers.dev` and `taiwanhaul.com`; public site key in `apps/web/src/Lib/config.ts` |
| GitHub Actions secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; scope is unknown |
| `iskwang.workers.dev` preview subdomain | Cloudflare account setting; Wrangler preview versions |
| Go PoC D1 | Local-only config in `apps/search-api`; not deployed |

## Ownership

| Area | Owner |
|---|---|
| Worker, versions, assets, bindings, vars, secrets, observability | Wrangler |
| Existing DNS records | Workers custom domain / Email Routing; no DNS takeover planned |
| Email Routing contact rule | Terraform in `infra/cloudflare/`; other Email Routing settings stay outside Terraform |
| Turnstile widget | Dashboard; excluded from Terraform |
| Worker custom domain | Dashboard; possible later Terraform ownership only after validating provider v5 `cloudflare_worker_custom_domain` behavior and lifecycle ([provider docs](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/worker_custom_domain)) |

Keep one owner per resource. Terraform and Wrangler must not both manage the Worker or its bindings/secrets; mixed ownership can overwrite settings, cause replacement plans, and create drift.

## Sandbox

`infra/sandbox/` defines `_tf-sandbox.taiwanhaul.com`, TXT value `taiwanhaul terraform sandbox`. The experiment completed and was destroyed on 2026-10-29. DNS Edit alone supports v5 `cloudflare_dns_record` operations with a known zone ID; Zone Read was unnecessary. Cost remains **Requires validation** against the account plan and billing page.

Re-run only by explicit request, following the [Terraform skill's disposable TXT sandbox procedure](../.agents/skills/taiwanhaul-terraform/SKILL.md#disposable-txt-sandbox--only-on-explicit-request). An unused TXT name does not route traffic; token scope is the main risk. Terraform is the chosen learning tool; do not maintain a second OpenTofu workflow.

## State and secrets

Sandbox state and `infra/cloudflare/` contact-rule state are local. `*.tfstate*` and `.terraform/` are git-ignored; never commit state or plan files. State and saved plans can contain sensitive values in plaintext; `sensitive = true` hides ordinary CLI display only. The contact module stores the private forwarding inbox in local state and plans. Its local state and backup have mode `600`.

Keep Worker secrets `CONTACT_TO` and `TURNSTILE_SECRET` in `wrangler secret put` from `apps/web` or the Dashboard. The forwarding inbox is the sole Terraform variable exception: supply it as `TF_VAR_contact_destination`. Never put API tokens or `TURNSTILE_SECRET` in Terraform config, `.tfvars`, state, or plans.

Future remote state could use R2's S3-compatible endpoint or HCP Terraform Free. R2 backend locking and compatibility are **Requires validation**; S3 backend locking documentation does not establish R2 behavior ([Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3), [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/)).

## Token scope

Store the TaiwanHaul token and `TF_VAR_*` values in `~/.config/taiwanhaul/terraform.env`, outside the repo. The token has Zone → DNS → Edit and Zone → Email Routing Rules → Edit scoped to `taiwanhaul.com`; its Turnstile permission is unused. An empty Workers listing does not establish whether Workers access is denied. Use a short TTL and optionally an IP filter. Never use the Global API Key or Wrangler OAuth token. Export `CLOUDFLARE_API_TOKEN` only inside the [Terraform skill's subshell](../.agents/skills/taiwanhaul-terraform/SKILL.md#contact-only-drift-check), not the Wrangler shell.

DNS Edit can change or delete every record in the zone, including web and mail records; it cannot be narrowed to one record. Revoke the token after the experiment and inspect every plan before applying. A future start date (`not_before`) can cause `401 Authentication error` even when token verification reports `active`; leave the start date empty. Wrangler also uses an exported `CLOUDFLARE_API_TOKEN` instead of its own login.

## Import and drift

Use Terraform `import` blocks for reviewed, repeatable imports; `terraform import` is a direct one-off. Both need matching resource configuration and a careful plan. The Cloudflare provider is v5.28.1; use `cloudflare_dns_record`, not legacy `cloudflare_record` ([DNS resource](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/dns_record)).

The contact rule is imported in `infra/cloudflare/`; only that rule is in Terraform state. Actual mail delivery was not tested. The one-time import configuration and obsolete saved plans were removed. Turnstile remains Dashboard-managed. cf-terraforming support for provider v5 is **Requires validation** ([project docs](https://github.com/cloudflare/cf-terraforming)).

For a manual check, follow the [Terraform skill's contact-only drift check](../.agents/skills/taiwanhaul-terraform/SKILL.md#contact-only-drift-check). Optional later: scheduled CI plan-only drift checks with a read/plan-scoped token and no apply.

## Migration away from Cloudflare

Terraform can standardize inventory and plan/apply workflow, but resources remain provider-specific. Effort estimates are relative for this small app.

| Component | Migration work | Effort |
|---|---|---:|
| Worker runtime (`fetch`, `env.ASSETS`, `cloudflare:email`, `run_worker_first`) | Port handler, assets, email adapter, and route ordering | L |
| Static assets and SPA fallback | Move hosting and reproduce fallback and API routing | M |
| Turnstile | Replace widget and verification endpoint; update site key and secret | M |
| Email Routing / Email Sending | Replace forwarding and email delivery provider | M |
| D1, if adopted | Export data and adapt schema, SQL, and runtime binding | L |
| DNS | Move records and nameservers while preserving web and mail records | M |
| Vite Cloudflare plugin | Replace platform development/build integration | M |
| CI workflows | Replace Wrangler deploy/version upload and Cloudflare credentials | M |

Keep Cloudflare-specific calls (asset binding, `cloudflare:email`, Turnstile verification, runtime bindings) isolated in a few Worker modules; keep request and business behavior independent where practical.

## Phases

0. Sandbox TXT in `infra/sandbox/`. **Done 2026-10-29.** Cost check remains open.
1. Import existing DNS only after a read-only plan and operator confirmation. **Inventory found no hand-made DNS record to import.** Five records are `read_only`; the sixth is Email Routing's SPF. Revisit if a hand-made record is added. DNS Read is enough until an apply is planned.
2. Import only `contact@taiwanhaul.com` into `infra/cloudflare/`. **Done 2026-10-29; subsequent plan had no changes.** Keep inbox value in private local state; leave Worker, secrets, and Turnstile with their existing owners.
3. Optional remote state and CI plan-only check, after validating backend locking/security and least-privilege access; CI must not apply.

## Deployment and setup

`bun run deploy` builds the Vite application and deploys it with Wrangler. The GitHub Actions deployment uses `bun install --frozen-lockfile`, `bun run build`, then Wrangler deploy; previews upload a Worker version without routing production traffic.

Set the GitHub repository secrets once:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo iskWang/taiwanhaul
gh secret set CLOUDFLARE_ACCOUNT_ID --repo iskWang/taiwanhaul
```

Run each command without a value so `gh` prompts securely.

After the first deployment, connect `taiwanhaul.com` in **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. This is a manual prerequisite outside the repository.

Before contact email works, enable Email Routing for `taiwanhaul.com` and verify the destination inbox. Create a Turnstile widget for `taiwanhaul.com` and preview hosts under `*.workers.dev`; put its public site key in `apps/web/src/Lib/config.ts` as `TURNSTILE_SITE_KEY`. After the first Worker deploy, set `CONTACT_TO` to the verified destination and `TURNSTILE_SECRET` as Worker secrets in the Cloudflare dashboard or from `apps/web` with `bunx wrangler secret put CONTACT_TO` and `bunx wrangler secret put TURNSTILE_SECRET`. Secrets persist across deploys. Until set, the endpoint fails closed; the form shows its localized server error.

For local development:

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars
bun run dev
```

`.dev.vars` is git-ignored and contains Cloudflare's published always-pass Turnstile test secret plus a placeholder `CONTACT_TO`. In development, `apps/web/src/Lib/config.ts` selects the published always-pass test site key through `import.meta.env.DEV`, so local widget and Worker verification pass without a real secret. Production builds use the real site key, which works only on hostnames registered for the widget. `bun run test` uses fake `fetch` and `EmailMessage` implementations; it needs no network or Cloudflare account.
