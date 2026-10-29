---
name: taiwanhaul-release-check
description: Use for TaiwanHaul local release checks, target-commit CI verification, preview checks, or production smoke verification.
---

# TaiwanHaul release check

## Establish the target

1. Read and follow [AGENTS](../../../AGENTS.md), then read [package scripts](../../../package.json), [test workflow](../../../.github/workflows/test.yml), [deploy workflow](../../../.github/workflows/deploy.yml), [preview workflow](../../../.github/workflows/preview.yml), and [README deployment](../../../README.md#deployment) as the current sources of truth.
2. Record the requested commit SHA, environment, and URL. For deployed verification, establish the exact deployed commit from deployment evidence. Query CI for that exact SHA, not the latest run or branch tip; for PR previews, distinguish the workflow's tested merge SHA from the PR head. If the target cannot be identified, report that gap instead of attributing another commit's results.
3. Push, merge, and deploy require explicit user authorization; invoking this skill is not authorization. A Worker version preview is not production traffic. This runbook verifies a target; it does not initiate deployment.

## Local checks

From the repository root, with existing dependencies, run:

```sh
bun test
bun run typecheck
bun run build
```

Record each exit code. Stop release readiness on a failure or missing prerequisite; report it without treating an older successful run as evidence. Do not install dependencies or start a server implicitly; use an already available target or obtain the needed authorization.

## CI and deployed target

- Match the target SHA to the relevant Test and Deploy or Preview run; inspect its conclusion and failed steps. Pending, missing, or failed checks are not a pass.
- Record the run URL and commit, plus the deployed version/URL where available. A successful upload proves a preview exists, not that production changed. If deployment identity is unavailable, keep runtime observations separate from commit verification.

## Smoke checks

Use the agreed target URL and a browser for UI checks; report unavailable browser capabilities as unverified.

- Fetch `/`, `/privacy`, `/robots.txt`, `/llms.txt`, and `/assets/fonts/TwemojiCountryFlags.woff2`. Require successful responses and the expected page/text/font content, not an SPA HTML fallback masquerading as an asset. Confirm the homepage renders.
- Search `pineapple cake` (or open `/?q=pineapple%20cake`): require visible sample results and a Local Estimate with the selected market's currency; mock prices are not live-price evidence.
- Open Contact: confirm the dialog is centered and usable at desktop and narrow viewport sizes, then close it without submitting mail.
- Switch language and confirm visible copy changes. Where `navigator.modelContext` is supported, verify the documented WebMCP tools use the same search/preferences/dialog behavior; otherwise record WebMCP as unverified.
- For `POST /api/contact`, send only an empty JSON object with `Content-Type: application/json` and the target's valid Origin. Expect HTTP 400 from validation; this is a failure-path check, not delivery proof. Any other status fails this check. No real mail sends without explicit permission.

A stubbed/fake Turnstile widget proves UI behavior only. Never claim that headless verification passed real CAPTCHA; actual mail delivery remains unverified without a separately authorized real test and observed delivery.

## Report

Give the target SHA/environment/URL, local exit codes, matching CI results, and each observed smoke result. Separate pass, fail, and unverified; name the blocking evidence. Do not call a preview production, an empty POST a delivery test, or an unperformed check a pass.
