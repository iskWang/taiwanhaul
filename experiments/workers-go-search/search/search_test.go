package search

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeQueryAndRank(t *testing.T) {
	cases := []struct { name, input, want string }{
		{"empty", "", ""}, {"whitespace", "  \t ", ""}, {"wildcard percent", "%", "%"},
		{"wildcard underscore", "_", "_"}, {"SQL-looking text", "'; DROP TABLE", "'; DROP TABLE"},
		{"limit", strings.Repeat("x", 200), strings.Repeat("x", 100)}, {"mixed zh/en", "鳳梨酥 pineapple cake", "鳳梨酥 pineapple cake"},
	}
	for _, tc := range cases { t.Run(tc.name, func(t *testing.T) { if got := NormalizeQuery(tc.input); got != tc.want { t.Fatalf("NormalizeQuery()=%q want %q", got, tc.want) } }) }
	products := []Product{
		{ID: 1, Name: "鳳梨酥", NameEN: "Pineapple Cake", Aliases: []string{"pineapple cake"}},
		{ID: 2, Name: "鳳梨酥禮盒", NameEN: "Pineapple Cake Gift Box"},
	}
	got := Rank("pineapple cake", products)
	if got[0].ID != 1 || got[1].ID != 2 { t.Fatalf("rank order = %d,%d", got[0].ID, got[1].ID) }
	if got := EscapeLike(`%_\\`); got != `\%\_\\\\` { t.Fatalf("EscapeLike()=%q", got) }
}
func TestEmptyResultsMarshalAsArray(t *testing.T) {
	body, err := json.Marshal(Response{Query: "%", Results: Rank("%", nil)})
	if err != nil { t.Fatal(err) }
	if string(body) != `{"query":"%","results":[]}` { t.Fatalf("JSON = %s", body) }
}
