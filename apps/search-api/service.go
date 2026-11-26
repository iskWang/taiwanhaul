package main

import (
	"embed"
	"encoding/json"
	"log"
	"net/http"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/uptrace/bun"
)

//go:embed search/terms.txt search/s2tw_chars.txt search/s2tw_phrases.txt
var searchAssets embed.FS

type searchService struct {
	db       *bun.DB
	terms    map[string]string
	s2tw     *s2twConverter
	searchFn func(r *http.Request, q, normalized string, terms []string) ([]api.Product, map[string]string, error)
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

func mustReadAsset(path string) string {
	data, err := searchAssets.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return string(data)
}

func newSearchService(db *bun.DB) searchService {
	return searchService{
		db:    db,
		terms: parseTerms(mustReadAsset("search/terms.txt")),
		s2tw:  newS2TWConverter(mustReadAsset("search/s2tw_chars.txt"), mustReadAsset("search/s2tw_phrases.txt")),
	}
}

func (s searchService) SearchProducts(w http.ResponseWriter, r *http.Request, params api.SearchProductsParams) {
	q, err := validateQuery(params.Q)
	if err != nil || !validLocale(string(params.Locale)) || !validMarket(string(params.Market)) {
		writeJSON(w, http.StatusBadRequest, api.Error{Error: "invalid_request"})
		return
	}
	normalized := s.s2tw.Convert(q)
	found := dictionaryTerms(q, s.terms)
	var (
		results []api.Product
		aliases map[string]string
	)
	if s.searchFn != nil {
		results, aliases, err = s.searchFn(r, q, normalized, found)
	} else {
		results, aliases, err = s.search(r, q, normalized, found)
	}
	if err != nil {
		log.Printf("search failed")
		writeJSON(w, http.StatusInternalServerError, api.Error{Error: "search_failed"})
		return
	}
	writeJSON(w, http.StatusOK, api.SearchResponse{
		Query:       q,
		Locale:      api.SearchResponseLocale(params.Locale),
		Market:      api.SearchResponseMarket(params.Market),
		Results:     results,
		SearchTerms: chineseTerms(q, normalized, results, aliases, found),
	})
}

func buildSearchQuery(db *bun.DB, q, normalized string, terms []string) *bun.SelectQuery {
	searchTerms := buildSearchTerms(q, normalized, terms)
	query := db.NewSelect().Model((*searchRow)(nil)).
		Join("JOIN variants AS v ON v.product_id=p.id").
		Join("JOIN offers AS o ON o.variant_id=v.id").
		Join("JOIN merchants AS m ON m.id=o.merchant_id AND m.platform_operated=1").
		Join("LEFT JOIN aliases AS a ON a.product_id=p.id").
		ColumnExpr("p.id,p.brand,p.name,p.model,v.id AS variant_id,v.name AS variant_name")
	if normalized != "" && normalized != q {
		query = query.
			ColumnExpr("MIN(CASE WHEN p.name = ? COLLATE NOCASE OR p.name = ? COLLATE NOCASE OR a.alias = ? COLLATE NOCASE OR a.alias = ? COLLATE NOCASE THEN 0 ELSE 1 END) AS exact", q, normalized, q, normalized).
			ColumnExpr("MIN(CASE WHEN instr(lower(p.brand),lower(?))>0 OR instr(lower(p.name),lower(?))>0 OR instr(lower(p.model),lower(?))>0 OR instr(lower(v.name),lower(?))>0 OR instr(lower(a.alias),lower(?))>0 OR instr(lower(p.brand),lower(?))>0 OR instr(lower(p.name),lower(?))>0 OR instr(lower(p.model),lower(?))>0 OR instr(lower(v.name),lower(?))>0 OR instr(lower(a.alias),lower(?))>0 THEN 0 ELSE 1 END) AS direct", q, q, q, q, q, normalized, normalized, normalized, normalized, normalized)
	} else {
		query = query.
			ColumnExpr("MIN(CASE WHEN p.name = ? COLLATE NOCASE OR a.alias = ? COLLATE NOCASE THEN 0 ELSE 1 END) AS exact", q, q).
			ColumnExpr("MIN(CASE WHEN instr(lower(p.brand),lower(?))>0 OR instr(lower(p.name),lower(?))>0 OR instr(lower(p.model),lower(?))>0 OR instr(lower(v.name),lower(?))>0 OR instr(lower(a.alias),lower(?))>0 THEN 0 ELSE 1 END) AS direct", q, q, q, q, q)
	}
	query = query.Group("p.id", "v.id")
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
	return query
}

func (s searchService) search(r *http.Request, q, normalized string, terms []string) ([]api.Product, map[string]string, error) {
	var rows []searchRow
	if err := buildSearchQuery(s.db, q, normalized, terms).Scan(r.Context(), &rows); err != nil {
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
		results = append(results, api.Product{
			Id:      row.ID,
			Brand:   row.Brand,
			Name:    row.Name,
			Model:   row.Model,
			Variant: api.Variant{Id: row.VariantID, Name: row.VariantName},
			Offers:  []api.Offer{},
		})
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
		byVariant[o.VariantID] = append(byVariant[o.VariantID], api.Offer{
			Id:           o.ID,
			OutboundLink: o.OutboundLink,
			Amount:       o.Amount,
			CheckedOn:    datePtr(o.CheckedOn),
			Merchant: api.Merchant{
				Id:       o.MerchantID,
				Name:     o.MerchantName,
				Platform: api.Platform{Id: o.PlatformID, Name: o.PlatformName},
			},
		})
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
