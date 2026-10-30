---
name: taiwanhaul-release-check
description: Use for TaiwanHaul local release checks, issue PRs to staging, final staging-to-main release review, target-commit CI verification, or deployed smoke checks.
---

# TaiwanHaul release check

## Establish the target

1. Read and follow [AGENTS](../../../AGENTS.md), then read [package scripts](../../../package.json), [test workflow](../../../.github/workflows/test.yml), [production deploy workflow](../../../.github/workflows/deploy.yml), [staging deploy workflow](../../../.github/workflows/deploy-staging.yml), [preview workflow](../../../.github/workflows/preview.yml), and [deployment and setup](../../../docs/infrastructure.md#deployment-and-setup) as the current sources of truth.
2. Record the requested commit SHA, environment, and URL. For deployed verification, establish the exact deployed commit from deployment evidence. Query CI for that exact SHA, not the latest run or branch tip; for PR previews, distinguish the workflow's tested merge SHA from the PR head. If the target cannot be identified, report that gap instead of attributing another commit's results.
3. Issue PRs target `staging`. A merge to `staging` deploys the test Worker; a release PR from `staging` to `main` promotes the reviewed changes to production. Push, merge, and deploy each require explicit user approval that names the commit or PR, the target (branch, preview, staging, or production), and the action, including automatic deployment caused by a merge/push. Approval of one does not cover another. Invoking this skill is not approval. A Worker version preview is not the staging deployment or production traffic. This runbook verifies a target; it does not initiate deployment.

## Local checks

From the repository root, with existing dependencies, run:

```sh
bun run test
bun run typecheck
bun run build
```

Record each exit code. Stop release readiness on a failure or missing prerequisite; report it without treating an older successful run as evidence. Do not install dependencies or start a server implicitly; use an already available target or obtain the needed authorization.

## CI and deployed target

- Match the target SHA to the relevant Test and Deploy, Deploy staging, or Preview run; inspect its conclusion and failed steps. Pending, missing, or failed checks are not a pass.
- Verify preview isolation by PR base: `staging` PR previews belong to `taiwanhaul-staging` and use staging bindings/secrets; `main` release PR previews belong to `taiwanhaul` and use production bindings/secrets without changing live traffic. The first staging deploy must have created `taiwanhaul-staging` before staging PR previews can run.
- Record the run URL and commit, plus the deployed version/URL where available. A successful upload proves a preview exists, not that production changed. If deployment identity is unavailable, keep runtime observations separate from commit verification.

## Final release gate: staging → main

1. Confirm the release PR's base is `main` and head is `staging`; record its current head SHA and the current `main` SHA. Use up-to-date refs. Issue PRs must already have been reviewed and merged to `staging`.
2. Require successful CI on that exact release PR head: inspect Test and Preview runs, their head association and tested merge SHA. Do not reuse green checks from an earlier issue PR, an older head, or a different base.
3. Obtain an independent Terra-style final review of `git diff main...staging`: examine the entire release, interactions between merged issues, security, deploy/config changes, affected callers, tests, and docs. Resolve findings; a prior per-issue review does not replace this review.
4. Match the successful Deploy staging run to that same head SHA and run **all Smoke checks below** on `https://taiwanhaul-staging.iskwang.workers.dev`. Record any missing evidence as blocking; a version preview is not a substitute for the staging URL.
5. Present CI, final review, deployed SHA, and full staging smoke evidence to the operator. Merge only after explicit operator approval of this release PR/head and its production deployment. If `staging` or `main` changes, refresh CI/review/deployment/smoke evidence before approval. After the approved merge, verify the production Deploy run and production smoke checks separately.

## Smoke checks

Use the agreed target URL and a browser for UI checks; report unavailable browser capabilities as unverified.

- Fetch `/`, `/privacy`, `/robots.txt`, `/llms.txt`, and `/assets/fonts/TwemojiCountryFlags.woff2` from the web app at `apps/web`. Require successful responses and the expected page/text/font content, not an SPA HTML fallback masquerading as an asset. Confirm the homepage renders.
- Search `pineapple cake` (or open `/?q=pineapple%20cake`): require visible sample results and a Local Estimate with the selected market's currency; mock prices are not live-price evidence.
- Open Contact: confirm the dialog is centered and usable at desktop and narrow viewport sizes, then close it without submitting mail.
- Switch language and confirm visible copy changes. Where `navigator.modelContext` is supported, verify the documented WebMCP tools use the same search/preferences/dialog behavior; otherwise record WebMCP as unverified.
- For `POST /api/contact`, send only an empty JSON object with `Content-Type: application/json` and the target's valid Origin. Expect HTTP 400 from validation; this is a failure-path check, not delivery proof. Any other status fails this check. No real mail sends without explicit permission.

A stubbed/fake Turnstile widget proves UI behavior only. Never claim that headless verification passed real CAPTCHA; actual mail delivery remains unverified without a separately authorized real test and observed delivery.

## Report

Give the target SHA/environment/URL, local exit codes, matching CI results, and each observed smoke result. Separate pass, fail, and unverified; name the blocking evidence. Do not call a preview production, an empty POST a delivery test, or an unperformed check a pass.
