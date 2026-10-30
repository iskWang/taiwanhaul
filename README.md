# TaiwanHaul

A curated guide to Taiwanese products for Visitors in Southeast Asia. Product data is hand-curated; the site does not collect prices from marketplaces.

## Architecture

```mermaid
graph TD
  Visitor --> Web["apps/web · React + Vite + Cloudflare Worker"]
  Web -->|"/api/contact"| Contact["Contact endpoint"]
  Contact --> Email["Email binding"]
  Web -. "sample products; browser search" .-> Catalog["Curated sample data"]
  SearchAPI["apps/search-api · Go / Workers"] -. "not wired to web (#15)" .-> D1[("D1")]
  Trailer["apps/trailer · Remotion"]
```

## Search data flow

```mermaid
flowchart LR
  Curator["Manual curation"] --> Index["Product data"]
  Index --> Sample["Public sample catalog in apps/web"]
  Visitor -->|"query"| Browser["Browser search"]
  Browser -->|"normalize and search"| Sample
  Browser --> Results["Results"]
  SearchAPI["Go Search API"] -. "future integration; not implemented" .-> Index
```

## Monorepo

- `apps/web` — deployed website and contact Worker.
- `apps/search-api` — Go Workers proof of concept; not connected to the web app.
- `apps/trailer` — standalone Remotion trailer.
- `docs/` — architecture, product rules, and infrastructure notes.

Install with `bun install`. Run `bun run test`, `bun run typecheck`, or `bun run build` from the repository root. See [docs](docs/README.md) for detailed project notes.
