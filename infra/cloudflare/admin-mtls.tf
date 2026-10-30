# mTLS for the D1 admin Worker (issue #14). See docs/infrastructure.md#admin-worker-and-d1.
# Token needs Zone: SSL and Certificates Edit + Zone WAF Edit, scoped to taiwanhaul.com.
# D1 databases are NOT here: D1 permissions are account-wide, so they are created once
# with `wrangler d1 create` instead of widening this token.

locals {
  admin_hosts = ["admin.taiwanhaul.com", "admin-staging.taiwanhaul.com"]
}

# Require Cloudflare-managed CA client certificates on the admin hosts.
resource "cloudflare_certificate_authorities_hostname_associations" "admin" {
  zone_id   = var.zone_id
  hostnames = local.admin_hosts
}

# Zone entrypoint for custom WAF rules. Owns the whole phase: add other custom rules here.
resource "cloudflare_ruleset" "waf_custom" {
  zone_id = var.zone_id
  name    = "taiwanhaul custom WAF rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"
  rules = [{
    description = "Admin hosts require a verified, unrevoked client certificate"
    expression  = "(http.host in {\"admin.taiwanhaul.com\" \"admin-staging.taiwanhaul.com\"} and (not cf.tls_client_auth.cert_verified or cf.tls_client_auth.cert_revoked))"
    action      = "block"
    enabled     = true
  }]
}
