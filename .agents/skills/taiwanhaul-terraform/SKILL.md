---
name: taiwanhaul-terraform
description: Use for TaiwanHaul Terraform drift checks, imports, planned changes, or explicitly requested disposable DNS sandbox runs.
---

# TaiwanHaul Terraform

## Before any operation

1. Read and follow [AGENTS Project scope](../../../AGENTS.md#project-scope).
2. Read [infrastructure ownership](../../../docs/infrastructure.md#ownership), [state and secrets](../../../docs/infrastructure.md#state-and-secrets), and [token scope](../../../docs/infrastructure.md#token-scope). Stop if the requested resource, credentials, or state violate those constraints.
3. Default to the contact-only drift check below. Run the sandbox only when explicitly requested. Invoking this skill grants no mutation permission. Permission probes are read-only GET requests, never PATCH/POST; keep other projects out of evidence.

## Contact-only drift check

From the repository root, use this subshell so Terraform credentials do not enter the parent shell used for Wrangler:

```sh
(
  set -a
  . "$HOME/.config/taiwanhaul/terraform.env" || exit
  set +a
  terraform -chdir=infra/cloudflare plan -detailed-exitcode
)
```

- Exit 0: no changes; report the module and result.
- Exit 2: drift; stop and report the proposed changes. Never automatically apply on exit 2.
- Any other exit: error; stop and report it without exposing secrets. Missing environment/state or unexpected resources are blockers, not reasons to recreate production resources.

The contact rule import is already complete; importing is not a routine drift-check step. See [import and drift](../../../docs/infrastructure.md#import-and-drift).

## Authorized changes only

- Before any Terraform mutation, save and review the exact plan privately; obtain explicit user authorization covering that saved plan, resource, and action. Apply only that approved saved plan. A changed plan requires fresh review and authorization. No bare auto-approved apply or arbitrary destroy.
- For an explicitly requested import-only operation, stop on any create, delete, replace, field change, or mismatched forwarding destination. Confirm the existing resource identity and unchanged values before requesting approval; keep the private destination out of reports.
- Sandbox creation, drift restoration, and destruction each require their own reviewed saved plan and explicit approval. For cleanup, review a saved destroy plan containing only the approved disposable TXT; never run an unbounded destroy.
- Keep credentials inside the subshell pattern above for all Terraform operations. Follow the linked state/token rules rather than exporting credentials into a Wrangler shell.

## Disposable TXT sandbox — only on explicit request

Read the [sandbox reference and prior outcome](../../../docs/infrastructure.md#sandbox). Work only in `infra/sandbox/`, not the contact module.

1. Pre-check: confirm `_tf-sandbox.taiwanhaul.com` is unused with a read-only DNS lookup/list. If occupied, stop and agree an unused disposable name; never adopt or overwrite it. Confirm Terraform is available, initialize this module, and inspect the provider lock/version. If tooling is missing, report the prerequisite rather than installing it implicitly.
2. Save a creation plan; it must contain exactly one disposable TXT addition with the agreed name/value and no other changes. Review and obtain explicit approval for this saved plan before applying it.
3. Apply only that approved plan; verify `dig TXT _tf-sandbox.taiwanhaul.com` returns `taiwanhaul terraform sandbox` (substitute only the explicitly agreed name/value). Stop if the observed record differs.
4. Run a fresh plan: require no changes before testing drift.
5. Obtain explicit approval for the exact disposable TXT value edit in the Dashboard. Make only that edit, then run `plan -detailed-exitcode`; require exit 2 with only the expected TXT change. Any other difference stops the experiment.
6. Restore using a separately saved, reviewed, explicitly approved plan; require a no-change plan. Then save and review a destroy plan for only this TXT, obtain explicit approval, and apply that saved plan. Verify no TXT remains at the authoritative DNS server and `terraform state list` in this module is empty; public resolvers may retain cached answers until TTL expiry. If cleanup fails, report the remaining record/state instead of claiming completion.

## Report

State the module, plan exit code, reviewed scope, and observed outcome. For a sandbox run, include DNS cleanup and empty-state evidence; leave unperformed checks explicitly unverified. Never include tokens, private destinations, or raw state/plan contents.
