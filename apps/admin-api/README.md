# Admin API

This Worker is the private write path for TaiwanHaul's Product Index. `POST /migrate` and `POST /seed` require Cloudflare mTLS and an allowlisted `ADMIN_CERT_FINGERPRINTS`; no `workers.dev` or preview URL is enabled. The Worker is deployed manually, not by CI.

For D1 provisioning, certificate setup, deploy commands, verification, revocation, and the seed JSON shape, follow the [Admin Worker and D1 runbook](../../docs/infrastructure.md#admin-worker-and-d1).
