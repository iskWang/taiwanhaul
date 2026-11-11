package main

import (
	"reflect"
	"strings"
	"testing"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
)

func TestValidateQuery(t *testing.T) {
	for _, tc := range []struct {
		input string
		valid bool
	}{
		{"  pineapple  ", true}, {"", false}, {"   ", false}, {strings.Repeat("a", 200), true}, {strings.Repeat("a", 201), false}, {strings.Repeat("😀", 100), true}, {strings.Repeat("😀", 101), false},
	} {
		got, err := validateQuery(tc.input)
		if (err == nil) != tc.valid {
			t.Fatalf("validateQuery(%q): err=%v", tc.input, err)
		}
		if tc.valid && got != strings.TrimSpace(tc.input) {
			t.Fatalf("query=%q", got)
		}
	}
}

func TestDictionaryAndSearchTerms(t *testing.T) {
	dictionary := parseTerms("tea 茶\ntrà 茶\ngift 伴手禮\n")
	if got := dictionaryTerms("TEA gift", dictionary); !reflect.DeepEqual(got, []string{"茶", "伴手禮"}) {
		t.Fatalf("dictionaryTerms=%v", got)
	}
	if got := dictionaryTerms("banh dua", dictionary); len(got) != 0 {
		t.Fatalf("dictionaryTerms=%v", got)
	}
	for _, tc := range []struct {
		q    string
		want []string
	}{{"tea", []string{"茶"}}, {"zzzz", []string{"zzzz"}}, {"鳳梨酥", []string{"鳳梨酥"}}} {
		if got := chineseTerms(tc.q, nil, nil, dictionaryTerms(tc.q, dictionary)); !reflect.DeepEqual(got, tc.want) {
			t.Fatalf("chineseTerms(%q)=%v", tc.q, got)
		}
	}
	products := []api.Product{{Id: "p1"}, {Id: "p1"}, {Id: "p2"}}
	aliases := map[string]string{"p1": "鳳梨酥", "p2": "鳳梨酥禮盒"}
	if got := chineseTerms("pineapple", products, aliases, nil); !reflect.DeepEqual(got, []string{"鳳梨酥", "鳳梨酥禮盒"}) {
		t.Fatalf("alias terms=%v", got)
	}
}

func TestSearchRowOrderAcrossAliases(t *testing.T) {
	// Product "Pineapple Cake Box" has aliases "pineapple cake" and "bánh dứa".
	// MIN(exact) must keep it in the exact tier despite the second joined alias.
	rows := []searchRow{
		{ID: "p2", Name: "Pineapple Cake Box", VariantID: "v1", Exact: 0, Direct: 0},
		{ID: "p1", Name: "Another Product", VariantID: "v2", Exact: 1, Direct: 0},
	}
	sortSearchRows(rows)
	if rows[0].ID != "p2" || rows[0].Exact != 0 {
		t.Fatalf("exact alias match not first: %+v", rows)
	}
	if rows[1].ID != "p1" {
		t.Fatalf("row order=%+v", rows)
	}
}
