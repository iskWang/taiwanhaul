# workers-go Search API PoC

This experiment serves `GET /api/search?q=<query>&locale=<locale>` with Cloudflare D1. It is not the production search backend.

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

`wrangler.jsonc` uses the placeholder D1 `database_id` `local`; these commands use Wrangler's local D1 database in its own state directory.


## Build measurements

Measured on the current development machine with Go 1.27.3 and workers-go v0.36.0. The first full `GOPROXY=off make build` took 3.11 s wall time. Artifact sizes are from the acceptance-oracle build.

| Measurement | Result | Workers limit |
|---|---:|---:|
| WASM raw | 7,722,513 bytes | — |
| WASM gzip (`gzip -9`) | 2,116,099 bytes | 3 MiB free / 10 MiB paid, compressed |
| Initial build wall time | 3.11 s | — |
| Warm local request latency | 5–7 ms | Local Miniflare only |
| First local request latency | 50 ms | Local Miniflare + local D1 only |

The compressed WASM is under the free-tier compressed-size limit. The local timings are not production measurements or production cold-start estimates. A SQL-injection-looking query returned HTTP 200 with empty results, and the D1 table survived.

## D1 features exercised

`database/sql` via `d1.OpenConnector("DB")`, parameterized `QueryContext`, `Rows.Scan`, and nullable `price_twd` scan into `*int64`. This PoC does not use transactions; workers-go D1 does not currently support them. The driver is marked alpha in workers-go v0.36.0.

## Risks

- The workers-go D1 driver is alpha. Its transaction API explicitly returns unsupported errors.
- Local `wrangler dev` with local D1 was tested; timings and SQL-injection result are local Miniflare observations only.
- Search uses SQL `LIKE`, so matching is substring-based and depends on SQLite collation behavior; the Go ranking only promotes exact name/alias matches.
- This PoC has only five demonstration records and no production data ingestion, pagination, or rate limiting.
