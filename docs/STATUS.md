# PermitPath engineering status

Updated October 10, 2026, 13:27 Halifax. Software only; delivery target 15:00 Halifax.

Public app: https://permitpath.gavin-geizer.workers.dev

Application source `902e8085d700d4b27f39230a82989dcfcaeb6468`, Cloudflare version `c867f039-949c-4ac8-8171-49f7d25bb741`. Pushed on `permitpath/build`; latest `origin/main` at `9b81bad` remains integrated. Homepage/dashboard preserved; project workspace and browser form editor follow UI/UX Pro Max.

Project creation selects municipality and project workflow, then opens form discovery. Source-backed scope questions retain unknown applicability. Supported original AcroForms can be completed in-browser, autosaved, previewed as actual PDFs and exported as unsigned drafts. AI suggestions reuse grounded project details, document fields and values saved in other forms, with explicit acceptance and retained provenance. Residential/other workflows do not receive HRM commercial-renovation rules.

Runtime inference uses the user-authorized configured OpenRouter endpoint/model, through server-side Worker secrets. Model output never changes regulatory rules. Document extraction validates exact source quotes; form mapping validates exact fact/field references and role restrictions. Errors preserve the labelled deterministic fallback. No model change was required.

Validation: 185 unit/API tests pass on this release, with server typecheck and production build. All 32 public desktop/narrow browser tests pass with REQUIRE_MODEL=1 for live example extraction and form proposals. Original government PDF validation passes. All 8 published JavaScript/module assets checked with 0 runtime-key exposures. Initial deployment-transition old-asset failure is recorded separately; the settled-release full suite passed without skips.

SwarmForge supplied independent PDF engine, AI mapping, regulatory discovery and PDF preview artifacts, reviewed and corrected during integration. Its read-only QA worker is active after supported recovery, pinned to `902e808`. No workers stopped. See CURRENT-TASKS.md and HANDOFF.md for ownership and continuation.

Limits: browser-local records and extracted text; original uploads not retained. No authentication/team synchronization/OCR/background notifications/direct government submission/verified automated renewal eligibility. Automated regulatory coverage is HRM commercial renovation; other NS municipalities use guided preparation and official resources. Print-only, protected and XFA forms remain unsupported for browser completion. Template availability does not establish legal applicability or submission completeness. Readiness counts supporting evidence, not compliance or approval.
