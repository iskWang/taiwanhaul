# Search API

## Local run

From `apps/search-api`:

```sh
STATE=.wrangler/fixture-state
rm -rf "$STATE"
make build
bunx wrangler d1 execute DB --local --persist-to "$STATE" -c wrangler.jsonc --file migrations/0001_product_index.sql
bunx wrangler d1 execute DB --local --persist-to "$STATE" -c wrangler.jsonc --file testdata/fixture.sql
bunx wrangler dev -c wrangler.jsonc --persist-to "$STATE"
```

In a second terminal:

```sh
curl -sS --get 'http://localhost:8787/api/search' --data-urlencode 'q=pineapple' -d locale=en -d market=SG
```

## Alias aggregation regression

In a separate local state, load `migrations/0001_product_index.sql`, `testdata/fixture.sql`, then `testdata/ranking.sql`. Search for `pineapple cake`: `p3`/`v4` matches exactly through one alias, while its other alias does not; it must still rank ahead of category-only `p4`/`v5`.
