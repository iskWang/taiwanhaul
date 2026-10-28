# TaiwanHaul MVP Product Spec v1.0

## Vision & Non-goals

TaiwanHaul helps Visitors in Southeast Asian Markets discover Taiwanese Products in their own Locale, understand what is worth buying or bringing home, and find the Taiwanese Merchants that sell them. It is a multilingual Product search and discovery site, not a transaction platform. TaiwanHaul does not handle orders, checkout, payment, or logistics.

The MVP aims to make it easier to search across languages and reach a Merchant. The Product Index is a private, curated data asset; the full index must not be published.

## Target Markets & Locales

Markets and display Locales are independent:

| Market | Code | Supported Locales |
|---|---|---|
| Singapore | SG | en, zh-TW, th, vi, ms, fil |
| Malaysia | MY | en, zh-TW, th, vi, ms, fil |
| Thailand | TH | en, zh-TW, th, vi, ms, fil |
| Vietnam | VN | en, zh-TW, th, vi, ms, fil |
| Philippines | PH | en, zh-TW, th, vi, ms, fil |

The Visitor's Market determines the currency used for a Local Estimate; Locale does not. Taiwan (TW) is also present in the current implementation's market list, but it is not one of the MVP Target Markets.

## Core User Journey

1. A Visitor opens the site and selects a Locale and Market.
2. The Visitor enters a free-text Query in their Locale.
3. TaiwanHaul suggests a Chinese Search Term that the Visitor can copy or correct.
4. TaiwanHaul searches the private, pre-built Product Index and orders matching Products by Best Match.
5. The Visitor reviews Product identity, Variant, source, and any eligible Fresh Price and Local Estimate.
6. The Visitor expands a Product to compare its Offers and follows an Outbound Link to a Merchant.
7. If no Product matches, TaiwanHaul offers External Search Links (where any Platform qualifies) and records Unmet Demand without identifying data.
8. The Visitor can use Contact to send a Delivery Inquiry; this is handled by a person, not an order flow.

This is the target journey. Current implementation gaps are listed in Functional Requirements.

## Functional Requirements

Status describes the verified repository implementation, not the target behavior.

| ID | MVP P0 requirement | Status | Requirement |
|---|---|---|---|
| P0-1 | Multilingual free-text Product search | Mock only | Accept a free-text Query in supported Locales and search the Product Index. Current browser search runs over public mock data and is explicitly marked as a demo; it is not real Product search. |
| P0-2 | Search intent / Chinese Search Term | Mock only | Suggest a Chinese Search Term that the Visitor can copy or correct. Current normalizer uses a dictionary/Chinese/passthrough strategy and displays Chinese terms as chips; no correction flow exists. |
| P0-3 | Best Match ranking | Mock only | Default order ranks brand, name, model, Variant, cross-language aliases, and category relevance. Current mock results sort by score, then price; the full ranking behavior is not implemented. |
| P0-4 | Product-first results | Mock only | Results represent Products rather than Platform listings. Current results remain adapter-level records, with no Product Merge. |
| P0-5 | Product identity, Variant, and source | Mock only | A result should show enough identity and Variant detail to distinguish Products, plus its source. Current public mock records have limited data and a single price; source is an adapter ID. |
| P0-6 | Conservative Product Merge and Merchant grouping | Not started | Merge only Offers confirmed to be the same Product and Variant; uncertain matches stay separate. |
| P0-7 | Expandable Offers | Not started | Product cards expand to show Merchants' Offers and their details. |
| P0-8 | Outbound Links | Not started | Each Offer links to its Merchant's Product page. |
| P0-9 | Freshness and Price reliability | Mock only | Show a Price only when it is a Fresh Price; show its check date. Current Local Estimate uses mock FX data; Product prices are mock values, and freshness rules are not implemented. |
| P0-10 | Zero-result fallback and External Search Links | Not started | On no results, show External Search Links for Chinese Search Terms, for qualifying Platforms only (rule 8). Until a Platform qualifies, the fallback is the Chinese Search Term plus Contact. No such links exist in the current implementation. |
| P0-11 | Unmet Demand recording | Not started | For zero-result Queries only, record raw Query, Locale, Market, and timestamp, without IP or identifying data. Repo code does not currently record raw Queries. |
| P0-12 | Mobile-friendly search journey | Implemented | Keep the search and Contact experience usable on mobile. The current site is responsive. |
| P0-13 | Contact entry point | Implemented (topics outdated) | Keep Contact as the Delivery Inquiry entry point. Target topics: `delivery` (Delivery Inquiry, default), `product_suggestion`, `partnership`, `other`; `general` is dropped because it overlaps `other`. Current topics are general, product_suggestion, partnership, and other. |

