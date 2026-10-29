# TaiwanHaul Infrastructure Plan

This is a gradual Terraform learning path, not a Cloudflare cutover. The current production design stays in place while a disposable DNS record proves the workflow. Inventory below reflects the parent-observed account on 2026-10-29; it is not a fresh account query.

## Scope

The repo-wide [project scope rule](../AGENTS.md#project-scope) applies: this document and any Terraform under `infra/` cover TaiwanHaul resources only.

## Infrastructure Inventory

| Resource | Where it lives | Managed by today | Evidence |
|---|---|---|---|
| `taiwanhaul.com` zone | Cloudflare account; Free Website plan | Dashboard | Cloudflare API read, 2026-10-29 |
| DNS records | Zone | Dashboard; record list UNKNOWN: the API read token could not read DNS records; operator must list them in the Dashboard before phase 1 | Cloudflare API read, 2026-10-29 |
| Worker script `taiwanhaul` | Cloudflare Workers | Wrangler; deployed on push to `main` | `wrangler.json:2-4`; `.github/workflows/deploy.yml:4-18` |
| Custom domain `taiwanhaul.com` | Worker custom domain | Dashboard today; not declared in Wrangler; Terraform later only after validation | Cloudflare API read, 2026-10-29; `wrangler.json:1-22` |
| Static assets | `public/` served by Worker | Wrangler | `wrangler.json:5-10`; `README.md:18-45` |
| `CONTACT_FROM` var | Worker configuration | Wrangler | `wrangler.json:14-16` |
| Worker secrets `CONTACT_TO`, `TURNSTILE_SECRET` | Worker secret store | Wrangler `secret put` or Dashboard; values never in repo | Cloudflare API read, 2026-10-29; `README.md:129-143` |
| `SEND_EMAIL` binding (`send_email`) | Worker binding | Wrangler | `wrangler.json:17-21` |
| Worker observability | Worker configuration | Wrangler | `wrangler.json:11-13` |
| Email Routing | `taiwanhaul.com` zone; enabled/ready; only disabled drop catch-all seen. `contact@` rule pending | Dashboard | Cloudflare API read, 2026-10-29 |
| Turnstile widget `taiwanhaul-contact` | Cloudflare Turnstile; managed mode; domains `iskwang.workers.dev`, `taiwanhaul.com` | Dashboard today | Cloudflare API read, 2026-10-29; public site key in `src/Lib/config.ts` on PR #8 |
| GitHub Actions secrets | Repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; scope UNKNOWN | GitHub secrets | `.github/workflows/deploy.yml:13-18`; `preview.yml:15-22`; Cloudflare API read, 2026-10-29 |
| `iskwang.workers.dev` preview subdomain | Cloudflare account; preview versions use Wrangler | Wrangler/account setting; no explicit subdomain config in repo | Cloudflare API read, 2026-10-29; `.github/workflows/preview.yml:16-22` |
| Go PoC D1 | Local-only `experiments/workers-go-search` config; not deployed | Local experiment only | `experiments/workers-go-search/wrangler.jsonc` on PR #8; Cloudflare API read, 2026-10-29 |

**Current vs pending:** main serves `public/` as assets (`wrangler.json`, `README.md`). PR #8 is pending: it adds Vite/React build output, SPA fallback, and the Cloudflare Vite plugin (`feat/react-migration:wrangler.json`, `vite.config.ts`, workflows). Do not treat PR #8 as production state before merge.

## Ownership Boundaries

| Area | Now | Target |
|---|---|---|
| Worker script, versions, assets, bindings, vars, secrets, observability | Wrangler | Wrangler remains sole owner |
| DNS, Email Routing, Turnstile widget | Dashboard | Terraform may own later, after inventory/import and provider validation |
| Worker custom domain | Dashboard | Terraform possibly later (**Requires validation**; check provider v5 `cloudflare_worker_custom_domain` docs and lifecycle: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/worker_custom_domain); keep Dashboard owner until confirmed |

One owner per resource, always. If Wrangler and Terraform both manage the same resource, either can overwrite the other's settings or produce destructive/replacement plans and persistent drift. Keep the Worker script and its bindings/secrets out of Terraform; splitting ownership by distinct resource is fine.

## Sandbox Experiment

Proposed layout only (do not create yet): `infra/sandbox/` with one resource for `_tf-sandbox.taiwanhaul.com`, TXT value `taiwanhaul terraform sandbox`.

1. Pre-check: in the Dashboard DNS list, confirm no record named `_tf-sandbox` exists (the record list is not known from the API read). If one exists, pick another unused name. Then install Terraform; in `infra/sandbox/`, run `terraform init` and inspect the provider lock/version.
2. `terraform plan` must show exactly one TXT record to add; inspect before `terraform apply`.
3. `terraform apply`, then `dig TXT _tf-sandbox.taiwanhaul.com`; confirm the harmless value.
4. Run `terraform plan` again: no changes.
5. Edit that TXT record manually in the Dashboard; run `terraform plan -detailed-exitcode` and observe drift (exit 2).
6. Restore it with apply or import/recreate as appropriate, then `terraform destroy` and confirm DNS returns nothing.

A TXT record at an unused name is low risk: it does not route traffic, is easy to identify, and is easy to delete. The risk sits in the token, not the record (see Token Scope). Terraform is HashiCorp's tool and the recommended first choice for hands-on learning; OpenTofu is a compatible open-source alternative, but do not maintain both workflows.

## State

Keep sandbox state local. Add `*.tfstate*` and `.terraform/` to `.gitignore`; never commit state or plan files. State can contain sensitive values in plaintext even when Terraform hides them in CLI output. Later, consider R2's S3-compatible endpoint (**Requires validation for Terraform S3 backend locking and compatibility**) or HCP Terraform Free. HashiCorp documents S3 state locking for S3; that does not confirm Cloudflare R2 locking behavior. Sources: [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3), [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/api/s3/).

## Token Scope

The operator creates one dedicated Cloudflare API token in the Dashboard: Zone → DNS → Edit, resource scope limited to the `taiwanhaul.com` zone only. Set a short expiration/TTL and optionally an IP filter. Never use the Global API Key or the Wrangler OAuth token. Supply the token with `CLOUDFLARE_API_TOKEN` in the environment; never put it in a committed `.tfvars` file. The token must not grant account-wide permissions or Worker access. Start with DNS-only access for the sandbox; create a separately scoped token only if a later resource needs a different permission.

**Blast radius:** DNS Edit cannot be narrowed to one record. This token can change or delete *every* DNS record in `taiwanhaul.com`, including the website and mail records. Treat it like a production credential: short TTL, revoke right after the experiment, and read every `plan` before `apply`. Whether DNS Edit alone is enough for v5 `cloudflare_dns_record` plan/apply/destroy given a known zone ID, or whether Zone → Zone → Read is also needed, is **Requires validation**: start with DNS Edit only, and add Zone Read only if the provider returns a permission error.

## Secret Safety

Keep secrets out of Terraform for now. Worker secrets stay with `wrangler secret put` (or the Dashboard). Terraform's `sensitive = true` redacts normal display; it does not remove values from state or saved plan files. Never place `CONTACT_TO`, `TURNSTILE_SECRET`, or API tokens in Terraform config, variables files, state, or plans.

## Import and Drift Detection

Use Terraform `import` blocks when the import should be reviewed and repeatable in configuration; the `terraform import` CLI is a direct one-off state import. Both require a matching resource configuration and a careful plan before apply. HashiCorp's import docs describe both approaches: https://developer.hashicorp.com/terraform/language/import.

Cloudflare provider checked: **v5.28.1**. Its documented DNS resource is `cloudflare_dns_record` (not legacy `cloudflare_record`): https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/dns_record. `cloudflare_email_routing_rule` and `cloudflare_turnstile_widget` capabilities for this account/configuration are **Requires validation**; check the provider's v5 docs before adopting: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/email_routing_rule and https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/turnstile_widget. cf-terraforming support for provider v5 is **Requires validation**; the project documentation to check is https://github.com/cloudflare/cf-terraforming.

Manual drift check: `terraform plan -detailed-exitcode` (0 = no changes, 2 = changes; other nonzero = error). Optional later: scheduled CI plan-only drift check, with a read/plan-scoped token and no apply. Do not change workflows for this proposal.

## Migrating Away from Cloudflare

Effort estimates are relative for this small app. Terraform is provider-specific: it can standardize inventory and the plan/apply workflow, not make Cloudflare resources portable.

| Component | What changes off Cloudflare | Effort | Terraform help |
|---|---|---:|---|
| Worker runtime (`fetch`, `env.ASSETS`, `cloudflare:email` `send_email`, `run_worker_first`) | Port request handler, asset binding, email adapter, and route ordering to target runtime | L | Low: provisions provider-specific resources only |
| Static assets and SPA fallback | Move build output/hosting; reproduce missing-route fallback and API-vs-asset routing | M | Low |
| Turnstile client + server `siteverify` | Replace widget and verification endpoint; update public site key and server secret | M | None for app portability; provider-specific widget config only |
| Email Routing / Email Sending | Replace forwarding and Worker email delivery with target email provider | M | Low: provider-specific config, not portable behavior |
| D1, if adopted | Export/migrate schema and data; adapt SQL/runtime binding | L | Low: does not migrate data or SQL behavior |
| DNS | Move records and nameservers carefully; preserve mail and web records | M | Medium for record inventory/export; syntax remains provider-specific |
| Vite Cloudflare plugin (PR #8) | Replace plugin/platform dev and build integration with target tooling | M | None |
| CI workflows | Replace Wrangler deploy/version upload and Cloudflare credentials with target build/deploy | M | Low: workflow still platform-specific |

Portability seam: keep Cloudflare-specific calls (asset binding, `cloudflare:email`, Turnstile verification, and runtime bindings) isolated in a few Worker modules; keep request/business behavior independent where practical.

## Acceptance Criteria for the Sandbox

1. First `terraform plan` shows exactly 1 to add: the disposable TXT record.
2. Apply creates it; `dig TXT _tf-sandbox.taiwanhaul.com` returns the chosen value.
3. Second plan reports no changes.
4. A manual value edit makes `terraform plan -detailed-exitcode` exit 2.
5. After restoring/importing as appropriate, destroy removes the record; `dig` returns no TXT answer.
6. `*.tfstate*` and `.terraform/` are ignored; no state or token is in git; `git status` is clean after cleanup.
7. Verify one denied API call confirms the token cannot access another zone or Worker resources.
8. Cost: **Requires validation**. DNS records on the Free plan are not expected to be billed, but confirm against the account's plan and billing page before calling the experiment $0.

### Sandbox run, 2026-10-29

Terraform v1.17.1, provider `cloudflare/cloudflare` v5.28.1. Token: Zone → DNS → Edit on `taiwanhaul.com` only, expiring 2026-10-30.

| # | Result |
|---|---|
| 1 | Pass: plan `1 to add` |
| 2 | Pass: apply created the record; `dig @1.1.1.1` returned the value |
| 3 | Pass: second plan exit 0, `No changes` |
| 4 | Pass: a Dashboard edit made plan exit 2 (`1 to change`); apply restored it, then plan exit 0 |
| 5 | Pass: destroy removed it; API lists 0 records and the authoritative nameserver returns no TXT (public resolvers may serve the cached value until the TTL expires) |
| 6 | Pass: state empty and git-ignored; token cleared from the local env file after the run |
| 7 | Pass: listing Workers scripts returned `10000 Authentication error`; a non-DNS zone setting returned 403; the token sees only 1 zone |
| 8 | Not checked (still Requires validation) |

Findings:
- DNS Edit alone was enough for plan, apply, refresh, and destroy with a known zone ID; Zone Read was not needed.
- A token whose `not_before` (start date) lies in the future returns `401 Authentication error` on every call, even though `/user/tokens/verify` reports `active`. Leave the start date empty.
- With `CLOUDFLARE_API_TOKEN` exported, `wrangler` also uses that token instead of its own login. Load the sandbox token only in the shell running Terraform.

## Implementation Proposal

0. Sandbox TXT in `infra/sandbox/`; gate: all sandbox acceptance checks pass and state/token remain private. **Done 2026-10-29** (cost check pending).
1. Add existing DNS records via import; read-only plan first; gate: operator confirms each record and plan shows no unintended change.
2. Add Email Routing and Turnstile; gate: provider v5 resource support, permissions, and import/update behavior validated; one owner per resource.
3. Optional remote state and CI plan-only check; gate: backend locking/security verified, least-privilege token tested, and CI cannot apply.
