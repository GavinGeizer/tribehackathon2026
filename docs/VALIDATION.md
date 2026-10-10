# Latest UI verification — October 10, 14:44 Halifax

Application source `a73593d42fc054b92080bfd3765e945ff1e4412b`, Cloudflare version `af7ef94a-0a6d-482b-a73b-23451b677e06`, client `index-Q3RR7Z8B.js`.

| Check | Result | Evidence |
| --- | --- | --- |
| Production build/server typecheck/unit/API | Pass;185 tests,0 failures | artifacts/claude-ui-final-check.log |
| Frontend lint | Pass | artifacts/claude-ui-final-lint.log |
| Local browser suite |32 pass; desktop1440px/narrow390px | artifacts/claude-ui-local-browser.log |
| Visual check | No page errors or horizontal overflow | artifacts/claude-ui-visual-check.log; claude-ui-project/landing screenshots |
| Published credential exposure check |8/8 scripts checked;0 exposed keys | artifacts/claude-ui-published-assets.log |
| Public browser suite with REQUIRE_MODEL=1 |32 pass,0 skips/failures;2.1minutes | artifacts/claude-ui-public-browser.log |
| Independent SwarmForge UI QA | Queued for this source; not yet accepted | Worker w-a15f88f7, run dcbaeed4-bb4d-491f-a9c1-f7a77109fc9f |

No regulatory rules or provider configuration changed. Pending scope discovery UI/API excluded from this release; source snapshots retained for continuation. Public tests verify deployed input-dependent AI, not simulated responses. Earlier validation below applies only to its specified source.

# Latest release validation

Verified October 10, 2026, 13:27 Halifax. Application source `902e8085d700d4b27f39230a82989dcfcaeb6468`, Cloudflare version `c867f039-949c-4ac8-8171-49f7d25bb741` at https://permitpath.gavin-geizer.workers.dev. Client bundle `index-DxK18ip2.js`.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Server typecheck and production frontend build | Pass | artifacts/forms-release-build.log |
| npm test | 185 pass, 0 fail, 22 files | artifacts/forms-release-unit.log; exact application release |
| Public Playwright with REQUIRE_MODEL=1 | 32 pass, 0 skipped, desktop1440px / narrow390px | artifacts/forms-settled-public-browser.log; full suite1.9minutes |
| Provincial original PDF validator --integrated | All checks pass | artifacts/forms-originals-validator.log; original bytes/hashes, readability, pages and fields unchanged |
| Published JavaScript/module credential check | 8 of8 assets checked;0 exposed runtime keys | artifacts/forms-release-assets-check.log; key comparison happens outside the browser |
| Independent SwarmForge form UI QA | Active, not yet accepted | Exact902e808 task; do not substitute earlier worker checks |

Browser coverage includes project creation and persistence, residential/manual coverage gating, conditional requirements, source inspection, upload extraction, missing/conflicting evidence correction, report PDF, lifecycle dates/reminders/ICS, reviewed renewal handoff, municipality changes, before/after field review, government original downloads, purpose search, actual source-quoted model extraction, original browser form editing/autosave/reopen, nonblank PDF.js canvas, original-form unsigned PDF roundtrip and explicit AI suggestion acceptance. Cross-form test saves scope in the official Truro form and requires live AI to reuse that exact fact in the official Fuel Safety form with retained source provenance. No government application was signed or submitted.

First suite immediately after publication:31pass/1fail because an old script referenced a replaced lazy module. Trace retained at artifacts/form-deployment-transition-trace.zip. Complete settled-deployment rerun passed32/32 without code changes. Earlier a8e2f5e extraction failures came from an ambiguous schema prompt; the corrected prompt uses a real JSON schema and leaves strict scalar/grounding validation intact. Form provider timeout increased20s→30s after an observed request timeout; failures remain labelled deterministic fallback.

Independent workers delivered regulatory records, PDF engine, form-AI adapter and preview components from isolated source revisions; lead reviewed and corrected production integration. Their earlier tests are not proof of the current release. Current-source SwarmForge QA remains active; artifact transport recently reported manager pressure. See CURRENT-TASKS.md for exact worker/run IDs.

Run browser suites sequentially; they share test-results/. Inference is external and can fail; document extraction is bounded12s/1500tokens, form mapping30s/2500tokens. Synthetic data is labelled separately from inference method. No guarantee of regulatory compliance, engineering correctness, form applicability or uninterrupted model availability. See FEATURES.md for implemented/partial/future capabilities.