Unmet Demand is the single documented exception to the analytics rule against sending raw search text. Nothing records it today: there is no database or other storage, and search runs only in the browser.

The site has no privacy notice today, although the live Contact form already collects name, email, Market and message, and Turnstile processes the Visitor's IP. A published privacy notice is a launch requirement (rule 18). Research, per-Market requirements and a draft are in [docs/research/privacy-notice.md](research/privacy-notice.md).

## Product Rules

1. A Visitor may enter any free-text Query; search is not limited to curated picks.
2. Search results are Product-first, not Platform-first.
3. Best Match is the default ordering and should consider brand, name, model, Variant, cross-language aliases, and category relevance.
4. Product Merge is permitted only for reliably identical Products and Variants. When uncertain, keep results separate.
5. Different sizes, capacities, models, flavors, and pack counts are distinct Variants and must not be merged as one Product.
6. A Product card can group multiple Offers and expand to show each Merchant and its buying details.
7. A Visitor can follow an Outbound Link to the Merchant's own Product page. Known broken links must not be presented as valid buying routes.
8. External Search Links should remain available whether TaiwanHaul has matching Products or not. A Platform gets one only after TaiwanHaul can actually obtain structured Product data from it; a public search URL alone does not qualify.
9. Show a Price only when it is reliable, verifiable, and a Fresh Price; never imply that it is live. Otherwise hide the Price and explain that it is unavailable or should be checked on the Merchant site.
10. A Fresh Price is checked on the same day it is shown, by Asia/Taipei date. Always show the TWD Price beside a Local Estimate; label the Local Estimate as approximate and include its FX date.
11. Identify the source of Product information and buying links.
12. Keep the complete Product Index private; do not publish it as a full public data set.
13. Contact is retained as the entry point for a Delivery Inquiry. It is handled by a person and does not create an order or provide a full proxy-purchase flow. Its topics are `delivery` (default), `product_suggestion`, `partnership`, `other`.
14. Only Merchants operated by the Platform itself are in MVP scope. Third-party sellers on a Platform are excluded because TaiwanHaul cannot verify their service quality; keep Merchant distinct from Platform in the product model so this can change later.
15. Record Unmet Demand only for zero-result Queries, with raw Query, Locale, Market, and timestamp; do not record IP addresses or identifying data. Scrub email addresses and phone numbers before storage and keep raw Queries only for a fixed retention period. This is the sole exception to the rule against sending raw search text to analytics.
16. The homepage's existing “Cheaper in Taiwan” section keeps its Products but drops all Prices and savings percentages, and merges into Discovery Content. Price comparison stays deferred.
17. “Taiwan must-buy”, “Recommended by Taiwanese” and the former “Cheaper in Taiwan” Products merge into one Discovery Content section (P1, not an MVP launch condition). It carries a visible “for reference only” disclaimer.
18. Publish a privacy notice, in every supported Locale, before launch and before Unmet Demand recording starts. It covers Contact, Turnstile, Workers logs, Unmet Demand and stored preferences.

## Discovery Content (P1)

“Taiwan must-buy”, “Recommended by Taiwanese” and the Products from “Cheaper in Taiwan” merge into one Discovery Content section: curated homepage picks that do not depend on a Query. It shows no Prices or savings, carries a “for reference only” disclaimer, and is not required for MVP launch.

## Deferred / Out of Scope

