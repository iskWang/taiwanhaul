package search

import (
	"context"
	"database/sql"
	"strings"
)

type Product struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Brand    string `json:"brand"`
	Variant  string `json:"variant"`
	PriceTWD *int64 `json:"priceTwd"`
	NameEN   string `json:"-"`
	Aliases  []string `json:"-"`
}

type Response struct {
	Query   string    `json:"query"`
	Results []Product `json:"results"`
}

func NormalizeQuery(q string) string {
	q = strings.TrimSpace(q)
	runes := []rune(q)
	if len(runes) > 100 {
		q = string(runes[:100])
	}
	return q
}

func EscapeLike(q string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(q)
}

func Rank(query string, products []Product) []Product {
	q := strings.ToLower(strings.TrimSpace(query))
	out := make([]Product, len(products))
	copy(out, products)
	// Stable insertion sort keeps the original SQL ordering among equal ranks.
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && rankOf(q, out[j]) < rankOf(q, out[j-1]); j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	return out
}

func rankOf(q string, p Product) int {
	for _, name := range append([]string{p.Name, p.NameEN}, p.Aliases...) {
		if strings.EqualFold(strings.TrimSpace(name), q) {
			return 0
		}
	}
	return 1
}

func Query(ctx context.Context, db *sql.DB, query, locale string) ([]Product, error) {
	pattern := "%" + EscapeLike(query) + "%"
	rows, err := db.QueryContext(ctx, `
SELECT p.id, p.name_zh, p.name_en, p.brand, p.variant, p.price_twd,
       COALESCE(a.alias, '')
FROM products p
LEFT JOIN product_aliases a ON a.product_id = p.id AND a.locale = ?
WHERE p.name_zh LIKE ? ESCAPE '\' OR p.name_en LIKE ? ESCAPE '\'
   OR p.brand LIKE ? ESCAPE '\' OR p.variant LIKE ? ESCAPE '\'
   OR a.alias LIKE ? ESCAPE '\'
ORDER BY p.id`, locale, pattern, pattern, pattern, pattern, pattern)
	if err != nil { return nil, err }
	defer rows.Close()
	byID := make(map[int64]*Product)
	for rows.Next() {
		var p Product
		var alias string
		var nameZH string
		if err := rows.Scan(&p.ID, &nameZH, &p.NameEN, &p.Brand, &p.Variant, &p.PriceTWD, &alias); err != nil { return nil, err }
		p.Name = nameZH
		if locale == "en" { p.Name = p.NameEN }
		if current := byID[p.ID]; current != nil {
			if alias != "" { current.Aliases = append(current.Aliases, alias) }
			continue
		}
		if alias != "" { p.Aliases = []string{alias} }
		byID[p.ID] = &p
	}
	if err := rows.Err(); err != nil { return nil, err }
	products := make([]Product, 0, len(byID))
	for _, p := range byID {
		products = append(products, *p)
	}
	return Rank(query, products), nil
}
