//go:build js && wasm

package main

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/iskWang/taiwanhaul/apps/search-api/search"
	"github.com/syumai/workers-go"
	"github.com/syumai/workers-go/cloudflare/d1"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type product struct {
	bun.BaseModel `bun:"table:products,alias:p"`
	ID            string `bun:"id"`
	Brand         string `bun:"brand"`
	Name          string `bun:"name"`
	Model         string `bun:"model"`
	Category      string `bun:"category"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/search", func(w http.ResponseWriter, r *http.Request) {
		q := search.NormalizeQuery(r.URL.Query().Get("q"))
		if q == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "q is required"})
			return
		}
		connector, err := d1.OpenConnector("DB")
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database unavailable"})
			return
		}
		db := bun.NewDB(sql.OpenDB(connector), sqlitedialect.New())
		defer db.Close()
		var result product
		if err := db.NewSelect().Model(&result).Join("JOIN aliases AS a ON a.product_id = p.id").Where("p.name LIKE ? OR a.alias LIKE ?", "%"+q+"%", "%"+q+"%").Limit(1).Scan(r.Context()); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "search failed"})
			return
		}
		writeJSON(w, http.StatusOK, result)
	})
	workers.Serve(mux)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
