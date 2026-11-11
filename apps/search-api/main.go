//go:build js && wasm

package main

import (
	"database/sql"
	"embed"
	"encoding/json"
	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/syumai/workers-go"
	"github.com/syumai/workers-go/cloudflare/d1"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"log"
	"net/http"
)

//go:embed search/terms.txt
var termsFile embed.FS

type searchService struct {
	db    *bun.DB
	terms map[string]string
}
type aliasModel struct {
	bun.BaseModel `bun:"table:aliases"`
	ProductID     string `bun:"product_id"`
	Locale        string `bun:"locale"`
	Alias         string `bun:"alias"`
}
type offerModel struct {
	bun.BaseModel `bun:"table:offers,alias:o"`
	ID            string  `bun:"id"`
	VariantID     string  `bun:"variant_id"`
	OutboundLink  string  `bun:"outbound_link"`
	Amount        *int64  `bun:"amount"`
	CheckedOn     *string `bun:"checked_on"`
	MerchantID    string  `bun:"merchant_id"`
	MerchantName  string  `bun:"merchant_name"`
	PlatformID    string  `bun:"platform_id"`
	PlatformName  string  `bun:"platform_name"`
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
	api.HandlerWithOptions(searchService{db: db, terms: parseTerms(string(data))}, api.StdHTTPServerOptions{BaseRouter: mux, ErrorHandlerFunc: func(w http.ResponseWriter, _ *http.Request, _ error) {
		writeJSON(w, http.StatusBadRequest, api.Error{Error: "invalid_request"})
	}})
	workers.Serve(mux)
}

func (s searchService) SearchProducts(w http.ResponseWriter, r *http.Request, params api.SearchProductsParams) {
	q, err := validateQuery(params.Q)
	if err != nil || !validLocale(string(params.Locale)) || !validMarket(string(params.Market)) {
		writeJSON(w, http.StatusBadRequest, api.Error{Error: "invalid_request"})
		return
	}
	found := dictionaryTerms(q, s.terms)
	results, aliases, err := s.search(r, q, found)
	if err != nil {
		log.Printf("search failed")
		writeJSON(w, http.StatusInternalServerError, api.Error{Error: "search_failed"})
		return
	}
	writeJSON(w, http.StatusOK, api.SearchResponse{Query: q, Locale: api.SearchResponseLocale(params.Locale), Market: api.SearchResponseMarket(params.Market), Results: results, SearchTerms: chineseTerms(q, results, aliases, found)})
}

func (s searchService) search(r *http.Request, q string, terms []string) ([]api.Product, map[string]string, error) {
	searchTerms := append([]string{q}, terms...)
	var rows []searchRow
	query := s.db.NewSelect().Model(&rows).
		Join("JOIN variants AS v ON v.product_id=p.id").
		Join("JOIN offers AS o ON o.variant_id=v.id").
		Join("JOIN merchants AS m ON m.id=o.merchant_id AND m.platform_operated=1").
		Join("LEFT JOIN aliases AS a ON a.product_id=p.id").
		ColumnExpr("p.id,p.brand,p.name,p.model,v.id AS variant_id,v.name AS variant_name").
		ColumnExpr("MIN(CASE WHEN p.name = ? COLLATE NOCASE OR a.alias = ? COLLATE NOCASE THEN 0 ELSE 1 END) AS exact", q, q).
		ColumnExpr("MIN(CASE WHEN instr(lower(p.brand),lower(?))>0 OR instr(lower(p.name),lower(?))>0 OR instr(lower(p.model),lower(?))>0 OR instr(lower(v.name),lower(?))>0 OR instr(lower(a.alias),lower(?))>0 THEN 0 ELSE 1 END) AS direct", q, q, q, q, q).
		Group("p.id", "v.id")
	query.WhereGroup("OR", func(qb *bun.SelectQuery) *bun.SelectQuery {
		first := true
		for _, term := range searchTerms {
			for _, field := range []string{"p.brand", "p.name", "p.model", "p.category", "v.name", "a.alias"} {
				condition := "instr(lower(" + field + "),lower(?)) > 0"
				if first {
					qb = qb.Where(condition, term)
					first = false
				} else {
					qb = qb.WhereOr(condition, term)
				}
			}
		}
		return qb
	})
	if err := query.Scan(r.Context()); err != nil {
		return nil, nil, err
	}
	sortSearchRows(rows)
	variantIDs := make([]string, 0, len(rows))
	productIDs := make([]string, 0, len(rows))
	seenProducts := make(map[string]bool)
	aliases := make(map[string]string)
	results := make([]api.Product, 0, len(rows))
	for _, row := range rows {
		variantIDs = append(variantIDs, row.VariantID)
		if !seenProducts[row.ID] {
			seenProducts[row.ID] = true
			productIDs = append(productIDs, row.ID)
		}
		results = append(results, api.Product{Id: row.ID, Brand: row.Brand, Name: row.Name, Model: row.Model, Variant: api.Variant{Id: row.VariantID, Name: row.VariantName}, Offers: []api.Offer{}})
	}
	if len(variantIDs) == 0 {
		return results, aliases, nil
	}
	var aliasRows []aliasModel
	err := s.db.NewSelect().Model(&aliasRows).
		Where("product_id IN (?)", bun.In(productIDs)).
		Where("locale = ?", "zh-TW").OrderExpr("product_id ASC").OrderExpr("alias ASC").Scan(r.Context())
	if err != nil {
		return nil, nil, err
	}
	for _, row := range aliasRows {
		if _, ok := aliases[row.ProductID]; !ok {
			aliases[row.ProductID] = row.Alias
		}
	}
	var offers []offerModel
	err = s.db.NewSelect().Model(&offers).
		Join("JOIN merchants AS m ON m.id=o.merchant_id AND m.platform_operated=1").
		Join("JOIN platforms AS pl ON pl.id=m.platform_id").
		ColumnExpr("o.id,o.variant_id,o.outbound_link,o.amount,o.checked_on,m.id AS merchant_id,m.name AS merchant_name,pl.id AS platform_id,pl.name AS platform_name").
		Where("o.variant_id IN (?)", bun.In(variantIDs)).OrderExpr("o.id ASC").Scan(r.Context())
	if err != nil {
		return nil, nil, err
	}
	byVariant := make(map[string][]api.Offer, len(variantIDs))
	for _, o := range offers {
		byVariant[o.VariantID] = append(byVariant[o.VariantID], api.Offer{Id: o.ID, OutboundLink: o.OutboundLink, Amount: o.Amount, CheckedOn: datePtr(o.CheckedOn), Merchant: api.Merchant{Id: o.MerchantID, Name: o.MerchantName, Platform: api.Platform{Id: o.PlatformID, Name: o.PlatformName}}})
	}
	for i := range results {
		results[i].Offers = byVariant[results[i].Variant.Id]
	}
	return results, aliases, nil
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
