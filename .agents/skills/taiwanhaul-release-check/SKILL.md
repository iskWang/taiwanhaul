---
name: taiwanhaul-release-check
description: Use for TaiwanHaul local release checks, issue PRs to staging, final staging-to-main release review, target-commit CI verification, or deployed smoke checks.
---

# TaiwanHaul release check

## Establish the target

1. Read and follow [AGENTS](../../../AGENTS.md), then read [package scripts](../../../package.json), [test workflow](../../../.github/workflows/test.yml), [production deploy workflow](../../../.github/workflows/deploy.yml), [staging deploy workflow](../../../.github/workflows/deploy-staging.yml), and [deployment and setup](../../../docs/infrastructure.md#deployment-and-setup) as the current sources of truth.
2. Record the requested commit SHA, environment, and URL. For deployed verification, establish the exact deployed commit from deployment evidence. Query CI for that exact SHA, not the latest run or branch tip; for pull_request Test runs, distinguish the tested merge SHA from the PR head. If the target cannot be identified, report that gap instead of attributing another commit's results.
3. Issue PRs target `staging`. A merge to `staging` deploys the test Worker; a release PR from `staging` to `main` promotes the reviewed changes to production. Push, merge, and deploy each require explicit user approval that names the commit or PR, the target (branch, staging, or production), and the action, including automatic deployment caused by a merge/push. Approval of one does not cover another. Invoking this skill is not approval. A Worker version preview is not the staging deployment or production traffic. This runbook verifies a target; it does not initiate deployment.

## Local checks

From the repository root, with existing dependencies, run:

```sh
bun run test
bun run typecheck
bun run build
```

Record each exit code. Stop release readiness on a failure or missing prerequisite; report it without treating an older successful run as evidence. Do not install dependencies or start a server implicitly; use an already available target or obtain the needed authorization.

## CI and deployed target

- Match the target SHA to all required runs: Test, plus Deploy staging or Deploy for the deployed environment. Inspect conclusions and failed steps; pending, missing, or failed required runs are not a pass.
- Verify Staging isolation: there are no PR previews (disabled 2026-11-13; production keeps `workers_dev: false`). Staging (`taiwanhaul-staging`, `env.staging` in `apps/web/wrangler.json`) must bind only the staging D1 database and its own staging secrets, never production bindings or secrets; confirm the D1 binding on the deployed staging version, not only in `wrangler.json`. Staging has no routes or custom domain, but its `workers.dev` URL is public; deploying Staging must not change production traffic.
- Record the Staging deployment's version and commit, and establish that the staging URL serves that deployment before attributing smoke results to it. A successful Staging deployment is not evidence that production changed. If deployment identity is unavailable, keep runtime observations separate from commit verification.

## Final release gate: staging → main

1. Confirm the release PR's base is `main` and head is `staging`; record its current head SHA and the current `main` SHA. Use up-to-date refs. Issue PRs must already have been reviewed and merged to `staging`.
2. Require a successful Test run for this release PR's current head against its current `main` base. Record the PR head SHA, base SHA, and tested merge SHA; distinguish the tested merge SHA from the head. A push-only run, an older head, or a different base does not satisfy this gate; do not reuse green checks from an earlier issue PR.
3. Obtain an independent Terra-style final review of `git diff main...staging`: examine the entire release, interactions between merged issues, security, deploy/config changes, affected callers, tests, and docs. Resolve findings; a prior per-issue review does not replace this review.
4. Match the successful Deploy staging run to that same head SHA and run **all Smoke checks below** on `https://taiwanhaul-staging.iskwang.workers.dev`. Record any missing evidence as blocking; a Worker version preview is not a substitute for the staging URL.
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

Give the target SHA/environment/URL, local exit codes, matching CI results, and each observed smoke result. Separate pass, fail, and unverified; name the blocking evidence. Do not call Staging production, an empty POST a delivery test, or an unperformed check a pass.
