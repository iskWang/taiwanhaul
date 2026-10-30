package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestMigrateSendsAscendingVersionsWithClientCertificate(t *testing.T) {
	certPath, keyPath := writeClientCertificate(t)
	dir := t.TempDir()
	for name, sql := range map[string]string{"0010_second.sql": "SELECT 10;", "0002_first.sql": "SELECT 2;", "ignored.sql": "SELECT 0;"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(sql), 0600); err != nil {
			t.Fatal(err)
		}
	}
	var got migrateRequest
	var gotCert bool
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotCert = r.TLS != nil && len(r.TLS.PeerCertificates) == 1
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"applied":[2,10]}`))
	}))
	server.TLS = &tls.Config{ClientAuth: tls.RequireAnyClientCert}
	server.StartTLS()
	defer server.Close()

	stdout, stderr := new(strings.Builder), new(strings.Builder)
	if err := runWithClient([]string{"migrate", dir}, envFor(server.URL, certPath, keyPath), stdout, stderr, server.Client()); err != nil {
		t.Fatalf("run: %v; stderr: %s", err, stderr.String())
	}
	if !gotCert {
		t.Fatal("server did not receive a client certificate")
	}
	if len(got.Migrations) != 2 || got.Migrations[0].Version != 2 || got.Migrations[1].Version != 10 {
		t.Fatalf("migration versions not ascending: %+v", got.Migrations)
	}
	if stdout.String() != `{"applied":[2,10]}`+"\n" {
		t.Fatalf("stdout = %q", stdout.String())
	}
}

func TestInvalidSeedMakesNoRequest(t *testing.T) {
	certPath, keyPath := writeClientCertificate(t)
	dir := t.TempDir()
	seed := `{"platforms":[],"merchants":[],"products":[],"variants":[],"offers":[{"id":"o","variant_id":"missing","merchant_id":"missing","outbound_link":"https://example.com","amount":"12","checked_on":null}],"aliases":[]}`
	if err := os.WriteFile(filepath.Join(dir, "product-index.json"), []byte(seed), 0600); err != nil {
		t.Fatal(err)
	}
	var hits atomic.Int32
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
	}))
	server.TLS = &tls.Config{ClientAuth: tls.RequireAnyClientCert}
	server.StartTLS()
	defer server.Close()

	stderr := new(strings.Builder)
	err := runWithClient([]string{"seed", dir}, envFor(server.URL, certPath, keyPath), new(strings.Builder), stderr, server.Client())
	if err == nil {
		t.Fatal("invalid seed unexpectedly succeeded")
	}
	if hits.Load() != 0 {
		t.Fatalf("invalid seed sent %d request(s)", hits.Load())
	}
	for _, want := range []string{"amount", "unknown variants id", "unknown merchants id"} {
		if !strings.Contains(stderr.String(), want) {
			t.Errorf("stderr %q does not contain %q", stderr.String(), want)
		}
	}
}
func TestValidSeedPassesLocalValidation(t *testing.T) {
	data := []byte(`{"platforms":[{"id":"pc","name":"PChome"}],"merchants":[{"id":"m","name":"M","platform_id":"pc"}],"products":[{"id":"p1","brand":"B","name":"N","model":"","category":""}],"variants":[{"id":"v1","product_id":"p1","name":"box"}],"offers":[{"id":"o1","variant_id":"v1","merchant_id":"m","outbound_link":"https://example.com","amount":450,"checked_on":"2026-10-30"}],"aliases":[{"product_id":"p1","locale":"vi","alias":"bánh dứa"}]}`)
	details, err := validateSeed(data)
	if err != nil || len(details) != 0 {
		t.Fatalf("valid seed rejected: details=%v err=%v", details, err)
	}
}

var tlsConfigRequireAny = tls.Config{ClientAuth: tls.RequireAnyClientCert}

func envFor(endpoint, cert, key string) func(string) string {
	return func(name string) string {
		return map[string]string{"ADMIN_URL": endpoint, "ADMIN_CLIENT_CERT": cert, "ADMIN_CLIENT_KEY": key}[name]
	}
}

func writeClientCertificate(t *testing.T) (string, string) {
	t.Helper()
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	template := x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "admin-cli-test"}, NotBefore: now.Add(-time.Minute), NotAfter: now.Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	certPath, keyPath := filepath.Join(dir, "client.crt"), filepath.Join(dir, "client.key")
	if err := os.WriteFile(certPath, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(keyPath, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}), 0600); err != nil {
		t.Fatal(err)
	}
	return certPath, keyPath
}
