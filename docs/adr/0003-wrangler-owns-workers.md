---
status: accepted
---

# Wrangler owns Workers; Terraform owns only Email Routing and admin mTLS

Workers (code, versions, assets, bindings, vars, secrets, observability) stay with Wrangler. Terraform in `infra/cloudflare/` manages only the contact Email Routing rule, the admin mTLS hostname association, and the admin WAF ruleset. Decided 2026-11-13 after Astra and Opus both reviewed Cloudflare's [Infrastructure as Code guide](https://developers.cloudflare.com/workers/platform/infrastructure-as-code/).

## Considered Options

- **Terraform owns Workers fully** (`cloudflare_worker`, `cloudflare_worker_version`, `cloudflare_workers_deployment`): possible, and the provider can upload static assets. Rejected for the reasons below.
- **Terraform owns only `cloudflare_worker`** (existence and observability): rejected. The same settings (observability, workers.dev subdomain, Previews base config) would have two writers, and it does not stop `wrangler secret put` from creating an empty Worker under a mistyped name.

## Why not Terraform for Workers

- **Single source.** `wrangler.json` is already the one description of each Worker. `bun run dev` (Vite plugin), `wrangler preview` (requires a `previews` block) and the build read it regardless, so Terraform would add a second copy, not replace it.
- **Secrets in state.** Terraform stores `secret_text` values in plaintext in the state file; `Sensitive` only hides them from CLI output. Today secrets live only in Cloudflare (`wrangler secret put`), never in the repo or a state file.
- **CI.** Pushing to `staging` auto-deploys with `wrangler deploy`. Terraform changes require a reviewed plan and explicit approval, and CI must not apply, so moving Workers to Terraform would either break that rule or end auto-deploy. State is also local, so CI cannot see it.
- **Token scope.** The Terraform token is limited to the `taiwanhaul.com` zone. Managing Workers needs an account-level Workers permission, which would also cover unrelated Workers in the account.

## Consequences

- Before `wrangler secret put`, run `bunx wrangler deployments list --name <worker>` to confirm the Worker exists; `secret put` on a missing name silently creates an empty Worker.
- Revisit only if remote state with locking and a plan-only CI flow are proven, and a real need appears to declare Workers next to other Terraform resources (for example `cloudflare_worker_custom_domain`). First reversible step then: import one `cloudflare_worker` with `lifecycle { ignore_changes = all }`; `terraform state rm` undoes it.

