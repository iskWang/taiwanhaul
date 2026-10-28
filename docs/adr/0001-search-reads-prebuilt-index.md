---
status: accepted
---

# Search reads only a pre-built private Product Index

A Visitor's search reads only TaiwanHaul's private Product Index, which a separate offline collection workflow fills ahead of time. A search never triggers a live request to a Platform. Live fetching per search would multiply load on Platforms with no request budget, break whenever a Platform is slow or changes its markup, and make latency depend on third-party sites. The cost is coverage: anything not yet in the Product Index returns no Products, which is why every search also shows External Search Links and zero-result Queries are recorded as Unmet Demand to steer the next collection run.

## Consequences

- Search and data collection are separate workflows with separate runtimes. Collection can be written in Python and run on demand; the search path stays small and serverless.
- Prices can only be as fresh as the last collection run, so the Fresh Price rule (same-day only) hides most Prices unless collection runs daily.
- The Product Index must stay private. Public search responses expose individual Offers, so this limits bulk copying but does not prevent scraping.
