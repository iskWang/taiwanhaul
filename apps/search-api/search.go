package main

import (
	"sort"
	"strings"
	"unicode"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/oapi-codegen/runtime/types"
)

var resultAlias = map[string]string{}

func parseTerms(input string) map[string]string {
	terms := make(map[string]string)
	for _, line := range strings.Split(input, "\n") {
		fields := strings.Fields(line)
		if len(fields) == 2 {
			terms[asciiLower(fields[0])] = fields[1]
		}
	}
	return terms
}
func dictionaryTerms(query string, dictionary map[string]string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, word := range strings.Fields(query) {
		if chinese, ok := dictionary[asciiLower(word)]; ok && !seen[chinese] {
			seen[chinese] = true
			result = append(result, chinese)
		}
	}
	return result
}
func chineseTerms(query string, results []api.Product, found []string) []string {
	for _, r := range query {
		if unicode.In(r, unicode.Han) {
			return []string{query}
		}
	}
	seen := make(map[string]bool)
	terms := make([]string, 0, 4)
	products := make(map[string]bool)
	for _, result := range results {
		if products[result.Id] {
			continue
		}
		products[result.Id] = true
		if len(products) > 3 {
			break
		}
		if alias := resultAlias[result.Id]; alias != "" && !seen[alias] {
			seen[alias] = true
			terms = append(terms, alias)
		}
	}
	for _, term := range found {
		if !seen[term] {
			seen[term] = true
			terms = append(terms, term)
		}
	}
	if len(terms) == 0 {
		return []string{query}
	}
	return terms
}
func asciiLower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + ('a' - 'A')
		}
	}
	return string(b)
}
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
func validLocale(s string) bool {
	switch s {
	case "en", "zh-TW", "th", "vi", "ms", "fil":
		return true
	}
	return false
}
func validMarket(s string) bool {
	switch s {
	case "SG", "MY", "TH", "VN", "PH":
		return true
	}
	return false
}
func datePtr(s *string) *types.Date {
	if s == nil {
		return nil
	}
	var d types.Date
	if d.UnmarshalText([]byte(*s)) != nil {
		return nil
	}
	return &d
}
func rankCandidates(c []searchCandidate) {
	sort.Slice(c, func(i, j int) bool {
		if c[i].exact != c[j].exact {
			return c[i].exact
		}
		if c[i].direct != c[j].direct {
			return c[i].direct
		}
		if c[i].productID != c[j].productID {
			return c[i].productID < c[j].productID
		}
		return c[i].variantID < c[j].variantID
	})
}

type searchCandidate struct {
	productID, variantID string
	exact, direct        bool
}
