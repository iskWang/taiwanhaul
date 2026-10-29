# TaiwanHaul Cloudflare resources owned by Terraform. See docs/infrastructure.md.
# Edit here, not in the Dashboard. Wrangler still owns the Worker.
# Credentials and private values come from ~/.config/taiwanhaul/terraform.env
# (CLOUDFLARE_API_TOKEN and TF_VAR_*), never from files in this repo.
# State is local and git-ignored: it holds only the private contact inbox.

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
  description = "Zone ID of taiwanhaul.com."
  type        = string
}

variable "contact_destination" {
  description = "Verified inbox that receives contact@ mail. Never commit it."
  type        = string
  sensitive   = true
}

resource "cloudflare_email_routing_rule" "contact" {
  zone_id  = var.zone_id
  name     = "contact@ to operator inbox"
  enabled  = true
  priority = 0
  matchers = [{
    type  = "literal"
    field = "to"
    value = "contact@taiwanhaul.com"
  }]
  actions = [{
    type  = "forward"
    value = [var.contact_destination]
  }]
}
