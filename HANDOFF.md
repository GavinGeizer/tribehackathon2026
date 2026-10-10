# PermitPath engineering handoff — START HERE

Last updated: 2026-10-10 10:50 Halifax (13:50 UTC). Application target: **15:00 Halifax today**. User requests autonomous implementation, SwarmForge as primary orchestration, official research via Firecrawl, tested public deployment. Latest user override: **SOFTWARE DEVELOPMENT ONLY. No further presentation, marketing, deck, Q&A or submission work.** Previously generated presentation files are historical; do not regenerate them or spend engineering time on them. Human handles competition submissions.

## Workspace and source

- Primary workspace `/home/overlord/hackathon/tribehackathon2026`.
- Branch `permitpath/build`, remote `https://github.com/GavinGeizer/tribehackathon2026.git`.
- Last committed HEAD `3b72f2d6f02c39833f79a5dbe472db70c1623d93` (domain implementation). **Substantial tested changes are UNCOMMITTED. Preserve them.** Run `git status --short` before edits. Do not reset/clean/switch away.
- Remote main `23d3cd58a917795b0929e2607545562b47da6ebb` contains teammate scaffold cleanup; main is preserved. Our branch began from its parent27e6cf2. All app work is isolated on build branch. Do not force push or merge main blindly.
- Environment grants full filesystem/network permission; approval policy never. User said all needed permissions granted, including delivery. Follow AGENTS.md: Cloudflare interactions use **cf CLI** because no Wrangler config exists.
- Secrets in root `.env` are for **development SwarmForge**, ignored. NEVER print/source into app/use as runtime inference keys. `swarmforge config show --env-file .env` redacts values. Cloudflare CLI OAuth already authenticated.

## What works now

React19/TypeScript/Vite app + stateless Cloudflare Worker. Browser-local projects/extracted text (no team/server record sync), server PDF/text extraction, provider-neutral AI adapter, strict schema/quote/value/page validation, deterministic fallback. 13required Halifax commercial-renovation rows,9optional entries,A11laterstage; raw complete39-row source transcription preserved separately. Unknown applicability remains unknown; professional/ambiguous evidence requires human review; acknowledgements never satisfy missing evidence. Source-backed evidence inspection, corrections, activity log, PDF export, full report preview, synthetic samples, responsive interface.

Synthetic seed: Juniper Studio storefront renovation / Seabright Works,120 Example Lane,Halifax,NS(synthetic),450m² total-building assumption,2storeys,externalWalls true,road ownership unknown/ROWwork true,heritage unknown. Initial counts1supported/2applicable,1missing,2unknown,1internal address conflict. Construction summary valid presence; elevations missing; description intentionally122ExampleLane. Add /demo/A-201-Elevations.pdf; remove wrong description and add /demo/replacement-project-description.txt. Missing/conflict counts reach0; source ambiguity/professional adequacy remain review, no compliance guarantee.

## Run / verify

```sh
npm ci
npm --prefix frontend ci
npm run dev
npm run check
npm run test:browser
```

- Existing dev process unified exec session97439: `npm run dev`, URL `http://127.0.0.1:5173/`; React + Worker together via cf/Vite. Tool sessions may not survive handoff; check curl then restart only if unavailable.
- Browser dependency @playwright/test1.64.0, matching Chromium1248 installed. Config `playwright.config.ts` tests desktop1440 and narrow390. `DEMO_BASE_URL=<public URL> npm run test:browser` tests deployment with fresh contexts/no login.
- Last stable browser run: **4/4 pass** after mobile header overflow fix (exec61241); golden path includes source link, acknowledgement invariant, PDF/text uploads, address correction, report preview, actual PDF download, reload persistence, and project creation with typed decimal m² facts. Prior failures were fixed; don't cite old failures as current.
- Last consolidated unit/API run **86pass/0fail** (58server +28domain/integration), exec97377/check log. TWO new AI compatibility regressions since then individually passed; full suite should now be88 (rerun after final edits). Server typecheck passed after new compatibility changes.
- `artifacts/check-output.log`, `artifacts/browser-results.json`, `test-results/**` contain QA evidence (ignored). Actual exported report PDFs in test-results. Unit report tests verify real %PDF, multipage output, citations/evidence/acknowledgements/disclaimers.

## Deployment / live AI — highest current priority

