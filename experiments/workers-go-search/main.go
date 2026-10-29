//go:build js && wasm

package main

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/syumai/workers-go"
	"github.com/syumai/workers-go/cloudflare/d1"
	"github.com/iskWang/taiwanhaul/experiments/workers-go-search/search"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/search", func(w http.ResponseWriter, r *http.Request) {
		q := search.NormalizeQuery(r.URL.Query().Get("q"))
		if q == "" { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "q is required"}); return }
		connector, err := d1.OpenConnector("DB")
		if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database unavailable"}); return }
		db := sql.OpenDB(connector)
		defer db.Close()
		results, err := search.Query(r.Context(), db, q, r.URL.Query().Get("locale"))
		if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "search failed"}); return }
		writeJSON(w, http.StatusOK, search.Response{Query: q, Results: results})
	})
	workers.Serve(mux)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
