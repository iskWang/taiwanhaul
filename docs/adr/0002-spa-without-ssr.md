---
status: accepted
---

# Frontend is a client-rendered React SPA, without SSR or Next.js

The frontend will move from plain ES modules to React + TypeScript with the TanStack ecosystem, built to static assets and served by Cloudflare Workers static assets. We rule out Next.js and any server-side rendering. An SSR server is extra attack surface and extra runtime to patch and operate; the goal is to stay as serverless as possible, with the only server code being small Worker endpoints under `/api/*`.

## Considered Options

- **Next.js (SSR/RSC)**: better first-paint SEO, rejected for the security and maintenance cost of running a rendering server.
- **Stay on plain ES modules**: no build step, but harder to grow the search UI (expandable Offers, state, forms) without a component model.

## Consequences

- SEO for localized pages has to come from build-time prerendering or static fallbacks, not request-time rendering.
- Which TanStack libraries (Router, Query, Form) to adopt is still open; see `docs/architecture.md`.
