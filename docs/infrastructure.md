# TaiwanHaul Infrastructure

Current infrastructure stays on Cloudflare. Terraform is used for a disposable DNS exercise and the Email Routing contact rule, not as a platform cutover. Inventory is as of 2026-10-29.

## Scope and inventory

This document and Terraform under `infra/` cover TaiwanHaul resources only; see the [project scope rule](../AGENTS.md#project-scope).

| Resource | Current owner and state |
|---|---|
| `taiwanhaul.com` zone | Cloudflare Free Website plan; Dashboard |
| DNS records (6) | Workers custom domain owns apex `AAAA` (`read_only`); Email Routing owns 3 `MX`, DKIM `TXT` (`cf2024-1._domainkey`) and apex SPF `TXT`. No hand-made record exists to import. |
| Worker `taiwanhaul`, versions, static assets, bindings, vars, secrets, observability | Wrangler; React/Vite build output in `dist/`, served with SPA fallback. `test.yml` deploys it on push to `main` after Test passes. There are no PR previews (see Deployment and setup). |
| Worker `taiwanhaul-staging` | Configured in `wrangler.json` as `env.staging`; live. A push to `staging` triggers `test.yml`, which attempts the deploy to `https://taiwanhaul-staging.iskwang.workers.dev` only after Test passes; no routes or custom domain. |
| Custom domain `taiwanhaul.com` | Dashboard; not declared in Wrangler |
| `CONTACT_FROM`, `SEND_EMAIL`, `CONTACT_TO`, `TURNSTILE_SECRET` | Worker configuration/binding/secrets; Wrangler or Dashboard; secret values stay out of the repo |
| Email Routing | Enabled; `contact@taiwanhaul.com` forwards to the operator's verified inbox; catch-all disabled. Terraform owns only this contact rule. |
| Turnstile widget `taiwanhaul-contact` | Dashboard; managed mode; domains `iskwang.workers.dev` and `taiwanhaul.com`; public site key in `apps/web/src/Lib/config.ts` |
| GitHub Actions secrets | Environment secret `CF_DEPLOY_TOKEN` in `staging` and `production`: account-owned Cloudflare tokens `taiwanhaul-ci-staging` and `taiwanhaul-ci-production`, each limited to Editor on one Worker, expiring 2027-11-25. Repository secret `CLOUDFLARE_ACCOUNT_ID`. The old account-wide repository secret `CLOUDFLARE_API_TOKEN` was deleted on 2026-11-26 after `deploy-staging` and `deploy-production` each succeeded once; its Cloudflare token `Taiwanhaul github action` was revoked by the operator. The Terraform token under Token scope is a different token. |
| `iskwang.workers.dev` subdomain | Cloudflare account setting; serves the staging Worker's `workers.dev` URL |
| Search API | Wrangler (as part of the web Worker); Go/WASM bundled into `taiwanhaul` / `taiwanhaul-staging`, which read the production/staging D1 database through `DB` in `apps/web/wrangler.json`. No separate Worker, service binding or public Search API hostname. Production and staging D1 IDs are configured in `apps/web/wrangler.json`; the Admin Worker config uses the production ID. |

## Ownership

| Area | Owner |
|---|---|
| Worker, versions, assets, bindings, vars, secrets, observability | Wrangler |
| Existing DNS records | Workers custom domain / Email Routing; no DNS takeover planned |
| Email Routing contact rule | Terraform in `infra/cloudflare/`; other Email Routing settings stay outside Terraform |
| Admin mTLS hostname association and WAF ruleset | Terraform in `infra/cloudflare/admin-mtls.tf` |
| Rate limit on `/api/search` | Terraform in `infra/cloudflare/admin-mtls.tf`: 20 requests per 10 s per IP and colo, block 10 s (Free plan allows one rule). Matches the path on any hostname in the zone (not only the apex); production sets `workers_dev: false` so the `workers.dev` URL cannot bypass it. |
| Turnstile widget | Dashboard; excluded from Terraform |
| Worker custom domain | Dashboard; possible later Terraform ownership only after validating provider v5 `cloudflare_worker_custom_domain` behavior and lifecycle ([provider docs](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/worker_custom_domain)) |

Keep one owner per resource. Terraform and Wrangler must not both manage the Worker or its bindings/secrets; mixed ownership can overwrite settings, cause replacement plans, and create drift. Why Workers stay with Wrangler: [ADR 0003](adr/0003-wrangler-owns-workers.md). Before `wrangler secret put`, confirm the Worker exists with `bunx wrangler deployments list --name <worker>`; `secret put` on a missing name silently creates an empty Worker.

## Admin Worker and D1

The admin runbook is private and is not in git. It lives in `docs/admin.private.md` (gitignored); a fresh clone does not have it, so ask the repository owner for a copy. Stop any admin operation if the file is missing.

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

Issue PRs target `staging`; merging one deploys Worker `taiwanhaul-staging`. The release PR is `staging` → `main`: require CI on its current head, an independent final review of `git diff main...staging`, full smoke checks on the staging URL, and explicit operator approval before merging. Merging it deploys production after a second operator approval of the `production` deployment. Follow the [release-check skill](../.agents/skills/taiwanhaul-release-check/SKILL.md) for the evidence required at each gate.

`.github/workflows/test.yml` runs the `test` job on every PR (including base changes) and every push to `staging` or `main`. On a push or manual run on `staging`, job `deploy-staging` runs only after `test` passes on the same commit; on `main`, job `deploy-production` does the same. PRs never deploy. Each deploy job installs with `bun install --frozen-lockfile`, runs `bun run build`, deploys from `apps/web` with Wrangler, then runs `scripts/smoke.sh` against the deployed URL. Staging uses `CLOUDFLARE_ENV=staging` **at build time** and `wrangler deploy --env staging`; the Vite plugin flattens the chosen environment into its build output, so the deploy flag alone is insufficient. Production uses the default build and `wrangler deploy`.

Each deploy job uses a GitHub Environment: `staging` accepts only branch `staging`; `production` accepts only branch `main` and waits for approval by `iskWang` (administrators cannot bypass it). Each environment holds its own `CF_DEPLOY_TOKEN`, so the staging token cannot change production. Each environment has its own concurrency group, with no cancellation of an in-progress deployment. The smoke script checks content (not only status) of `/`, `/privacy`, `/robots.txt`, `/llms.txt`, the flag font, `/api/search`, and a validation-only `POST /api/contact`; it sends no mail and does not prove which version is served or that D1 is bound correctly.

To undo a bad deploy, run the **Rollback** workflow (`.github/workflows/rollback.yml`) from the Actions tab: choose `target`, give a `reason`, and optionally a Worker `version_id` (empty means the version deployed before the current one; list deployments with `wrangler deployments list`, adding `--env staging` for staging). Run it from branch `staging` for staging or `main` for production; production waits for the same `iskWang` approval. It runs `wrangler rollback` with the environment's `CF_DEPLOY_TOKEN`, shares the deploy job's concurrency group, then runs `scripts/smoke.sh`. It does not build or run tests, and it does not roll back D1 data or migrations. The next push to that branch deploys its head again, so also revert the bad commit.

There are no PR previews. `preview.yml` ran [Cloudflare Previews](https://developers.cloudflare.com/workers/previews/) on Worker `taiwanhaul-staging`; it was disabled 2026-11-13, restored 2026-11-22 (`25a4b64`, #43), and removed 2026-11-25 (`fd97cde`, #48). It ran the PR's own `bun install` and `bun run build` with `CLOUDFLARE_API_TOKEN` available, before human review, and its D1 binding came from the PR-editable `apps/web/wrangler.json`. Do not restore it unless the PR build runs without secrets, a separate approved job deploys the reviewed artifact using only trusted tools (never the PR's scripts or dependencies) with bindings taken from the base branch, and the token lives in a branch-restricted GitHub Environment that cannot modify production. Production keeps `workers_dev` off so the zone rate limit on `/api/search` cannot be bypassed through a `workers.dev` URL.

`bun run deploy` builds and deploys production directly; it is not the normal release path and requires separate explicit approval.

To create or rotate a deploy token: in the Cloudflare dashboard go to **Manage Account → Account API Tokens**, create a token with one policy (**Specified Workers**, the single Worker, role **Editor**), no start date, and an expiry. Then set it from your own terminal so the value never enters a chat or log:

```sh
gh secret set CF_DEPLOY_TOKEN --env staging --repo iskWang/taiwanhaul      # Worker taiwanhaul-staging
gh secret set CF_DEPLOY_TOKEN --env production --repo iskWang/taiwanhaul   # Worker taiwanhaul
```

Run each command without a value so `gh` prompts securely. Wrangler needs more permission only to create a new Worker or change routes; neither happens in CI.

After the first deployment, connect `taiwanhaul.com` in **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. This is a manual prerequisite outside the repository.

Before contact email works, enable Email Routing for `taiwanhaul.com` and verify the destination inbox. Create a Turnstile widget for `taiwanhaul.com` and the staging host `taiwanhaul-staging.iskwang.workers.dev` (no wildcard); put its public site key in `apps/web/src/Lib/config.ts` as `TURNSTILE_SITE_KEY`. After the first Worker deploy, set `CONTACT_TO` to the verified destination and `TURNSTILE_SECRET` as Worker secrets in the Cloudflare dashboard or from `apps/web` with `bunx wrangler secret put CONTACT_TO` and `bunx wrangler secret put TURNSTILE_SECRET`. Secrets persist across deploys. Until set, the endpoint fails closed; the form shows its localized server error.

### One-time staging setup

The bootstrap flow PR alone targets `main`. After its review, approved merge, and successful production workflow, the **operator** performs these steps; documenting them does not authorize an agent to run them.

1. Create the remote `staging` branch from the merged `main`:

   ```sh
   git fetch origin main
   git push origin refs/remotes/origin/main:refs/heads/staging
   ```

   This triggers the first staging deploy. Wait for it to finish successfully and record its SHA and workers.dev URL. This creates `taiwanhaul-staging`, the persistent test Worker; do not retarget issue PRs before it exists. Do not add a custom domain or route to the staging Worker.

2. Set staging secrets interactively from the repository root:

   ```sh
   cd apps/web
   bunx wrangler secret put CONTACT_TO --env staging
   bunx wrangler secret put TURNSTILE_SECRET --env staging
   ```

   `CONTACT_TO` is the operator's verified inbox, not a customer address; staging keeps the `SEND_EMAIL` binding and `CONTACT_FROM`. Use the secret matching the public Turnstile site key compiled into the app. In the widget's hostname settings, ensure `taiwanhaul-staging.iskwang.workers.dev` is allowed (directly or by a configured parent hostname); a production-only hostname does not cover staging. Do not enter a wildcard hostname. Secrets are separate per Worker, persist across deploys, and stay out of Git. Until configured, contact delivery fails closed. Real email smoke tests still need explicit approval.

3. `main` and `staging` are protected by the repository Ruleset `protect-main-staging` (id 27693249), not classic branch protection. It requires a PR with 1 approval (stale approvals dismissed on push), the `test` status check with strict mode off (the branch need not be up to date), and forbids force pushes and deletion. A PR author cannot approve their own PR, so an agent-authored PR needs another account's approval. Inspect it with:

   ```sh
   gh api repos/iskWang/taiwanhaul/rulesets/27693249
   ```

   On 2026-11-25 the non-admin `iskwang-agent` token got `null` for `bypass_actors`; check them with an admin token. The Ruleset does not require a release PR's head to be `staging`; the operator confirms that before merging into `main`.

   Two more Rulesets, both with no bypass actors (so they bind administrators too), were added on 2026-11-26 after release PR #53 was squash-merged and `staging` was then deleted (it was recreated from `main` at `395038c`):
   - `protect-branches-no-bypass` (id 28134953): `main` and `staging` cannot be deleted or force-pushed.
   - `main-release-only` (id 28134985): PRs into `main` may only use a merge commit, so `staging` and `main` keep a shared history. Issue PRs into `staging` may still squash.

   Rulesets aggregate and the most restrictive version of each rule applies. To delete or force-push a protected branch deliberately, an admin must first disable `protect-branches-no-bypass`.

All subsequent issue PRs target `staging`; only reviewed release PRs target `main`. Staging uses its own D1 database `taiwanhaul-staging` (`env.staging.d1_databases` in `apps/web/wrangler.json`); never point staging at the production database ID.

### Debugging the contact form

When the form shows its generic server error, read the Worker logs while the operator submits the form once (Turnstile needs a real browser, so an agent cannot submit it):

```sh
cd apps/web
bunx wrangler tail --env staging --format pretty   # omit --env staging for production
```

If the tail drops with `Unexpected server response: 500`, restart it and submit again; submissions during the gap are not shown. Map the logged line to its cause:

| Log line | Cause | Fix |
| --- | --- | --- |
| `TURNSTILE_SECRET is not configured` / `CONTACT_TO is not configured` | Secret missing on this Worker | `bunx wrangler secret put <NAME>` (add `--env staging`) |
| `turnstile siteverify request failed Error: turnstile siteverify HTTP 400` | Secret rejected (`invalid-input-secret`), e.g. the public site key was pasted instead of the secret key | Copy **Secret key** from the `taiwanhaul-contact` widget; never Rotate it |
| `send_email binding failed to send` | `CONTACT_TO` is not exactly a **Verified** Email Routing destination address | Re-set `CONTACT_TO` to the verified address |
| Request logged with no error | Accepted and handed to Email Routing | Confirm receipt in the inbox |

`wrangler secret put` deploys a new version itself; no redeploy is needed. Secrets survive later deploys. To check which secrets exist without reading values: `bunx wrangler secret list --env staging`.

A `turnstile siteverify HTTP 400` can be reproduced without the Worker: `curl -s -X POST https://challenges.cloudflare.com/turnstile/v0/siteverify -d 'secret=bogus&response=x'` returns `invalid-input-secret`.

### Local development

For local development:

```sh
cp apps/web/.dev.vars.example apps/web/.dev.vars
bun run dev
```

`.dev.vars` is git-ignored and contains Cloudflare's published always-pass Turnstile test secret plus a placeholder `CONTACT_TO`. In development, `apps/web/src/Lib/config.ts` selects the published always-pass test site key through `import.meta.env.DEV`, so local widget and Worker verification pass without a real secret. Production builds use the real site key, which works only on hostnames registered for the widget. `bun run test` uses fake `fetch` and `EmailMessage` implementations; it needs no network or Cloudflare account.