- **NO PUBLIC DEPLOYMENT YET.** `cf build` and deployment dry run passed earlier; latest candidate needs final build and publish.
- root scripts delegate to frontend. Canonical config `frontend/cloudflare.config.ts`; root config reexports it. Worker namepermitpath,server/index.ts,compatibility2026-10-10,nodejs_compat,ASSETS binding,AI binding, logs+traces. Do not run root plain cf build (Vite root/output mismatch); use npm run build or cf in frontend.
- Build output `frontend/.cloudflare/output/v0/`. Deploy with `npm --prefix frontend exec -- cf deploy --prebuilt` after npm run build. Literal public URL must come from returned deployment; never invent it. Check name collision if needed. User explicitly wants accessible no-login deployment.
- `server/ai.ts` default now **@cf/meta/llama-3.3-70b-instruct-fp8-fast**. Original8b-fp8 did NOT support JSON Schema; real cf AI call returned that error. Official JSON Mode docs list70b as supported. Direct cf CLI70b call with exact app payload succeeded and returned grounded address/type fields. Pricing source official: $0.293/M input +$2.253/M output, not unlimited/free credits.
- Updated response parsing supports `{response:object}` plus string/choices; strict validation still applied. Fixed detached AI.run receiver (now ai.run called on binding), with failing-then-passing regression. **Last local app AI call still fell back immediately; it was sent right after HMR edits. Recheck now after server settles.** May need `bindings.ai({dev:{remote:true}})` / cf Vite remote binding config; installed @cloudflare/config types and official docs support dev.remote. Do not silently claim inference works through app yet.
- Files `artifacts/model-input.json`, `model-output-70b.json`, `live-ai-description.json` are synthetic-only debugging payloads, not keys. CLI smoke inference worked. App test must demonstrate two different input documents yielding real method:model with grounded results; fallback must remain clearly deterministic on service failure.

## Latest changed files / ownership

- Lead integrated final Swarm frontend and server artifacts; no Swarm worker currently editing these. App/component/styles changes currently uncommitted.
- Native domain agent implemented domain files and tests, committed3b72f2d; finished. Native report-preview agent added `frontend/src/components/ReportPreview.tsx`, lead wired it in Report.tsx; finished.
- Lead added corrupt-storage explicit confirmed Reset browser workspace, brand tagline, mobile header/CSS correction, real AI compatibility/receiver fixes, browser test config/suite, source-review docs. These are uncommitted; preserve.
- server/index.ts bounds entire request before multipart parse (~6MiB) including unknown Content-Length; files≤5MiB,60PDFpages,150kchars. No uploads persisted. Strict grounded AI schema, timeout + deterministic fallback, model uncertainty preserved. Independent server review cleared prior5findings; later AI fixes need full verification.
- Domain review cleared booleans, energy grouping, heritage aggregation,13required mapping, professional substitute review, unknowns/ack invariants. Unit labels nowm² (criticalft²bug fixed), sourceTotalArea assumption visible. Runtime intentionally subset23municipal entries; not full building-code/optional coverage.

## SwarmForge operational facts

- Installed CLI `/home/overlord/.local/bin/swarmforge`, source/docs `/home/overlord/swarmforge`, actual upstream discovered `https://github.com/GavinGeizer/swarmforge-oss.git`.
- Current repo coordinator at http://127.0.0.1:8787/mcp; tools `mcp__swarmforge__*` available via functions.exec tools. Discover exact schemas through ALL_TOOLS; don't invent commands.
- Config points this Git repo,50worker limit,4concurrent provisioning. Git automatic pushdisabled. Workers clone main unless prompt explicitly fetch/checks out pinned build SHA. **Always verify actual source revision.** Hand off tar artifact, inspect manifest/path/symlinks, download via `swarmforge artifacts download ARTIFACT_ID --output PATH --json`, verify hash automatically, extract only owned paths. Do not blindlymerge. Worker tests on old revisions are not candidate verification.
- All six workers currently settled. IDs:
  - regulatory w-932a408e-228c-458b-8280-b6464a5a07ab (completed; research available).
  - prior presentation w-ee12595e-2624-4b2d-a9b3-6d053525b002 (**retire presentation workstream; reassign engineering only**).
  - frontend w-eb79d22f-3e46-4db7-9b2e-1165e6b27a48 (completed; base74b915a +contractfb53767).
  - stalled domain w-130dc709-aafc-43f2-ba41-4dc202e9262f (cancelled after no files; native fallback recovered). Do not resume duplicate work.
  - documents w-a0ee1680-4066-4b3b-ae51-13cf113a012b (completed; base74b915a +contractfb53767).
  - QA fixtures w-b9407c08-a961-4828-bb86-06a9f68c0bb5 (completed; synthetic PDFs/text).
