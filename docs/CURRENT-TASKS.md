# Current engineering tasks

Updated: 2026-10-10, 11:40 Halifax. Delivery target: 15:00 Halifax today. Software only; no presentation or submission work.

## Published and verified

- URL: https://permitpath.gavin-geizer.workers.dev
- Source: `6a79977` on `permitpath/build`.
- Cloudflare version: `0dda5da8-3c87-4c30-a9d9-ca22b7a5afef`.
- Latest GitHub main `9b81bad` merged and pushed in `31351f1`; its authored landing, header, Tailwind and layout are the frontend base.
- Landing `/`; functional workspace `/workspace` (also `/dashboard`).
- Project creation/editing, PDF/text uploads, grounded extraction, source-backed HRM rules, evidence findings, correction, history, cited report preview/PDF.
- Jurisdiction/customer/workflow selectors; Halifax rules never apply to other municipalities.
- Permit status and user-recorded issue/expiry dates, configurable in-app reminders, real ICS export, renewal draft and explicit manual-handoff approval.
- Grounded field suggestions with reviewed apply and audit, document discrepancies, internal worksheet export.
- 21 official resources and 11 original PDFs preserved; interactive catalog/autofill integrated locally; full validation pending.
- Full check: 131 tests pass. Styled desktop/mobile golden path: 4/4 pass locally. Public golden path 4/4 pass; public mobile lifecycle/ICS/renewal preparation smoke passes with no page errors. Real runtime AI was previously verified and is being rechecked with two distinct inputs.

## Active SwarmForge work and ownership

| Worker | Task | Base | Owned output |
| --- | --- | --- | --- |
| `w-0c56f051-66e7-4a58-ac8e-066c89abcabe` | Connect new GitHub dashboard to live project data, improve UI using reviewed UI/UX Pro Max guidance | repin `31351f1` | `components/Dashboard.tsx`, `pages/dashboard.tsx`, `components/layouts/dashboard-layout.tsx`, optional scoped dashboard CSS |
| `w-eb0d1e69-f20d-4374-b093-6717e95125ef` | Official resource UI + reviewed real Truro PDF autofill | `05ca440` (independent modules; reconcile frontend) | `domain/resources.ts`, `domain/form-fill.ts`, `components/ResourcesTab.tsx`, resources CSS, `tests/resources/**` |
| `w-a15f88f7-c806-4dda-97f6-5a765f57326b` | Browser lifecycle, renewal approval, jurisdiction and assistance QA | repin `31351f1` | `tests/browser/lifecycle.spec.ts`, `deliverables/lifecycle-qa/**` |

Completed worker outputs integrated: regulatory pack, document server, synthetic QA fixtures, lifecycle engine, field assistance, NS resource research, lifecycle UI, AI failure diagnostics. Original worker source pins and preserved artifact IDs are in HANDOFF.md. Never report old-revision tests as latest-candidate validation.

## Lead next actions

1. Collect public browser and two-input model checks; update results.
2. Review/import the three active workers' exact owned artifacts, preserve user GitHub frontend edits.
3. Wire ResourcesTab in `frontend/src/PermitWorkspace.tsx` (App.tsx is now a thin wrapper), add resources tab and tests to scripts.
4. Test actual filled official PDF and human approval; no invented signatures, ownership or legal applicability.
5. Run integrated check and desktop/mobile/browser lifecycle tests; deploy using `cf` and verify the deployed candidate.
6. Update engineering feature inventory and handoff after each checkpoint.

## Development notes and limits

Dev server: retained exec session `49697`, http://127.0.0.1:5173. Use `npm run dev`, `npm run check`, `npm run test:browser`, `npm run deploy` (cf CLI, no Wrangler). Latest build/test evidence under ignored `artifacts/`.

Records and extracted text are browser-local; uploaded originals are processed but not retained. No shared accounts, background email/push, official submission integration or verified automated renewal eligibility. ICS requires calendar import. Only HRM commercial renovation has automated requirements. Other NS municipalities use manual tracking and verified source resources. Runtime Workers AI is real when configured; deterministic fallback is labelled. Root `.env` is development orchestration credentials, never runtime application configuration; do not print or publish it.

User said not to stop workers. No workers were paused. No presentation generation is active.

Current candidate changes: resources tab + reviewed Truro address/scope autofill; canonical AI field aliases. Full check in artifacts/current-check.log. User latest dashboard now authoritative; worker integration pending. No automatic applicant or ambiguous contractor autofill.

Validation checkpoint 11:35 Halifax: integrated 143/143 tests pass, browser 6/6 desktop+narrow including actual Truro PDF download/readback with 96 fields retained and identity/date/ambiguous contractor untouched. Dashboard worker currently recovery_required (stale result run_id) and latest delivered artifact is OLD64e78a5 base; do not import over new31351f1 dashboard. Follow-up sent to recover and rebase onto31351f1.

Latest public: full12/12 browserPASS; modelcanonicalkeyprobePASS. Localidentitycorrection client/owner/applicant nowdistinct, 145testsPASS. LatestUIworkerrecovered and has preserved old64e78a5artifact separately; new31351f1 adaptationunderway. QA lifecycleartifact recovered+testsadaptedandvalidated. Do not run concurrent Playwright suites sharingtest-results/: one prior run had artifactcollision, sequentialpublicrerunpassed12/12.

Published6a79977 identityfix: 145unit/APItestsPASS; full12localbrowserPASS, affected8publicbrowserPASS. Currentdashboardworker stillbuilding newbase31351f1; collecttestedartifact before importing.
