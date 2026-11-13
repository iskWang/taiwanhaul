# mTLS for the D1 admin Worker (issue #14). Runbook: docs/admin.private.md (private, gitignored).
# Token needs Zone: SSL and Certificates Edit + Zone WAF Edit, scoped to taiwanhaul.com.
# D1 databases are NOT here: D1 permissions are account-wide, so they are created once
# with `wrangler d1 create` instead of widening this token.

locals {
  # Cloudflare returns these sorted; any other order shows as a change on every plan.
  admin_hosts = ["admin.taiwanhaul.com"]
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
    expression  = "(http.host eq \"admin.taiwanhaul.com\" and (not cf.tls_client_auth.cert_verified or cf.tls_client_auth.cert_revoked))"
    action      = "block"
    enabled     = true
  }]
}

# Rate limit for the public search endpoint (release review 2026-11-13). Free plan allows
# one rule, period 10s, mitigation 10s, count by IP. Zone entrypoint for this phase.
resource "cloudflare_ruleset" "ratelimit" {
  zone_id = var.zone_id
  name    = "taiwanhaul rate limits"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules = [{
    description = "Limit /api/search per IP"
    expression  = "(starts_with(http.request.uri.path, \"/api/search\"))"
    action      = "block"
    enabled     = true
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 20
      mitigation_timeout  = 10
    }
  }]
}
