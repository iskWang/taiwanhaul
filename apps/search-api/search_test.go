package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"testing"

	"github.com/iskWang/taiwanhaul/apps/search-api/api"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
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
	svc := newSearchService(nil)
	for _, tc := range []struct {
		q    string
		want []string
	}{
		{"tea", []string{"茶"}},
		{"zzzz", []string{"zzzz"}},
		{"鳳梨酥", []string{"鳳梨酥"}},
		{"凤梨酥", []string{"鳳梨酥"}},
		{"红烧牛肉泡面", []string{"紅燒牛肉泡麵"}},
		{"乌龙", []string{"烏龍"}},
		{"面膜", []string{"面膜"}},
	} {
		normalized := svc.s2tw.Convert(tc.q)
		if got := chineseTerms(tc.q, normalized, nil, nil, dictionaryTerms(tc.q, dictionary)); !reflect.DeepEqual(got, tc.want) {
			t.Fatalf("chineseTerms(%q)=%v, want %v", tc.q, got, tc.want)
		}
	}
	products := []api.Product{{Id: "p1"}, {Id: "p1"}, {Id: "p2"}}
	aliases := map[string]string{"p1": "鳳梨酥", "p2": "鳳梨酥禮盒"}
	if got := chineseTerms("pineapple", "pineapple", products, aliases, nil); !reflect.DeepEqual(got, []string{"鳳梨酥", "鳳梨酥禮盒"}) {
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

func TestValidLocale(t *testing.T) {
	for _, tc := range []struct {
		locale string
		want   bool
	}{
		{"en", true},
		{"zh-TW", true},
		{"zh-CN", true},
		{"th", true},
		{"vi", true},
		{"ms", true},
		{"fil", true},
		{"xx", false},
	} {
		if got := validLocale(tc.locale); got != tc.want {
			t.Fatalf("validLocale(%q)=%v, want %v", tc.locale, got, tc.want)
		}
	}
}

func TestS2TWConverter(t *testing.T) {
	svc := newSearchService(nil)
	for _, tc := range []struct {
		input string
		want  string
	}{
		{"凤梨酥", "鳳梨酥"},
		{"时钟", "時鐘"},
		{"闹钟", "鬧鐘"},
		{"钟表", "鐘錶"},
		{"挂钟", "掛鐘"},
		{"座钟", "座鐘"},
		{"壁钟", "壁鐘"},
		{"钟点", "鐘點"},
		{"红烧牛肉泡面", "紅燒牛肉泡麵"},
		{"红烧牛肉面", "紅燒牛肉麵"},
		{"乌龙", "烏龍"},
		{"高山乌龙茶", "高山烏龍茶"},
		{"面膜", "面膜"},
		{"保湿面膜", "保濕面膜"},
		{"爱文芒果干", "愛文芒果乾"},
		{"干贝酱", "干貝醬"},
		{"豆干", "豆干"},
		{"肉松蛋卷", "肉鬆蛋捲"},
		{"洗发水", "洗髮水"},
		{"黑糖姜茶", "黑糖薑茶"},
		{"台湾伴手礼", "台灣伴手禮"},
		{"台中太阳饼", "台中太陽餅"},
		{"阿里山高山茶", "阿里山高山茶"},
		{"维格饼家", "維格餅家"},
		{"糖村牛轧糖", "糖村牛軋糖"},
		{"香葱牛轧饼", "香蔥牛軋餅"},
		{"taiwan 凤梨酥", "taiwan 鳳梨酥"},
		{"pineapple cake", "pineapple cake"},
		{"bánh dứa", "bánh dứa"},
	} {
		got := svc.s2tw.Convert(tc.input)
		if got != tc.want {
			t.Fatalf("Convert(%q)=%q, want %q", tc.input, got, tc.want)
		}
		if tc.input == "面膜" && got == "麵膜" {
			t.Fatalf("Convert(%q) must not convert 面膜 to 麵膜", tc.input)
		}
	}

	for _, trad := range []string{"鳳梨酥", "台灣", "台中", "阿里山", "面膜", "干貝", "紅燒牛肉泡麵", "高山烏龍茶"} {
		if got := svc.s2tw.Convert(trad); got != trad {
			t.Fatalf("idempotency failed for %q: got %q", trad, got)
		}
	}
}

func TestBuildSearchQuerySQL(t *testing.T) {
	db := bun.NewDB(nil, sqlitedialect.New())
	sqlStr := buildSearchQuery(db, "红烧牛肉泡面", "紅燒牛肉泡麵", nil).String()
	fromIdx := strings.Index(sqlStr, "FROM ")
	whereIdx := strings.Index(sqlStr, "WHERE ")
	if fromIdx < 0 || whereIdx < 0 {
		t.Fatalf("unexpected SQL shape: %s", sqlStr)
	}
	selectCols := sqlStr[:fromIdx]
	whereClause := sqlStr[whereIdx:]
	for _, needle := range []string{"红烧牛肉泡面", "紅燒牛肉泡麵"} {
		if !strings.Contains(selectCols, needle) {
			t.Fatalf("select ranking expressions missing %q: %s", needle, selectCols)
		}
		if !strings.Contains(whereClause, needle) {
			t.Fatalf("WHERE clause missing %q: %s", needle, whereClause)
		}
	}
	if !strings.Contains(selectCols, "AS exact") || !strings.Contains(selectCols, "AS direct") {
		t.Fatalf("expected exact and direct ranking columns: %s", selectCols)
	}
}

func TestSearchProductsAPI(t *testing.T) {
	type fixtureProduct struct {
		id       string
		brand    string
		name     string
		category string
		variant  string
		zhAlias  string
		aliases  []string
	}
	fixture := []fixtureProduct{
		{id: "p1", brand: "Example Bakery", name: "鳳梨酥", category: "food", variant: "10 入", zhAlias: "鳳梨酥", aliases: []string{"pineapple cake", "鳳梨酥"}},
		{id: "p2", brand: "Example Bakery", name: "鳳梨酥禮盒", category: "food", variant: "12 入", zhAlias: "鳳梨酥禮盒", aliases: []string{"pineapple cake box", "鳳梨酥禮盒"}},
		{id: "p3", brand: "Example Noodle", name: "紅燒牛肉泡麵", category: "food", variant: "5 包", zhAlias: "紅燒牛肉泡麵", aliases: []string{"instant braised beef noodles", "紅燒牛肉泡麵"}},
		{id: "p4", brand: "Example Tea", name: "高山烏龍茶", category: "tea", variant: "150 克", zhAlias: "高山烏龍茶", aliases: []string{"high-mountain oolong tea", "高山烏龍茶"}},
		{id: "p5", brand: "Example Beauty", name: "保濕面膜", category: "beauty", variant: "10 片裝", zhAlias: "保濕面膜", aliases: []string{"sheet mask", "保濕面膜"}},
	}

	svc := newSearchService(nil)
	svc.searchFn = func(_ *http.Request, q, normalized string, dictTerms []string) ([]api.Product, map[string]string, error) {
		searchTerms := buildSearchTerms(q, normalized, dictTerms)
		qCandidates := []string{q}
		if normalized != "" && normalized != q {
			qCandidates = append(qCandidates, normalized)
		}

		var rows []searchRow
		byID := make(map[string]fixtureProduct, len(fixture))
		for _, p := range fixture {
			byID[p.id] = p
			fields := append([]string{p.brand, p.name, p.category, p.variant}, p.aliases...)
			matched := false
			for _, term := range searchTerms {
				lowTerm := strings.ToLower(term)
				for _, field := range fields {
					if strings.Contains(strings.ToLower(field), lowTerm) {
						matched = true
						break
					}
				}
				if matched {
					break
				}
			}
			if !matched {
				continue
			}

			exact, direct := 1, 1
			for _, cand := range qCandidates {
				if strings.EqualFold(p.name, cand) {
					exact = 0
				}
				for _, a := range p.aliases {
					if strings.EqualFold(a, cand) {
						exact = 0
					}
				}
				lowCand := strings.ToLower(cand)
				for _, field := range []string{p.brand, p.name, p.variant} {
					if strings.Contains(strings.ToLower(field), lowCand) {
						direct = 0
					}
				}
				for _, a := range p.aliases {
					if strings.Contains(strings.ToLower(a), lowCand) {
						direct = 0
					}
				}
			}

			rows = append(rows, searchRow{
				ID:          p.id,
				Brand:       p.brand,
				Name:        p.name,
				VariantID:   p.id + "-v1",
				VariantName: p.variant,
				Exact:       exact,
				Direct:      direct,
			})
		}

		sortSearchRows(rows)
		results := make([]api.Product, 0, len(rows))
		aliases := make(map[string]string, len(rows))
		for _, row := range rows {
			p := byID[row.ID]
			aliases[row.ID] = p.zhAlias
			results = append(results, api.Product{
				Id:      row.ID,
				Brand:   row.Brand,
				Name:    row.Name,
				Model:   row.Model,
				Variant: api.Variant{Id: row.VariantID, Name: row.VariantName},
				Offers: []api.Offer{{
					Id:           row.ID + "-o1",
					OutboundLink: "https://example.com/" + row.ID,
					Merchant:     api.Merchant{Id: "m1", Name: p.brand, Platform: api.Platform{Id: "pf1", Name: "Official"}},
				}},
			})
		}
		return results, aliases, nil
	}

	mux := http.NewServeMux()
	handler := api.HandlerWithOptions(svc, api.StdHTTPServerOptions{BaseRouter: mux})

	callAPI := func(q, locale string) api.SearchResponse {
		req := httptest.NewRequest(http.MethodGet, "/api/search?q="+url.QueryEscape(q)+"&locale="+url.QueryEscape(locale)+"&market=SG", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET /api/search q=%q status=%d body=%s", q, rec.Code, rec.Body.String())
		}
		var resp api.SearchResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("unmarshal response for q=%q: %v", q, err)
		}
		return resp
	}

	pineapple := callAPI("凤梨酥", "zh-CN")
	if pineapple.Query != "凤梨酥" {
		t.Fatalf("query=%q, want 凤梨酥", pineapple.Query)
	}
	if !reflect.DeepEqual(pineapple.SearchTerms, []string{"鳳梨酥"}) {
		t.Fatalf("searchTerms=%v, want [鳳梨酥]", pineapple.SearchTerms)
	}
	if len(pineapple.Results) < 2 || pineapple.Results[0].Id != "p1" || pineapple.Results[0].Name != "鳳梨酥" {
		t.Fatalf("expected 鳳梨酥 (p1) ranked first, got %+v", pineapple.Results)
	}

	noodles := callAPI("红烧牛肉泡面", "zh-CN")
	if noodles.Query != "红烧牛肉泡面" {
		t.Fatalf("query=%q, want 红烧牛肉泡面", noodles.Query)
	}
	if !reflect.DeepEqual(noodles.SearchTerms, []string{"紅燒牛肉泡麵"}) {
		t.Fatalf("searchTerms=%v, want [紅燒牛肉泡麵]", noodles.SearchTerms)
	}
	if len(noodles.Results) != 1 || noodles.Results[0].Id != "p3" {
		t.Fatalf("expected 紅燒牛肉泡麵 (p3), got %+v", noodles.Results)
	}

	oolong := callAPI("乌龙", "zh-CN")
	if !reflect.DeepEqual(oolong.SearchTerms, []string{"烏龍"}) {
		t.Fatalf("searchTerms=%v, want [烏龍]", oolong.SearchTerms)
	}
	if len(oolong.Results) != 1 || oolong.Results[0].Id != "p4" {
		t.Fatalf("expected 高山烏龍茶 (p4), got %+v", oolong.Results)
	}

	mask := callAPI("面膜", "zh-CN")
	if !reflect.DeepEqual(mask.SearchTerms, []string{"面膜"}) || mask.SearchTerms[0] == "麵膜" {
		t.Fatalf("searchTerms=%v, want [面膜] and never 麵膜", mask.SearchTerms)
	}
	if len(mask.Results) != 1 || mask.Results[0].Id != "p5" {
		t.Fatalf("expected 保濕面膜 (p5), got %+v", mask.Results)
	}

	enPineapple := callAPI("pineapple cake", "en")
	if !reflect.DeepEqual(enPineapple.SearchTerms, []string{"鳳梨酥", "鳳梨酥禮盒"}) {
		t.Fatalf("en searchTerms=%v, want [鳳梨酥 鳳梨酥禮盒]", enPineapple.SearchTerms)
	}
	if len(enPineapple.Results) != 2 || enPineapple.Results[0].Id != "p1" {
		t.Fatalf("expected p1 ranked first for pineapple cake, got %+v", enPineapple.Results)
	}
}
