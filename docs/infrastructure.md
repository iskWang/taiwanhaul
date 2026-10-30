# TaiwanHaul Infrastructure

Current infrastructure stays on Cloudflare. Terraform is used for a disposable DNS exercise and the Email Routing contact rule, not as a platform cutover. Inventory is as of 2026-10-29.

## Scope and inventory

This document and Terraform under `infra/` cover TaiwanHaul resources only; see the [project scope rule](../AGENTS.md#project-scope).

| Resource | Current owner and state |
|---|---|
| `taiwanhaul.com` zone | Cloudflare Free Website plan; Dashboard |
| DNS records (6) | Workers custom domain owns apex `AAAA` (`read_only`); Email Routing owns 3 `MX`, DKIM `TXT` (`cf2024-1._domainkey`) and apex SPF `TXT`. No hand-made record exists to import. |
| Worker `taiwanhaul`, versions, static assets, bindings, vars, secrets, observability | Wrangler; React/Vite build output in `dist/`, served with SPA fallback. Deploy workflow builds on push to `main`; preview workflow uploads a Worker version without routing production traffic. |
| Worker `taiwanhaul-staging` | Configured in `wrangler.json` as `env.staging`; provisioned only when the operator activates staging. Push to `staging` deploys to `https://taiwanhaul-staging.iskwang.workers.dev`, with no routes or custom domain. |
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

## Admin Worker and D1

A D1 API token can only be scoped to the whole Cloudflare account (operator check, 2026-10-30). Admin writes therefore go through `taiwanhaul-admin` over mTLS instead of using a D1 token. The web Worker has no D1 binding. Search reads arrive with #15.

### Security and ownership

- Keep `workers_dev: false` and `preview_urls: false` in both Worker environments: a `workers.dev` URL would bypass the zone mTLS/WAF path.
- The WAF blocks requests without a verified client certificate. The Worker also checks `ADMIN_CERT_FINGERPRINTS`; an empty or missing allowlist denies every request.
- The private key stays on the operator's Mac at `~/.config/taiwanhaul/admin/admin.key`, with mode `600`. It is never committed or sent to Cloudflare.

| Resource | Owner |
|---|---|
| Production and staging D1 databases | Operator, created once each with `wrangler d1 create`; not Terraform because the D1 API permission is account-wide |
| Admin hostnames and WAF custom ruleset | Terraform, `infra/cloudflare/admin-mtls.tf`; this ruleset owns the entire custom WAF phase |
| Client certificate | Cloudflare API, using the TaiwanHaul token |
| Admin Worker and fingerprint secret | Manual Wrangler commands from `apps/admin-api`; staging uses `--env staging`. Admin deployment is not in CI. |

The TaiwanHaul API token permissions are Zone DNS Edit, Email Routing Rules Edit, SSL and Certificates Edit, and WAF Edit, all scoped to `taiwanhaul.com`. It has no account-level D1 permission.

### One-time setup

1. From the repository root, create separate databases using the `apps/admin-api` config. Paste each returned ID into the matching `database_id` in `apps/admin-api/wrangler.json`:

   ```sh
   # from repo root
   (cd apps/admin-api && wrangler d1 create taiwanhaul-staging)
   (cd apps/admin-api && wrangler d1 create taiwanhaul)
   ```

2. Apply the mTLS hostname associations and WAF rule through the reviewed Terraform plan. Read the [Terraform skill](../.agents/skills/taiwanhaul-terraform/SKILL.md) first; save the plan, inspect it, get explicit approval, then apply that saved plan:

   ```sh
   # from repo root
   (
     set -a
     . "$HOME/.config/taiwanhaul/terraform.env"
     set +a
     terraform -chdir=infra/cloudflare plan -out="$HOME/.config/taiwanhaul/admin-mtls.tfplan"
   )
   # After reviewing this exact saved plan and receiving explicit approval:
   (
     set -a
     . "$HOME/.config/taiwanhaul/terraform.env"
     set +a
     terraform -chdir=infra/cloudflare apply "$HOME/.config/taiwanhaul/admin-mtls.tfplan"
   )
   ```

3. Create the key and CSR locally. Keep the directory private; the key must stay on this Mac. This named-curve command works with macOS LibreSSL; avoid `openssl req -newkey ec -pkeyopt ...`, whose output Go rejects.

   ```sh
   # from repo root
   (
     set -e
     mkdir -p "$HOME/.config/taiwanhaul/admin"
     chmod 700 "$HOME/.config/taiwanhaul/admin"
     cd "$HOME/.config/taiwanhaul/admin"
     umask 077
     openssl ecparam -name prime256v1 -genkey -noout -out admin.key
     chmod 600 admin.key
     openssl req -new -key admin.key -subj /CN=taiwanhaul-admin -out admin.csr
   )
   ```

4. Sign the CSR through Cloudflare. The subshell loads the TaiwanHaul token and zone ID from the private Terraform environment file; the response certificate is saved as `admin.pem`.

   ```sh
   # from repo root
   (
     set -euo pipefail
     set -a
     . "$HOME/.config/taiwanhaul/terraform.env"
     set +a
     ZONE_ID="${TF_VAR_zone_id:?set the taiwanhaul.com zone ID}"
     curl --fail --silent --show-error \
       -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/client_certificates" \
       -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
       -H "Content-Type: application/json" \
       --data "$(jq -n --arg csr "$(cat "$HOME/.config/taiwanhaul/admin/admin.csr")" '{csr:$csr,validity_days:365}')" |
       jq -r '.result.certificate' > "$HOME/.config/taiwanhaul/admin/admin.pem"
   )
   ```

5. From the repository root, add the certificate fingerprint to the Worker secret for staging and production:

   ```sh
   # from repo root
   openssl x509 -in "$HOME/.config/taiwanhaul/admin/admin.pem" -noout -fingerprint -sha256 | cut -d= -f2 | tr -d : | tr A-F a-f
   (cd apps/admin-api && wrangler secret put ADMIN_CERT_FINGERPRINTS --env staging)
   (cd apps/admin-api && wrangler secret put ADMIN_CERT_FINGERPRINTS)
   ```

   Paste the printed fingerprint when Wrangler prompts. The staging and production secrets are separate.

6. From the repository root, deploy manually to staging and production:

   ```sh
   # from repo root
   (cd apps/admin-api && wrangler deploy --env staging)
   (cd apps/admin-api && wrangler deploy)
   ```

7. From the repository root, run the migration and seed from `apps/search-api`, using the private export directory. Example for staging:

   ```sh
   # from repo root
   DATA_DIR=/absolute/path/to/private-data
   (
     cd apps/search-api
     ADMIN_URL=https://admin-staging.taiwanhaul.com \
     ADMIN_CLIENT_CERT="$HOME/.config/taiwanhaul/admin/admin.pem" \
     ADMIN_CLIENT_KEY="$HOME/.config/taiwanhaul/admin/admin.key" \
       go run ./cmd/admin migrate

     ADMIN_URL=https://admin-staging.taiwanhaul.com \
     ADMIN_CLIENT_CERT="$HOME/.config/taiwanhaul/admin/admin.pem" \
     ADMIN_CLIENT_KEY="$HOME/.config/taiwanhaul/admin/admin.key" \
       go run ./cmd/admin seed "$DATA_DIR"
   )
   ```

   `migrate` can be run again safely; the Worker reports no applied versions when the schema is current.

### Verify and revoke

- Without a client certificate, `curl https://admin-staging.taiwanhaul.com/migrate` returns `403` at the WAF.
- With the allowed certificate, a wrong method or route returns `404`.
- Run `migrate` twice; the second response is `{"applied":[]}`.
- To revoke a certificate, remove its fingerprint from `ADMIN_CERT_FINGERPRINTS` and revoke it through Cloudflare. A revoked certificate is rejected by the WAF (`cf.tls_client_auth.cert_revoked`) and the Worker (`certRevoked`). Remove the fingerprint even after revocation. Revoke via `DELETE /zones/$ZONE_ID/client_certificates/$CERT_ID` with the same scoped token. For rotation, allowlist the new fingerprint before removing the old one.

### Seed format

`admin seed <data-dir>` reads `<data-dir>/product-index.json`. It must contain the six arrays `platforms`, `merchants`, `products`, `variants`, `offers`, and `aliases`; row keys are the schema's snake_case columns. `platform_operated` may be omitted.

```json
{
  "platforms": [{"id":"pchome","name":"PChome"}],
  "merchants": [{"id":"pchome-store","name":"PChome","platform_id":"pchome"}],
  "products": [{"id":"cake","brand":"Example","name":"Pineapple cake","model":"","category":"snack"}],
  "variants": [{"id":"cake-box","product_id":"cake","name":"10-piece box"}],
  "offers": [{"id":"cake-offer","variant_id":"cake-box","merchant_id":"pchome-store","outbound_link":"https://example.com/products/cake","amount":600,"checked_on":"2026-10-30"}],
  "aliases": [{"product_id":"cake","locale":"en","alias":"pineapple cake"}]
}
```

The CLI validates locally before sending anything. The Worker validates again and writes all six tables in one D1 batch.

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

Issue PRs target `staging`, whose push workflow deploys Worker `taiwanhaul-staging`. The release PR is `staging` → `main`: require CI on its current head, an independent final review of `git diff main...staging`, full smoke checks on the staging URL, and explicit operator approval before merging. Push to `main` deploys production exactly as before. Follow the [release-check skill](../.agents/skills/taiwanhaul-release-check/SKILL.md) for the evidence required at each gate.

Both deployment workflows install with `bun install --frozen-lockfile`, run `bun run build`, then deploy from `apps/web` with Wrangler. Staging uses `CLOUDFLARE_ENV=staging` **at build time** and `wrangler deploy --env staging`; the Vite plugin flattens the chosen environment into its build output, so the deploy flag alone is insufficient. Production uses the default build and `wrangler deploy`. Each environment has its own concurrency group, with no cancellation of an in-progress deployment; manual runs are restricted to their corresponding branch. PRs to either branch get Test and a Worker version preview; the preview does not route production traffic and is not the persistent staging site.

PR previews follow the PR's **base branch**: PRs to `staging` build with `CLOUDFLARE_ENV=staging` and upload with `versions upload --env staging` from `apps/web` to `taiwanhaul-staging`, using staging bindings and secrets. Release PRs to `main` keep the default build and upload to `taiwanhaul` from `apps/web`, using production bindings and secrets without changing live production traffic. The staging Worker must already exist from the first successful staging deploy before staging PR previews can work.

`bun run deploy` builds and deploys production directly; it is not the normal release path and requires separate explicit approval.

Set the GitHub repository secrets once:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo iskWang/taiwanhaul
gh secret set CLOUDFLARE_ACCOUNT_ID --repo iskWang/taiwanhaul
```

Run each command without a value so `gh` prompts securely.

After the first deployment, connect `taiwanhaul.com` in **Workers & Pages → taiwanhaul → Settings → Domains & Routes → Add Custom Domain**. The domain's DNS must already be on Cloudflare. This is a manual prerequisite outside the repository.

Before contact email works, enable Email Routing for `taiwanhaul.com` and verify the destination inbox. Create a Turnstile widget for `taiwanhaul.com` and preview hosts under `*.workers.dev`; put its public site key in `apps/web/src/Lib/config.ts` as `TURNSTILE_SITE_KEY`. After the first Worker deploy, set `CONTACT_TO` to the verified destination and `TURNSTILE_SECRET` as Worker secrets in the Cloudflare dashboard or from `apps/web` with `bunx wrangler secret put CONTACT_TO` and `bunx wrangler secret put TURNSTILE_SECRET`. Secrets persist across deploys. Until set, the endpoint fails closed; the form shows its localized server error.

### One-time staging setup

The bootstrap flow PR alone targets `main`. After its review, approved merge, and successful production workflow, the **operator** performs these steps; documenting them does not authorize an agent to run them.

1. Create the remote `staging` branch from the merged `main`:

   ```sh
   git fetch origin main
   git push origin refs/remotes/origin/main:refs/heads/staging
   ```

   This triggers the first Deploy staging run. Wait for it to finish successfully and record its SHA and workers.dev URL. This creates `taiwanhaul-staging`, a prerequisite for staging PR version previews; do not retarget issue PRs before it exists. Do not add a custom domain or route to the staging Worker.

2. Set staging secrets interactively from the repository root:

   ```sh
   cd apps/web
   bunx wrangler secret put CONTACT_TO --env staging
   bunx wrangler secret put TURNSTILE_SECRET --env staging
   ```

   `CONTACT_TO` is the operator's verified inbox, not a customer address; staging keeps the `SEND_EMAIL` binding and `CONTACT_FROM`. Use the secret matching the public Turnstile site key compiled into the app. In the widget's hostname settings, ensure `taiwanhaul-staging.iskwang.workers.dev` is allowed (directly or by a configured parent hostname); a production-only hostname does not cover staging. Do not enter a wildcard hostname. Secrets are separate per Worker, persist across deploys, and stay out of Git. Until configured, contact delivery fails closed. Real email smoke tests still need explicit approval.

3. Protect `main` with the following exact command, run by the repository owner/admin:

   ```sh
   gh api --method PUT repos/iskWang/taiwanhaul/branches/main/protection \
     -H 'Accept: application/vnd.github+json' \
     --input - <<'JSON'
   {
     "required_status_checks": {
       "strict": true,
       "contexts": ["test"]
     },
     "enforce_admins": true,
     "required_pull_request_reviews": {
       "dismiss_stale_reviews": true,
       "require_code_owner_reviews": false,
       "required_approving_review_count": 0
     },
     "restrictions": null,
     "allow_force_pushes": false,
     "allow_deletions": false
   }
   JSON
   ```

   This requires a PR and the `test` job, an up-to-date branch, and forbids force pushes and branch deletion, including for admins. The approval count is zero so a solo operator can merge; the independent final review and explicit operator approval remain mandatory release-process gates, not GitHub approval-count enforcement. Branch protection does not enforce a `staging` source branch. Inspect existing protection before applying: this PUT replaces the listed settings.

4. Retarget the already-open issue PR #18, then verify its new CI and preview:

   ```sh
   gh pr edit 18 --repo iskWang/taiwanhaul --base staging
   ```

All subsequent issue PRs target `staging`; only reviewed release PRs target `main`. Future D1 use must provision a **separate staging database** and staging binding, never reuse the production database ID. No D1 database is created by this flow.

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
