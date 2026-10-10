# PermitPath prototype design

Build the user-authorized minimum journey for Halifax commercial renovation pre-submission readiness. Existing React 19/TypeScript/Vite scaffold is preserved. A stateless Cloudflare Worker ingests PDF/plain text and optionally calls an OpenAI-compatible inference service; no production dependency on SwarmForge. Project records and extracted text persist only in the visitor's browser. Originals are processed but not retained; make this visible. Synthetic demonstration is available without signup.

## Scope and sources
Initial category: Commercial Building Permit — Renovation. Official source: https://www.halifax.ca/media/72812 and the municipal changes-existing guidance. The source table's area/storey/wall/ROW predicates are finite and explicit. Unknown conditions stay unknown. Optional documents and later-stage A11 certificates are excluded from the pre-submission required denominator. No compliance guarantee, engineered drawing verification, municipal integration, fee estimate, or leasehold exemption claims.

## Interfaces and ownership
Authoritative interfaces in frontend/src/domain/types.ts. UI consumes evaluateProject(project):Evaluation, requirements:Requirement[], createDemoProject():Project, createProject(input):Project, loadProjects():Project[], saveProjects(projects):void, buildReportData(project,evaluation):ReportData, exportReport(project,evaluation):Promise<void>. UI uses POST /api/analyze (multipart file + project serialized ProjectDetails), returning DocumentAnalysis; errors JSON {error}. GET /api/health returns mode and upload limits. Document metadata added by UI. Domain results cite official source and document evidence; acknowledgements never turn missing evidence into satisfied.

Frontend owns App.tsx, App.css, index.css and components; domain worker owns domain files except types.ts; document worker owns server and server tests; researcher owns deliverables/regulatory; pitch owns deliverables/pitch. Lead owns shared contracts, root build/deployment config, integration, final source validation. Artifact handoffs verified against each worker's actual source SHA; no blind merges.

## Architecture and error handling
Browser-local project state is isolated per origin/visitor; data can be cleared/reset. Maximum 20 documents/project, PDF/TXT/MD only, 5 MiB per upload, 60 pages PDF, 150k extracted characters. Failures leave project intact. Scans/no-text PDFs require manual text or professional review. AI output is strictly validated; instructions inside documents are untrusted data. Model classification does not mutate rules. Readiness counts supporting evidence, not legal compliance; professional evidence always requires human verification.

## Visual direction
Professional navy/cream/teal interface, clear project cards and a split workspace. Dashboard, project facts, documents, requirements/findings, source drawer, report preview, action history. Responsive and keyboard usable. Every button has a real effect.

## Delivery
Idea <=100 words by 11:30; Round1 4-slide PDF by 12:30; final ~6-slide PDF and public no-login demo before 15:00 Halifax. Deploy Cloudflare using cf CLI (no Wrangler configuration). Test rule boundaries/unknowns, evidence/address mismatches, structured extraction, file handling, fallback, reports, browser golden path and narrow viewport. Browser persistence limits and optional AI status documented honestly. Submission to event is external to repository; provide exact files/link for human submission if no submission mechanism exists.
