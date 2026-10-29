# AGENTS.md

## Project scope

Everything written in this repository is about **TaiwanHaul only**: the `taiwanhaul.com` domain and zone, the `taiwanhaul` Worker and its bindings, this GitHub repository and its secrets, and services set up for this project (such as the Turnstile widget `taiwanhaul-contact`).

This applies to every artifact: docs, README, ADRs, research notes, code and comments, config, Terraform, commit messages, and PR descriptions.

- When a lookup (Cloudflare account, GitHub, the local machine, memory) returns resources from other projects, record only the TaiwanHaul ones and leave the rest out entirely, even when they share the same account.
- For shared resources (the Cloudflare account, the `workers.dev` subdomain), describe only the part TaiwanHaul uses.
- Scope credentials and tokens to TaiwanHaul resources, so other projects stay out of reach by permission rather than by care.
- Code style may follow the operator's conventions; cite the convention itself, not the repository it came from.
