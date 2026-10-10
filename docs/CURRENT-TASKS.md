# Current engineering tasks

Updated October 10, 2026, 12:40 Halifax. Target 15:00 Halifax. Software only.

## Published checkpoint

Public app: https://permitpath.gavin-geizer.workers.dev

Published application source `00e50a0`, Cloudflare version `6183aba2-ccc8-46b3-9cf0-bd6a02eaa0f1`. Full check: 149 automated tests pass. Full browser suite:24/24 pass locally and publicly on desktop/narrow viewports. Public run used REQUIRE_MODEL=1: both fresh-example flows returned actual model inference with grounded address evidence. No browser tests skipped. Latest teammate main at 9b81bad remains the base; homepage/dashboard preserved.

Project view redesigned using UI/UX Pro Max: navigation rail, readable evidence summary, actionable source-backed finding rows, dedicated Project details tab, document-analysis service indicator and upload/review links. Seven verified provincial government PDF originals, catalog of 28 resources and 18 distinct PDFs, purpose search and scope caveats. Government hashes/readability/revision-review documented; no provincial automatic applicability or autofill claimed.

## Current AI/frontend increment

- One-click Analyze example document in synthetic demo sends a fresh File to the actual /api/analyze service; output method is real model or labelled fallback, data marked synthetic separately.
- SwarmForge document-results artifact reviewed/imported from exact72ce242 (workercommit4a5cef3, art9957be33, SHA822f2f3c…e49). Actual extracted fields/source quotes/method/uncertainties visible. Sample downloads outside dropzone; raw excerpt collapsed. Lead refined provider-neutral labels and separation of fictional data from actual model inference.
- Field review compares current record against source-derived suggestion before explicit Apply. Readable evidence field names.
- Model key normalization accepts bounded spaced/hyphenated labels and keeps client/owner/applicant distinct. New regression test.
- Full check: 149 passed. Affected integration browser: 10 passed; fresh example desktop/mobile: 2 passed with observed genuine model outputs. All 24 integrated browser checks passed locally and publicly; actual inference required for live-example checks.

## SwarmForge ownership

- AI/document worker w-926a9352: Documents.tsx, document-intelligence.css and AI browser spec delivered; reviewed/combined by lead. Follow-up acknowledgement in progress, no further overlapping edits requested.
- QA worker w-a15f88f7: public f3baeb7 independent report .swarmforge/artifacts/workspace-review.md; completed 4 probes. Latest deployed 00e50a0 AI UI review passed 4/4 read-only probes.
- Government worker w-6ef00ffb: seven-form pack and read-only revision review completed naturally. All 7 source hashes stable, no superseded notice found; no government currency guarantee.
- No workers stopped or paused, no presentation work.

## Next actions / resume

Independent SwarmForge latest-release UI review passed all four read-only probes; report in deliverables/frontend-review/ai-workspace-review.md. Latest release is already pushed/deployed/verified. Broader jurisdiction rules, OCR, shared persistence and authorized submission integrations remain development milestones. Keep working on frontend while independent reviews run. Read HANDOFF.md top and git status first; preserve untracked user .agents/ skill bundle and historical submission/. Do not reset/clean/broadly git add.

Branch permitpath/build. Fetch origin before integrating additional teammate main pushes. Runtime secrets are server-side; root .env contains development SwarmForge credentials only, never print/source into app. Commands: npm run dev, npm run check, npm run test:browser, npm run deploy (cf CLI, no Wrangler). Run Playwright sequentially to avoid shared-artifact collisions. Original PDF validator: python3 deliverables/ns-government-forms/tests/validate_provincial_pack.py --integrated.

Limits: browser-local records/extracted text; original uploads not retained. No accounts/team sync/OCR/background notifications/direct submission/verified automated renewal eligibility. Automated rules only for HRM commercial renovation; other municipalities manual tracking+official resources. Original provincial PDF downloads only; some editing restrictions/parser differences. Reviewed Truro address/scope autofill separate. Report describes evidence availability, not legal compliance/approval.
