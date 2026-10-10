# Latest release validation

Verified October 10, 2026, 12:40 Halifax. Application source `00e50a0`, Cloudflare version `6183aba2-ccc8-46b3-9cf0-bd6a02eaa0f1` at https://permitpath.gavin-geizer.workers.dev.

| Check | Result | Scope |
| --- | --- | --- |
| npm run check |149 pass,0 fail | Server typecheck, production frontend build, unit/API tests across 18 files |
| npx playwright test |24 pass,0 skipped | Local desktop 1440px and narrow 390px workflows |
| DEMO_BASE_URL=https://permitpath.gavin-geizer.workers.dev REQUIRE_MODEL=1 npx playwright test |24 pass,0 skipped | Same deployed workflows; live example must return method=model |
| Provincial original PDF validator --integrated | All checks pass | Original bytes/hashes, readability, pages and pypdf field counts |
| Independent SwarmForge workspace QA |4 read-only probes pass | Exact 00e50a0 served bundle; read-only UI/provenance/navigation/overflow checks |

Browser coverage: project creation/persistence, conditional facts, source inspection, real upload processing, missing/conflicting evidence correction, report PDF, lifecycle dates/reminders/ICS, reviewed renewal handoff, jurisdiction coverage, before/after field review, worksheet, actual reviewed Truro PDF, original government downloads/purpose search, live input-dependent example analysis and document provenance. Synthetic data marked separately from inference method. No official applications submitted.

Raw logs/screenshots under ignored artifacts/: ai-document-final-check.log, ai-complete-local-browser.log, ai-complete-public-browser.log, ai-complete-deploy.log, provincial-validator.log, workspace-redesign-*.png and live-ai-document-*.png. Earlier source checks must not be reported as latest-release verification. Unit regression preserves client/owner/applicant distinctions for model label variants.

Run browser suites sequentially; they share test-results/. No guarantee of regulatory compliance, engineering correctness, government form applicability or uninterrupted external inference. Readiness counts supporting evidence. See FEATURES.md for implemented/partial/future functionality.
