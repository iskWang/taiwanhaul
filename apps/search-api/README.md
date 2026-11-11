# Search API

Run `make build`, apply `migrations/0001_product_index.sql` and `testdata/fixture.sql` to the local D1 state, then `make dev`. Query with `curl -sS --get 'http://localhost:8787/api/search' --data-urlencode 'q=pineapple' -d locale=en -d market=SG`.

# Local run

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
