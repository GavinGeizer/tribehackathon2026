# Current engineering tasks

Updated: October 10, 2026, 12:13 Halifax. Application target: 15:00 Halifax. Software only.

## Published checkpoint

Public app: https://permitpath.gavin-geizer.workers.dev

Published source before this increment: `c10a847`, Cloudflare version `1c0d628f-3acc-48fe-aed1-fb5a8520c584`. Full desktop/narrow browser suite passed 18/18 locally and publicly. This includes the new user-authored dashboard connected to real project records, HRM golden path, lifecycle approval, source catalog and reviewed Truro PDF autofill. Genuine grounded runtime AI was independently verified with distinct inputs.

## Current candidate

Seven original Government of Nova Scotia PDFs are preserved with official source URLs, retrieval dates, SHA-256 hashes and scope notes. Six additional catalog entries plus the existing Schedule A entry cover professional undertakings, septic systems, fuel-gas permits and building advisory hearings. Catalog contains 28 resources and 18 distinct original PDFs. Provincial downloads do not assert applicability and do not support autofill. HRM rules are unchanged.

Search official forms by purpose in Resources. Government entries have explicit labels and manual submission instructions. Shared dashboard inputs receive visible keyboard focus outlines; global reduced-motion handling already covers the dashboard.

Validation: 148 unit/API tests passed; six desktop/narrow resource browser checks passed. Standalone original-PDF hash/readability/field validation passed. Focus fix plus affected browser flows are being rechecked before deployment. See ignored `artifacts/provincial-*.log`.

## SwarmForge ownership and next checkpoint

- Government forms worker `w-6ef00ffb-5247-4b15-af0f-7fd545f675a1`: seven-form pack integrated; now independently reviewing revision/superseded notices. Owns only `deliverables/ns-government-forms/revision-review.md` for follow-up.
- Frontend QA worker `w-a15f88f7-c806-4dda-97f6-5a765f57326b`: measured public UI on exact `c10a847`; focus finding addressed by lead. Source was verified. No app edits by QA. Follow-up will verify the published increment.
- Dashboard worker `w-0c56f051-66e7-4a58-ac8e-066c89abcabe`: completed exact `31351f1` integration artifact; reviewed and integrated in `c10a847`. Do not apply its older-base artifact.
- Lead owns frontend integration, reviewed catalog changes, public deployment and latest-candidate checks. No workers stopped or paused; no presentation work active.

Next: finish affected checks, commit/push, deploy with cf CLI, verify public original downloads/search/focus, record exact source/version, collect worker review findings.

## Resume instructions

Read HANDOFF.md top checkpoint, this file and `git status --short`. Preserve user `.agents/` skills and historical `submission/`; do not broadly add/reset/clean. Build branch `permitpath/build`; teammate `origin/main` `9b81bad` merged as `31351f1`. Fetch before integrating future frontend pushes. Use UI/UX Pro Max for interface work.

Commands: `npm run dev`, `npm run check`, `npm run test:browser`, `npm run deploy`. Deployment uses cf CLI, no Wrangler configuration. Run browser suites sequentially because shared test-results artifacts conflict. PDF pack validator: `python3 deliverables/ns-government-forms/tests/validate_provincial_pack.py --integrated`.

Records and extracted text are browser-local. No shared accounts, background email/push, direct official submission or verified automated renewal eligibility. Only HRM commercial renovation has automated regulatory requirements. Other NS locations use manual tracking and official references. Government forms are unchanged downloads; some have editing restrictions or parser differences. Truro address/scope autofill is separate and reviewed. Never print root `.env`: it contains development orchestration credentials, not runtime inference configuration.
