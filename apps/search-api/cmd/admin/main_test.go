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
