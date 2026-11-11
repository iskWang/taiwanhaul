package main

import (
	"reflect"
	"strings"
	"testing"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
)

func TestQueryHelpers(t *testing.T) {
	terms := parseTerms("tea 茶\ntrà 茶\ngift 伴手禮\n")
	for _, tc := range []struct{ q string; want []string }{
		{"TEA gift", []string{"茶", "伴手禮"}},
		{"banh dua", []string{}},
	} {
		if got := dictionaryTerms(tc.q, terms); !reflect.DeepEqual(got, tc.want) { t.Fatalf("dictionaryTerms(%q)=%v want %v", tc.q, got, tc.want) }
	}
	for _, tc := range []struct{ q string; want []string }{
		{"tea", []string{"茶"}}, {"zzzz", []string{"zzzz"}}, {"鳳梨酥", []string{"鳳梨酥"}},
	} { if got:=chineseTerms(tc.q,nil,dictionaryTerms(tc.q,terms)); !reflect.DeepEqual(got,tc.want) { t.Fatalf("chineseTerms(%q)=%v want %v",tc.q,got,tc.want) } }
	if got:=escapeLike(`%_\\`); got!=`\%\_\\\\` { t.Fatalf("escapeLike=%q",got) }
	if !validLocale("zh-TW") || validLocale("xx") || !validMarket("SG") || validMarket("") { t.Fatal("enum validation failed") }
	if got:=asciiLower("PINEAPPLE Ä"); got!="pineapple Ä" { t.Fatalf("asciiLower=%q",got) }
	if !reflect.DeepEqual(chineseTerms("tea", []api.Product{{Id:"p1"}}, dictionaryTerms("tea",terms)), []string{"茶"}) { t.Fatal("result term fallback failed") }
	if strings.TrimSpace("   ") != "" { t.Fatal("trim sanity") }
}
