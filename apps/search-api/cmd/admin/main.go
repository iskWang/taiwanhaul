package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

type migration struct {
	Version int    `json:"version"`
	Name    string `json:"name"`
	SQL     string `json:"sql"`
}

type migrateRequest struct {
	Migrations []migration `json:"migrations"`
}

type tableRows map[string][]map[string]json.RawMessage

var migrationFile = regexp.MustCompile(`^(\d+)_([^/]+)\.sql$`)

func main() {
	if err := run(os.Args[1:], os.Getenv, os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, err)
		if errors.Is(err, errUsage) || errors.Is(err, errConfig) {
			os.Exit(2)
		}
		os.Exit(1)
	}
}

var (
	errUsage  = errors.New("usage error")
	errConfig = errors.New("configuration error")
)

func run(args []string, getenv func(string) string, stdout, stderr io.Writer) error {
	return runWithClient(args, getenv, stdout, stderr, nil)
}

func runWithClient(args []string, getenv func(string) string, stdout, stderr io.Writer, client *http.Client) error {
	if len(args) == 0 || (args[0] != "migrate" && args[0] != "seed") {
		return fmt.Errorf("%w: expected migrate or seed", errUsage)
	}
	command := args[0]
	endpoint, cert, key, err := clientConfig(getenv)
	if err != nil {
		return err
	}
	var payload []byte
	switch command {
	case "migrate":
		if len(args) > 2 {
			return fmt.Errorf("%w: admin migrate [dir]", errUsage)
		}
		dir := "migrations"
		if len(args) == 2 {
			dir = args[1]
		}
		migrations, err := readMigrations(dir)
		if err != nil {
			return err
		}
		payload, err = json.Marshal(migrateRequest{Migrations: migrations})
		if err != nil {
			return err
		}
	case "seed":
		if len(args) != 2 {
			return fmt.Errorf("%w: admin seed <data-dir>", errUsage)
		}
		payload, err := os.ReadFile(filepath.Join(args[1], "product-index.json"))
		if err != nil {
			return fmt.Errorf("read seed: %w", err)
		}
		details, err := validateSeed(payload)
		if err != nil {
			return fmt.Errorf("invalid seed JSON: %w", err)
		}
		if len(details) != 0 {
			for _, detail := range details {
				fmt.Fprintln(stderr, detail)
			}
			return errors.New("invalid seed")
		}
	}

	pair, err := tls.LoadX509KeyPair(cert, key)
	if err != nil {
		return fmt.Errorf("load client certificate: %w", err)
	}
	if client == nil {
		transport := &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{pair}, MinVersion: tls.VersionTLS12}}
		defer transport.CloseIdleConnections()
		client = &http.Client{Transport: transport, Timeout: 30 * time.Second}
	} else {
		transport, ok := client.Transport.(*http.Transport)
		if !ok {
			return errors.New("test client must use *http.Transport")
		}
		transport = transport.Clone()
		if transport.TLSClientConfig == nil {
			transport.TLSClientConfig = &tls.Config{}
		} else {
			transport.TLSClientConfig = transport.TLSClientConfig.Clone()
		}
		transport.TLSClientConfig.Certificates = []tls.Certificate{pair}
		client = &http.Client{Transport: transport, Timeout: 30 * time.Second}
		defer transport.CloseIdleConnections()
	}
	request, err := http.NewRequest(http.MethodPost, endpoint+"/"+command, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if len(body) > 0 {
			fmt.Fprintln(stderr, string(body))
		}
		return fmt.Errorf("server returned %s", response.Status)
	}
	if len(body) > 0 {
		if _, err := stdout.Write(body); err != nil {
			return fmt.Errorf("write response: %w", err)
		}
		if body[len(body)-1] != '\n' {
			fmt.Fprintln(stdout)
		}
	}
	return nil
}

func clientConfig(getenv func(string) string) (endpoint, cert, key string, err error) {
	for _, name := range []string{"ADMIN_URL", "ADMIN_CLIENT_CERT", "ADMIN_CLIENT_KEY"} {
		if getenv(name) == "" {
			return "", "", "", fmt.Errorf("%w: %s is required", errConfig, name)
		}
	}
	u, parseErr := url.Parse(getenv("ADMIN_URL"))
	if parseErr != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", "", "", fmt.Errorf("%w: ADMIN_URL must be an https base URL", errConfig)
	}
	return strings.TrimRight(getenv("ADMIN_URL"), "/"), getenv("ADMIN_CLIENT_CERT"), getenv("ADMIN_CLIENT_KEY"), nil
}

func readMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	var files []migration
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		match := migrationFile.FindStringSubmatch(entry.Name())
		if match == nil {
			continue
		}
		version, err := strconv.Atoi(match[1])
		if err != nil {
			return nil, fmt.Errorf("migration %s: invalid version: %w", entry.Name(), err)
		}
		sql, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		files = append(files, migration{Version: version, Name: match[2], SQL: string(sql)})
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Version < files[j].Version })
	for i := 1; i < len(files); i++ {
		if files[i-1].Version == files[i].Version {
			return nil, fmt.Errorf("duplicate migration version %d", files[i].Version)
		}
	}
	return files, nil
}

