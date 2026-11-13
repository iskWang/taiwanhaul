# Search API

## Local run

The Search API is bundled into the web Worker (`apps/web/worker/index.js`). From the repository root:

```sh
STATE=/tmp/taiwanhaul-state
CLOUDFLARE_ENV=staging bun run build   # builds the Go WASM first, then the web Worker
CFG=apps/web/dist/taiwanhaul/wrangler.json
bunx wrangler d1 execute DB --local --persist-to "$STATE" -c "$CFG" --file apps/search-api/migrations/0001_product_index.sql
bunx wrangler d1 execute DB --local --persist-to "$STATE" -c "$CFG" --file apps/search-api/testdata/fixture.sql
bunx wrangler dev -c "$CFG" --persist-to "$STATE"
```

In a second terminal:

```sh
curl -sS --get 'http://localhost:8787/api/search' --data-urlencode 'q=pineapple' -d locale=en -d market=SG
```

## Alias aggregation regression

In a separate local state, load `migrations/0001_product_index.sql`, `testdata/fixture.sql`, then `testdata/ranking.sql`. Search for `pineapple cake`: `p3`/`v4` matches exactly through one alias, while its other alias does not; it must still rank ahead of category-only `p4`/`v5`.
