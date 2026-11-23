//go:build js && wasm

package main

import (
	"database/sql"
	"net/http"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/syumai/workers-go"
	"github.com/syumai/workers-go/cloudflare/d1"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func main() {
	connector, err := d1.OpenConnector("DB")
	if err != nil {
		panic(err)
	}
	db := bun.NewDB(sql.OpenDB(connector), sqlitedialect.New())
	defer db.Close()
	mux := http.NewServeMux()
	api.HandlerWithOptions(newSearchService(db), api.StdHTTPServerOptions{
		BaseRouter: mux,
		ErrorHandlerFunc: func(w http.ResponseWriter, _ *http.Request, _ error) {
			writeJSON(w, http.StatusBadRequest, api.Error{Error: "invalid_request"})
		},
	})
	workers.Serve(mux)
}
