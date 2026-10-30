# AGENTS.md

## Project scope

Everything written in this repository is about **TaiwanHaul only**: the `taiwanhaul.com` domain and zone, the `taiwanhaul` Worker and its bindings, this GitHub repository and its secrets, and services set up for this project (such as the Turnstile widget `taiwanhaul-contact`).

This applies to every artifact: docs, README, ADRs, research notes, code and comments, config, Terraform, commit messages, and PR descriptions.

- When a lookup (Cloudflare account, GitHub, the local machine, memory) returns resources from other projects, record only the TaiwanHaul ones and leave the rest out entirely, even when they share the same account.
- For shared resources (the Cloudflare account, the `workers.dev` subdomain), describe only the part TaiwanHaul uses.
- Scope credentials and tokens to TaiwanHaul resources, so other projects stay out of reach by permission rather than by care.
- Code style may follow the operator's conventions; cite the convention itself, not the repository it came from.

## Where to look

- Domain terms (Product, Offer, Merchant, Platform, Fresh Price, Unmet Demand): `CONTEXT.md`. Use these words in code and docs.
- Product rules and scope: `docs/product-spec.md`. Architecture and open decisions: `docs/architecture.md` and `docs/adr/`.
- Cloudflare resources, Terraform vs Wrangler ownership: `docs/infrastructure.md`.
- For Terraform operations, you must read [.agents/skills/taiwanhaul-terraform/SKILL.md](.agents/skills/taiwanhaul-terraform/SKILL.md).
- For release verification, you must read [.agents/skills/taiwanhaul-release-check/SKILL.md](.agents/skills/taiwanhaul-release-check/SKILL.md).

## Invariants

- **Privacy:** `track()` events carry coarse properties only (lengths, counts, codes), never raw search text or contact-form content.
- **Shared validation:** the Worker imports `validateContact` from `apps/web/src/Lib/contact.ts`; client and server must keep one copy.
- **Product data** is hand-curated. Shopee, momo, PChome, Yahoo and Coupang terms prohibit automated collection. Prices may be shown but are never attributed to a Platform.
- **One owner per cloud resource:** Wrangler owns the Worker; Terraform state (`*.tfstate`) is never committed.

## Release flow

- Issue PRs target `staging`; never open an issue PR directly to `main`. Merging to `staging` automatically deploys the test Worker.
- Production changes use a release PR from `staging` to `main`. Require a final review of the complete release diff, the release-check skill's CI and staging smoke checks, and explicit operator approval before merging. A push to `main` deploys production.
- The initial staging-flow bootstrap PR targets `main` once, because `staging` does not exist yet. The operator then completes the [one-time staging setup](docs/infrastructure.md#one-time-staging-setup); this is not an exception for issue PRs.

## Testing gotchas

- `bun run test`, `bun run typecheck`, and `bun run build` run from the repository root and cover their workspaces.
- Real Turnstile never passes in a headless browser: stub `window.turnstile`. `bun run dev` uses Cloudflare's always-pass test site key.
- Inside `apps/search-api`, pass `-c wrangler.jsonc` to wrangler, or it picks up `apps/web/wrangler.json`.

Review this file when commands, tests, architecture, or security rules change; remove redundant guidance discoverable in code.
