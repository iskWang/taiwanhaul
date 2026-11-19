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
	if len(args) == 0 || args[0] != "migrate" {
		return fmt.Errorf("%w: expected migrate", errUsage)
	}
	endpoint, cert, key, err := clientConfig(getenv)
	if err != nil {
		return err
	}
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
	payload, err := json.Marshal(migrateRequest{Migrations: migrations})
	if err != nil {
		return err
	}
	command := args[0]


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

