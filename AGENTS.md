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
- Before changing the Admin Worker, Product Index D1 setup, or admin CLI, read `docs/admin.private.md` (gitignored, not in the repo; ask the owner if missing and stop admin work without it).
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
- The Go Search API compiles to `apps/search-api/build/` and is bundled into the web Worker; `bun run build` builds it first. To run it locally with seeded data, follow `apps/search-api/README.md`.

Review this file when commands, tests, architecture, or security rules change; remove redundant guidance discoverable in code.
- Code and tests are TypeScript (`.ts`/`.tsx`); do not add `.js`, `.mjs`, or `.cjs` files.

## Pull requests

- Open PRs as the agent account (`iskwang-agent`); never as the repository owner. Commit author and committer must be the agent account.
- Issue PRs (base `staging`) are squash-merged with the PR body as the commit message, so the PR body is the permanent record. Use a conventional-commit PR title. Do not squash release PRs (`staging` to `main`): it diverges the two branches; follow Release flow.
- After the last push (a rebase or author rewrite changes hashes), add a `Commits:` list to the PR body: one `- <short hash> <subject>` line per branch commit. The hashes disappear from `staging` on squash; `git fetch origin pull/<N>/head` recovers them while GitHub keeps the PR ref.
- Before pushing an issue PR, get a PASS from an independent reviewer on `git diff staging...HEAD`; send fixes back to the same reviewer. The human merges. Release PRs get the final review described in Release flow.
