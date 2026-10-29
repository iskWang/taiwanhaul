# TaiwanHaul

TaiwanHaul helps travelers from Southeast Asia discover Taiwanese products through multilingual search in their own language, with Chinese search terms and links to Taiwanese shops. TaiwanHaul is not a store and does not handle checkout, payments, or logistics.

All products, prices, exchange rates, search results, and recommendations are sample data today.

```mermaid
flowchart LR
  Visitor --> Preferences["Choose language and market"]
  Preferences --> Search["Search in own language"]
  Search --> Chinese["See Chinese search term"]
  Chinese --> Results["TaiwanHaul's curated products"]
  Results -->|or| Shops["External Search Links to Taiwanese shops"]
  Shops --> Contact["Contact TaiwanHaul for delivery help"]
```

## Quick start

```sh
bun install
cp .dev.vars.example .dev.vars
bun run dev
bun test
```

See the [documentation index](docs/README.md) for product rules, architecture, infrastructure, decisions, and research.
