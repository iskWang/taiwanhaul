---
status: accepted
---

# Search reads only a pre-built private Product Index

A Visitor's search reads only TaiwanHaul's private Product Index, which a separate offline collection workflow fills ahead of time. A search never triggers a live request to a Platform. Live fetching per search would multiply load on Platforms with no request budget, break whenever a Platform is slow or changes its markup, and make latency depend on third-party sites. The cost is coverage: anything not yet in the Product Index returns no Products. The Product Spec mitigates this with External Search Links (for qualifying Platforms only) and by recording zero-result Queries as Unmet Demand; whether Unmet Demand drives collection priority is still Proposed (see `docs/architecture.md`).

## Consequences

- Search and data collection are separate workflows with separate runtimes. Collection can be written in Python and run on demand; the search path stays small and serverless.
- Prices can only be as fresh as the last collection run, so the Fresh Price rule (same-day only) hides most Prices unless collection runs daily.
- The Product Index must stay private. Public search responses expose individual Offers, so this limits bulk copying but does not prevent scraping.
