# Terraform sandbox: one disposable TXT record. See docs/infrastructure.md.
# Token comes from the CLOUDFLARE_API_TOKEN env var; zone ID from TF_VAR_zone_id.
# Never put either in this file.

terraform {
  required_version = ">= 1.6"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {}

variable "zone_id" {
  description = "Zone ID of taiwanhaul.com (Dashboard → Overview → API)."
  type        = string
}

resource "cloudflare_dns_record" "sandbox" {
  zone_id = var.zone_id
  name    = "_tf-sandbox.taiwanhaul.com"
  type    = "TXT"
  content = "\"taiwanhaul terraform sandbox\""
  ttl     = 1 # 1 = automatic
  comment = "Terraform sandbox; safe to delete"
}

output "record_id" {
  value = cloudflare_dns_record.sandbox.id
}