- Price sorting and price comparison.
- Real-time stock availability.
- Cross-Platform ratings and reviews.
- Visitor accounts, favorites, and Price alerts.
- Shopping cart, checkout, payments, and logistics.
- Conversational AI shopping assistant.
- Merchant self-service Product listings.
- Full-scale Product encyclopedia.
- Advanced category, Merchant, or Price filters.
- Third-party Merchants on a Platform (service quality cannot be verified).
- Discovery Content as an MVP launch requirement.
- Live external-site crawling in response to a Visitor's Query; search reads a pre-built index.

## Acceptance Criteria

The Gherkin below is an acceptance description only; it does not imply automated tests exist. These are target behaviors, not claims about current implementation.

### Scenario: Search in a non-Chinese Locale
Given a Visitor selects English, Thai, or Vietnamese as the Locale
When the Visitor searches for a Product using a Query in that Locale
Then matching Products are shown when present in the Product Index
And a relevant Chinese Search Term is offered

### Scenario: Exact match ranks ahead of a broad match
Given the Product Index contains an exact Product match and broader related Products
When the Visitor searches for the exact Product
Then the exact match appears before the broader related Products in Best Match order

### Scenario: Merge the same Product and Variant across Merchants
Given multiple Offers are verified to represent the same Product and Variant
When search results are prepared
Then those Offers appear under one Product

### Scenario: Keep different Variants separate
Given two Products share a brand but differ in size, capacity, model, flavor, or pack count
When the Visitor searches for them
Then they remain separate Products

### Scenario: Do not force an uncertain Product Merge
Given Product identity or Variant information is insufficient to verify a match
When results are prepared
Then the Offers remain separate rather than being merged

### Scenario: Expand a Product to view Offers
Given a Product has Offers from multiple in-scope Merchants
When the Visitor expands its Product card
Then each Offer shows its Merchant and relevant buying details

### Scenario: Hide a missing or stale Price
Given an Offer has no Price or its last-checked date is not the same day it is shown
When the Product is displayed
Then the Price is hidden
And the Visitor is told to check the Merchant site or that the Price is unavailable

### Scenario: Zero-result fallback
Given a Query returns no Products
When the results page is shown
Then External Search Links are offered for the Chinese Search Term for every qualifying Platform
And Unmet Demand is recorded with Query, Locale, Market, and timestamp only

### Scenario: Correct a Chinese Search Term
Given TaiwanHaul suggests a Chinese Search Term for a Query
When the Visitor copies or edits the suggested term
Then the Visitor can use the corrected term for an External Search Link

### Scenario: Do not present a broken Outbound Link as valid
Given an Offer's Outbound Link is known to be broken
When the Offer is displayed
Then it is not presented as a valid way to reach that Merchant's Product page

### Scenario: Search service error
Given the search service fails or cannot return results
When the Visitor submits a Query
Then the page shows a clear error state
And does not present the failure as a successful zero-result search

### Scenario: Complete the journey on mobile
Given a Visitor is using a mobile device
When the Visitor searches, reviews a Product, and follows an available Outbound Link
Then the Visitor can complete those steps in the responsive interface

## Metrics

Establish a baseline only; no KPI targets are set.

- Search result coverage.
- Product-to-Merchant click-through rate.
- External Search fallback usage.
- Zero-result search demand.
- Query reformulation rate.
- Incorrect Product Merge rate.
- Broken Outbound Link rate.

## Open Product Decisions

- Which Platforms can provide structured Product data? This decides which Platforms get External Search Links.
- Privacy notice: controller Josh Wang, contact contact@taiwanhaul.com, retention set (Unmet Demand 90 days then counts only; contact emails 12 months after resolution; Workers logs at plan default). Remaining before publishing: Email Routing rule for contact@, legal review, translations. See section 7 of [docs/research/privacy-notice.md](research/privacy-notice.md).

## Related Documents

- [Project glossary](../CONTEXT.md)
- [Architecture](architecture.md)
- [ADR 0001: Search reads a pre-built index](adr/0001-search-reads-prebuilt-index.md)
- [ADR 0002: SPA without SSR](adr/0002-spa-without-ssr.md)
