# Documentation index

`AGENTS.md` holds repository rules; `docs/` explains product and architecture decisions; `.agents/skills/` explains operational procedures.
`research/` contains dated findings that inform decisions; it is not a source of current rules.

- `product-spec.md` — current product behavior and scope; read for product decisions and acceptance criteria.
- `architecture.md` — current system and proposed architecture; read for implementation boundaries and open decisions.
- `infrastructure.md` — Cloudflare resources, ownership, state, secrets, and migration plan; read before infrastructure work.
- `adr/0001-search-reads-prebuilt-index.md` — accepted search/index architecture decision; read when changing search data flow.
- `adr/0002-spa-without-ssr.md` — accepted SPA deployment decision; read when changing rendering or deployment.
- `adr/0004-daily-collection-from-brand-shops.md` — accepted daily Price collection from brand-run shops with human approval; read when changing which shops are collected, the bot, approval, or Price display.
- `research/external-search-links.md` — 2026-10-28 platform-link findings; read when evaluating external search links.
- `research/privacy-notice.md` — 2026-10-28 privacy research and draft notice; read for privacy planning, not as current policy.

## Planka auto-takeover

Low-risk cards are implemented by an agent in an isolated copy, which opens a PR; a human approves before merge.