func validateSeed(data []byte) ([]string, error) {
	var rawRows map[string]json.RawMessage
	decoder := json.NewDecoder(bytes.NewReader(data))
	if err := decoder.Decode(&rawRows); err != nil {
		return nil, err
	}
	if rawRows == nil {
		return nil, errors.New("expected an object")
	}
	if decoder.Decode(new(any)) != io.EOF {
		return nil, errors.New("expected one JSON value")
	}
	tables := []string{"platforms", "merchants", "products", "variants", "offers", "aliases"}
	for name := range rawRows {
		if !contains(tables, name) {
			return []string{fmt.Sprintf("unknown table %q", name)}, nil
		}
	}
	rows := tableRows{}
	for _, name := range tables {
		value, ok := rawRows[name]
		if !ok {
			return []string{fmt.Sprintf("missing table %q", name)}, nil
		}
		var tableRows []map[string]json.RawMessage
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) || json.Unmarshal(value, &tableRows) != nil {
			return []string{fmt.Sprintf("%s must be an array", name)}, nil
		}
		rows[name] = tableRows
	}
	var problems []string
	ids := map[string]map[string]bool{}
	for _, table := range tables {
		ids[table] = map[string]bool{}
		for i, row := range rows[table] {
			if row == nil {
				problems = append(problems, fmt.Sprintf("%s[%d] must be an object", table, i))
				continue
			}
			for key := range row {
				if !contains(columns[table], key) {
					problems = append(problems, fmt.Sprintf("%s[%d] has unknown field %q", table, i, key))
				}
			}
			for _, key := range requiredStrings[table] {
				value, ok := row[key]
				var text string
				if !ok || json.Unmarshal(value, &text) != nil || (table != "products" || key != "model" && key != "category") && strings.TrimSpace(text) == "" {
					problems = append(problems, fmt.Sprintf("%s[%d].%s must be a non-empty string", table, i, key))
					continue
				}
				if key == "id" {
					if ids[table][text] {
						problems = append(problems, fmt.Sprintf("%s[%d].id duplicates %q", table, i, text))
					}
					ids[table][text] = true
				}
			}
			for _, key := range columns[table] {
				if key == "platform_operated" && table == "merchants" {
					continue
				}
				if _, ok := row[key]; !ok {
					problems = append(problems, fmt.Sprintf("%s[%d].%s is required", table, i, key))
				}
			}
			if table == "offers" {
				if value, ok := row["amount"]; ok && !validAmount(value) {
					problems = append(problems, fmt.Sprintf("offers[%d].amount must be a non-negative integer or null", i))
				}
				if value, ok := row["checked_on"]; ok && !validDate(value) {
					problems = append(problems, fmt.Sprintf("offers[%d].checked_on must be YYYY-MM-DD or null", i))
				}
				if value, ok := row["outbound_link"]; ok && !validURL(value) {
					problems = append(problems, fmt.Sprintf("offers[%d].outbound_link must be an absolute URL", i))
				}
			}
			if table == "merchants" {
				if value, ok := row["platform_operated"]; ok && !validBooleanInteger(value) {
					problems = append(problems, fmt.Sprintf("merchants[%d].platform_operated must be 0 or 1", i))
				}
			}
		}
	}
	aliases := map[string]bool{}
	for i, row := range rows["aliases"] {
		var product, locale, alias string
		if json.Unmarshal(row["product_id"], &product) == nil && json.Unmarshal(row["locale"], &locale) == nil && json.Unmarshal(row["alias"], &alias) == nil {
			key := product + "\x00" + locale + "\x00" + alias
			if aliases[key] {
				problems = append(problems, fmt.Sprintf("aliases[%d] duplicates product_id, locale, alias", i))
			}
			aliases[key] = true
		}
	}
	foreignKeys := []struct{ table, field, target string }{
		{"merchants", "platform_id", "platforms"},
		{"variants", "product_id", "products"},
		{"offers", "variant_id", "variants"},
		{"offers", "merchant_id", "merchants"},
		{"aliases", "product_id", "products"},
	}
	for _, fk := range foreignKeys {
		for i, row := range rows[fk.table] {
			if raw, ok := row[fk.field]; ok {
				var id string
				if json.Unmarshal(raw, &id) == nil && id != "" && !ids[fk.target][id] {
					problems = append(problems, fmt.Sprintf("%s[%d].%s references unknown %s id %q", fk.table, i, fk.field, fk.target, id))
				}
			}
		}
	}
	return problems, nil
}

var columns = map[string][]string{
	"platforms": {"id", "name"},
	"merchants": {"id", "name", "platform_id", "platform_operated"},
	"products":  {"id", "brand", "name", "model", "category"},
	"variants":  {"id", "product_id", "name"},
	"offers":    {"id", "variant_id", "merchant_id", "outbound_link", "amount", "checked_on"},
	"aliases":   {"product_id", "locale", "alias"},
}

var requiredStrings = map[string][]string{
	"platforms": {"id", "name"},
	"merchants": {"id", "name", "platform_id"},
	"products":  {"id", "brand", "name", "model", "category"},
	"variants":  {"id", "product_id", "name"},
	"offers":    {"id", "variant_id", "merchant_id", "outbound_link"},
	"aliases":   {"product_id", "locale", "alias"},
}

func validAmount(raw json.RawMessage) bool {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return true
	}
	value := string(bytes.TrimSpace(raw))
	amount, err := strconv.ParseInt(value, 10, 64)
	return err == nil && amount >= 0 && amount <= 9007199254740991
}
func validURL(raw json.RawMessage) bool {
	var text string
	if json.Unmarshal(raw, &text) != nil {
		return false
	}
	u, err := url.Parse(text)
	return err == nil && u.IsAbs() && u.Host != ""
}

func validDate(raw json.RawMessage) bool {
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return true
	}
	var date string
	return json.Unmarshal(raw, &date) == nil && len(date) == len("2006-01-02") && func() bool {
		_, err := time.Parse("2006-01-02", date)
		return err == nil
	}()
}

func validBooleanInteger(raw json.RawMessage) bool {
	value := string(bytes.TrimSpace(raw))
	return value == "0" || value == "1"
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
