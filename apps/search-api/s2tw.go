package main

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

type s2twConverter struct {
	chars        map[rune]rune
	phrases      map[string]string
	maxPhraseLen int
}

func parseS2TWChars(input string) map[rune]rune {
	chars := make(map[rune]rune)
	for _, line := range strings.Split(input, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		src := []rune(fields[0])
		dst := []rune(fields[1])
		if len(src) == 1 && len(dst) == 1 {
			chars[src[0]] = dst[0]
		}
	}
	return chars
}

func parseS2TWPhrases(input string) (map[string]string, int) {
	phrases := make(map[string]string)
	maxLen := 0
	for _, line := range strings.Split(input, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		srcLen := utf8.RuneCountInString(fields[0])
		if srcLen >= 2 {
			phrases[fields[0]] = fields[1]
			if srcLen > maxLen {
				maxLen = srcLen
			}
		}
	}
	return phrases, maxLen
}

func newS2TWConverter(charsData, phrasesData string) *s2twConverter {
	phrases, maxLen := parseS2TWPhrases(phrasesData)
	return &s2twConverter{
		chars:        parseS2TWChars(charsData),
		phrases:      phrases,
		maxPhraseLen: maxLen,
	}
}

func containsHan(s string) bool {
	for _, r := range s {
		if unicode.In(r, unicode.Han) {
			return true
		}
	}
	return false
}

// Convert normalizes Simplified Chinese text to Taiwan Traditional Chinese
// using phrase-first longest matching followed by single-character mapping.
func (c *s2twConverter) Convert(input string) string {
	if c == nil || input == "" || !containsHan(input) {
		return input
	}
	runes := []rune(input)
	var b strings.Builder
	b.Grow(len(input))
	for i := 0; i < len(runes); {
		matched := false
		limit := c.maxPhraseLen
		if rem := len(runes) - i; rem < limit {
			limit = rem
		}
		for l := limit; l >= 2; l-- {
			cand := string(runes[i : i+l])
			if repl, ok := c.phrases[cand]; ok {
				b.WriteString(repl)
				i += l
				matched = true
				break
			}
		}
		if matched {
			continue
		}
		r := runes[i]
		if repl, ok := c.chars[r]; ok {
			b.WriteRune(repl)
		} else {
			b.WriteRune(r)
		}
		i++
	}
	return b.String()
}
