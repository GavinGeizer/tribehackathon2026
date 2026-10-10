# PermitPath — Competitor & Source Research

Retrieval date: 2026-10-10. Method: direct fetch of primary sites (Firecrawl not available in this environment; used WebFetch). Claims below are limited to what each site states about itself. No claim is made that any competitor lacks a specific feature unless that is explicitly supported.

## 1. PermitFlow — https://www.permitflow.com/ (retrieved 2026-10-10)

- What it says it is: "AI pre-construction platform" / "Construction's AI Workforce" for contractors, home builders, developers, architects.
- What it says it does: AI agents for intake, research (permit database + AHJ portals), submission (prepare forms, attach docs, "file directly with the AHJ"), coordination, issuance; permit, inspection/closeout, license management.
- Stated scale/marketing figures (vendor claims, unverified by us): $20B+ construction value permitted, 12M+ data points, 7K+ AHJs, Series B $54M announcement banner. Do not repeat as our validated facts; attribute as vendor-stated.
- Relevance to PermitPath: full-service, US-oriented permitting operations platform. PermitPath differs in role/scope: contractor-side pre-submission readiness check scoped to Halifax commercial renovation, browser-local, no submission filing. No claim made about PermitFlow's Halifax coverage.

## 2. GreenLite — https://greenlite.com/ (retrieved 2026-10-10)

- What it says it is: AI-powered permitting + plan-review platform serving builders and building departments; services: permit management, private plan review, code compliance / pre-check; products Atlas and LiteTable.
- What it says it does: full-service permit management from submittal to issuance; expert-led plan reviews; jurisdiction-specific checklists; private plan review with stamp in approved jurisdictions.
- Stated marketing figures (vendor claims, unverified): $100M+ unlocked revenues, 60% permitting-timeline reduction, 1800 revision cycles removed; case studies (e.g., multi-state retail, Florida restaurant). Attribute as vendor-stated; do not present as independent results.
- Relevance: full-service + expert review model. PermitPath differs: lightweight self-serve QA before submission, deterministic rules with evidence quotes, no expert stamp, no filing. No claim about GreenLite's Halifax support.

## 3. Clariti / CivCheck — https://www.claritisoftware.com/ (retrieved 2026-10-10)

- What it says it is: permitting software for governments ("Permit Your Way"); products: Enterprise (large governments), Launch (small/mid governments), CivCheck guided AI plan-review software, Guide.
- CivCheck (vendor-stated): guided AI plan review; "Every AI interpretation requires staff review and approval"; real-time code updates; "99% code books covered" (vendor claim).
- Buyer is the government, not the contractor.
- Relevance: PermitPath is contractor-side and complementary in role: it prepares the applicant's package before it reaches a government system like Clariti. No integration with Clariti exists or is claimed.

## Positioning summary (supported only)

| Vendor | Stated buyer | Stated scope |
|---|---|---|
| PermitFlow | Contractors/builders/developers/architects | Full-service AI permitting operations incl. filing |
| GreenLite | Builders + building departments | Full-service management + expert/private plan review |
| Clariti/CivCheck | Governments | Permitting system + guided AI plan review with staff approval |
| PermitPath (planned) | Small Halifax contractor (hypothesis) | Pre-submission evidence QA only; no filing, no stamp |

## Municipal sources (for rules; regulatory worker owns rule text)

- Halifax commercial-renovation requirement table (PDF): https://www.halifax.ca/media/72812 — retrieved 2026-10-10 (PDF confirmed reachable; content extraction delegated to regulatory worker).
- Halifax changes-existing guidance + naming guide 71350: cited in plan/design docs; independent original-PDF validation underway by regulatory worker — do not cite row details here until verified.
- Rule rows in the pitch (600 m² / 3-storey boundary examples) mirror the interface predicates in `frontend/src/domain/types.ts` (proposedArea, storeys) and the plan's "area/storey boundary AND/OR logic" review focus. Cite official source rows only after regulatory verification.

## Limitations

- No Firecrawl; pages fetched as rendered markdown, may omit dynamic content.
- No pricing pages inspected deeply; no pricing comparison claimed.
- No customer results, no validation interviews conducted.
