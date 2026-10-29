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

## Invariants

- **Privacy:** `track()` events carry coarse properties only (lengths, counts, codes), never raw search text or contact-form content.
- **Shared validation:** the Worker imports `validateContact` from `src/Lib/contact.ts`; client and server must keep one copy.
- **Product data** is hand-curated. Shopee, momo, PChome, Yahoo and Coupang terms prohibit automated collection. Prices may be shown but are never attributed to a Platform.
- **One owner per cloud resource:** Wrangler owns the Worker; Terraform state (`*.tfstate`) is never committed.

## Testing gotchas

- `bun test` runs the `node:test` files; `bun run typecheck` and `bun run build` must also pass.
- Real Turnstile never passes in a headless browser: stub `window.turnstile`. `bun run dev` uses Cloudflare's always-pass test site key.
- Inside `experiments/workers-go-search`, pass `-c wrangler.jsonc` to wrangler, or it picks up the root `wrangler.json`.