- Final frontend artifactart-e8dc3c16-951a-4ebf-8b14-4d3cf5c2647c hashca421112...; final documentsart-a111e0b7-d5f3-4fc0-a2e6-a763ca991f64 hash84cd480...; final researchart-2052e4e7-f2f6-41d0-ae3f-18e01481cf23. All integrated. Do NOT re-extract old artifacts over lead fixes.
- Preserve/release unused workers using normaldestroy settled checks when done; neverforce source deletion. Artifacts and branch preserve results. Reassign existing completed VMs for next bounded engineering tasks if helpful (send_worker_message queues newturn).

## NEW USER SCOPE — next engineering slices

Province-wide lifecycle platform for individuals/homeowners and contractors through enterprise. Seven capabilities: authorized automatic submission/fallback guided export; verified AI form discovery; reviewed AI form autofill; compliance QA/audit; approved renewal preparation; expiration notifications; expanded discrepancies. User explicitly accepts milestones for incomplete capabilities; NO fake integrations/coverage.

Current next tasks (not dispatched yet as of this handoff):
1. Finish live app AI verification + deploy stable existing vertical slice first. Update docs/FEATURES.md with tested vs pending.
2. Lead define additive shared lifecycle/types contract, optional Project lifecycle/jurisdiction metadata so older browser records migrate safely. Municipal selection must gate Halifax rules; otherNSmunicipalities without verified packs show coverage unavailable/manual-review, never reuse Halifax rules as province-wide law.
3. Swarm worker lifecycle engine: permitstatusdraft/preparing/submitted/issued/expired; manualrecordpermitnumber,issuedAt,expiresAt; configurable reminders; calendarICS export; in-appdue notifications; renewaldraft lifecycle with explicit humanreview; auditlog. No invented universal expirydates/renewaleligibility. HRM guidance mentions2yearbuildingexpiry but don't autoapply to unrelated permits.
4. Swarm frontend worker: jurisdiction/role selection, permitlifecycle tab, dashboarddue notices, reminderconfig and realcalendar export, applicationpreparation/handoff tab with reviewed suggestedfields. Wire only actual supported APIs/engines, no deadbuttons. Lead owns App integration to avoidconflict.
5. Swarm regulatory worker: FirecrawlofficialNSmunicipal/provincial discovery; verified formcatalog/portal URLs/renewal-expiry sources. Otherworkflowrules only whenfullyverified; human-facingcoveragecatalog canlinkofficialsourceswithoutclaimingautomatedassessment. Check officiallysupportedsubmissionAPI; absent evidence -> guidedmanualportal/export.
6. Swarm AI/document worker: additional source-grounded owner/client/projectname/description conflicts, reviewed reusablefield suggestions; preservefieldorigin anduserapproval, neverautocorrectregulatoryfacts. Autofillonly genuinelysupportedform (structured applicationworksheet /fillableofficialPDFifverified), distinguish internalworksheetfromofficialform.
7. QA worker: integratedexactSHA unit/API/browser/regression tests fornew lifecycle/date/ICS/jurisdiction gates/discrepancies and deployedgoldenpath. Keep essentialjourney stable, syntheticdata only.

Critical remaining work: publicdeployment verification, real app AI, new boundedlifecycle/formslice, coverage gating, final technicalfeatureinventory. Time remaining ~4h10. Do not let expanded vision become an unsupported province-wide compliance claim. Keep original goldenpath functional.

## Sources / files

Official HRM https://www.halifax.ca/media/72812 (5page renovation table),71350 naming,72829leaseholdcontext,changes-existing guidance. `deliverables/regulatory/` stores originals/hashes/quotes39rows/naming30strings/research/Python validation. Firecrawl cache `.firecrawl/` ignored; CLIauthenticated locally (use networkpermitted). Date2026-10-10. `docs/REGULATORY-REVIEW.md` records source ambiguity/interpretations.

Read current AGENTS.md, README.md, types.ts, docs/STATUS.md and this handoff before starting. User override above supersedes old design/plan presentation tasks. Do not delete historical user artifacts without instruction; just leave them inactive and out of new deliverables.
