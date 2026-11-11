//go:build js && wasm

package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"net/http"
	"strings"
	"unicode/utf16"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/syumai/workers-go"
	"github.com/syumai/workers-go/cloudflare/d1"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

//go:embed search/terms.txt
var termsFile embed.FS

type searchService struct {
	db    *bun.DB
	terms map[string]string
}

type offerRow struct {
	ID           string  `bun:"id"`
	OutboundLink string  `bun:"outbound_link"`
	Amount       *int64  `bun:"amount"`
	CheckedOn    *string `bun:"checked_on"`
	MerchantID   string  `bun:"merchant_id"`
	MerchantName string  `bun:"merchant_name"`
	PlatformID   string  `bun:"platform_id"`
	PlatformName string  `bun:"platform_name"`
}

func main() {
	connector, err := d1.OpenConnector("DB")
	if err != nil {
		panic(err)
	}
	db := bun.NewDB(sql.OpenDB(connector), sqlitedialect.New())
	defer db.Close()
	data, err := termsFile.ReadFile("search/terms.txt")
	if err != nil {
		panic(err)
	}
	mux := http.NewServeMux()
	api.HandlerFromMux(searchService{db: db, terms: parseTerms(string(data))}, mux)
	workers.Serve(mux)
}

func (s searchService) SearchProducts(w http.ResponseWriter, r *http.Request, params api.SearchProductsParams) {
	q := strings.TrimSpace(params.Q)
	if q == "" || len(utf16.Encode([]rune(q))) > 200 || !validLocale(string(params.Locale)) || !validMarket(string(params.Market)) {
		writeJSON(w, http.StatusBadRequest, api.Error{Error: "invalid_request"})
		return
	}
	terms := dictionaryTerms(q, s.terms)
	results, err := s.search(r, q, terms)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, api.Error{Error: "search_failed"})
		return
	}
	writeJSON(w, http.StatusOK, api.SearchResponse{Query: q, Locale: api.SearchResponseLocale(params.Locale), Market: api.SearchResponseMarket(params.Market), Results: results, SearchTerms: chineseTerms(q, results, terms)})
}

func (s searchService) search(r *http.Request, q string, terms []string) ([]api.Product, error) {
	type candidate struct {
		ProductID   string `bun:"product_id"`
		Brand       string `bun:"brand"`
		Name        string `bun:"name"`
		Model       string `bun:"model"`
		VariantID   string `bun:"variant_id"`
		VariantName string `bun:"variant_name"`
		Aliases     string `bun:"aliases"`
		Exact       int    `bun:"exact"`
		Direct      int    `bun:"direct"`
	}
	fields := []string{"p.brand", "p.name", "p.model", "p.category", "v.name", "a.alias"}
	patterns := []string{"%" + escapeLike(q) + "%"}
	for _, term := range terms {
		patterns = append(patterns, "%"+escapeLike(term)+"%")
	}
	conditions := make([]string, 0, len(fields)*len(patterns))
	for range patterns {
		for _, field := range fields {
			conditions = append(conditions, field+" LIKE ? ESCAPE '\\'")
		}
	}
	args := make([]any, 0, len(conditions))
	for _, pattern := range patterns {
		for range fields {
			args = append(args, pattern)
		}
	}
	var rows []candidate
	err := s.db.NewSelect().TableExpr("products AS p").
		Join("JOIN variants AS v ON v.product_id = p.id").
		Join("JOIN offers AS o ON o.variant_id = v.id").
		Join("JOIN merchants AS m ON m.id = o.merchant_id AND m.platform_operated = 1").
		Join("LEFT JOIN aliases AS a ON a.product_id = p.id").
		ColumnExpr("p.id AS product_id,p.brand,p.name,p.model,v.id AS variant_id,v.name AS variant_name,(SELECT group_concat(alias,char(31)) FROM (SELECT alias FROM aliases WHERE product_id=p.id AND locale='zh-TW' ORDER BY alias)) AS aliases").
		ColumnExpr("CASE WHEN p.name = ? COLLATE NOCASE OR a.alias = ? COLLATE NOCASE THEN 0 ELSE 1 END AS exact", q, q).
		ColumnExpr("CASE WHEN p.brand LIKE ? ESCAPE '\\' OR p.name LIKE ? ESCAPE '\\' OR p.model LIKE ? ESCAPE '\\' OR v.name LIKE ? ESCAPE '\\' OR a.alias LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END AS direct", "%"+escapeLike(q)+"%", "%"+escapeLike(q)+"%", "%"+escapeLike(q)+"%", "%"+escapeLike(q)+"%", "%"+escapeLike(q)+"%").
		WhereGroup("OR", func(query *bun.SelectQuery) *bun.SelectQuery {
			for i, c := range conditions {
				if i == 0 {
					query = query.Where(c, args[i])
				} else {
					query = query.WhereOr(c, args[i])
				}
			}
			return query
		}).
		Group("p.id", "v.id").OrderExpr("exact,direct,p.id,v.id").Scan(r.Context(), &rows)
	if err != nil {
		return nil, err
	}
	aliasesByProduct := make(map[string]string)
	for _, row := range rows {
		aliases := strings.Split(row.Aliases, string(rune(31)))
		if len(aliases) > 0 && aliases[0] != "" {
			aliasesByProduct[row.ProductID] = aliases[0]
		}
	}
	for id, alias := range aliasesByProduct {
		resultAlias[id] = alias
	}
	results := make([]api.Product, 0, len(rows))
	for _, row := range rows {
		var offers []offerRow
		err := s.db.NewSelect().TableExpr("offers AS o").
			Join("JOIN merchants AS m ON m.id=o.merchant_id AND m.platform_operated=1").
			Join("JOIN platforms AS pl ON pl.id=m.platform_id").
			ColumnExpr("o.id,o.outbound_link,o.amount,o.checked_on,m.id AS merchant_id,m.name AS merchant_name,pl.id AS platform_id,pl.name AS platform_name").
			Where("o.variant_id = ?", row.VariantID).OrderExpr("o.id ASC").Scan(r.Context(), &offers)
		if err != nil {
			return nil, err
		}
		out := make([]api.Offer, 0, len(offers))
		for _, o := range offers {
			out = append(out, api.Offer{Id: o.ID, OutboundLink: o.OutboundLink, Amount: o.Amount, CheckedOn: datePtr(o.CheckedOn), Merchant: api.Merchant{Id: o.MerchantID, Name: o.MerchantName, Platform: api.Platform{Id: o.PlatformID, Name: o.PlatformName}}})
		}
		results = append(results, api.Product{Id: row.ProductID, Brand: row.Brand, Name: row.Name, Model: row.Model, Variant: api.Variant{Id: row.VariantID, Name: row.VariantName}, Offers: out})
	}
	return results, nil
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
