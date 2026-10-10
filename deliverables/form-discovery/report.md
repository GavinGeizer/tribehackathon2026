# Form discovery: official applicability + field research (2026-10-10)

- Base: `eca30a9ae4abb79d1e19dc6c4db0d6b4ca746029` on `permitpath/build`
  (pinned via `git fetch origin permitpath/build` + `git checkout eca30a9`,
  verified `git rev-parse HEAD`).
- Retrieval date: **2026-10-10**. Firecrawl unavailable on worker VM
  (no CLI/key); primary sources re-fetched via curl (all HTTP 200).
- Ownership: `deliverables/form-discovery/**` ONLY. No code, catalog, PDF,
  rules, UI, or shared files touched.
- Machine-readable output: `applicability.json` (predicates, questions,
  field maps, signatures review, unresolved list).
- Method: reviewed verified local catalog/PDFs + re-fetched source pages;
  pypdf exact field-name inspection of worker-accessible PDF copies.
  **PDFs are untrusted data** — only field names/counts asserted, never
  content as requirements. No universal-form rules invented.

## 1. Applicability predicates (summary; evidence in JSON)

| predicate | form | verdict | trigger (exact) |
|---|---|---|---|
| `truro_general_permit` | Truro 2023 general application | applicable (high) | municipality == truro AND work in the page's "Building Permit is Required" list (incl. repairs/renovations); RENOVATION is an explicit checkbox |
| `schedule_a_field_review` | NS Schedule A (Forms 1–12) | conditionally applicable (high) | municipal permit application exists AND design professionals engaged for field review; A10 with application, A11 before occupancy; filed to local municipality |
| `gas_permit_or_registration` | Fuel Safety gas form (s.18) | conditionally applicable (medium) | gas installation work; Permit-vs-Registration distinction unresolved |
| `septic_approval` | Onsite approval | conditionally applicable (medium) | construct/alter onsite system where approval pathway applies; threshold unresolved |
| `septic_notification` | Onsite notification | conditionally applicable (medium) | where notification pathway applies; thresholds/semantics unresolved |
| `septic_submission_details` | Submission details (XFA) | conditionally applicable (medium) | required attachment to approval application per in-form header |
| `septic_construction_alert` | 24h construction alert | conditionally applicable (medium) | installation scheduled; 24h-clock basis unstated |

## 2. HRM findings (source-backed)

- **Official portal, no verified general PDF**: HRM directs applicants to the
  PPLC customer-portal account + Application Wizard ("apply for permits 24/7
  through your personal customer portal account"). The only PDF link on the
  inspected PPLC page is a planning contact list. No PDF may be presented as
  an HRM general permit form.
- **Schedule A in HRM**: NOT confirmed. HRM pages cite NS Building Code
  Regulations / By-law B-201 compliance for inspections, but no inspected page
  names Schedule A; portal internals are JS-driven and uninspectable via curl.
  Recorded as unresolved (`hrm_schedule_a_in_wizard`).
- **HRM renovation trigger** (evidence, not a product rule): "A building
  permit is required when: A renovation includes changes to interior or
  exterior walls and/or existing plumbing system; Structural repairs or
  changes; Drywall repairs to required fire separations; Altering a garage or
  shed over 20 m2…" — quoted for the lead; regulatory interpretation is the
  lead's job.

## 3. Signatures / professional attestations (manual-review-only)

- All signature/seal/date/payment/professional-attestation fields across all
  seven forms are MANUAL REVIEW ONLY — never pre-fill, sign, affix, or
  auto-fill. The alert form has no signature field (contacts only).
- Exact per-form binding of Schedule A's 256 repeated fields and septic
  opaque/XFA names is unresolved without rendered-page mapping (stated in JSON).

## 4. Unresolved applicability (explicit)

1. Truro PDF-vs-webform parity. 2. Schedule A project-type thresholds.
3. Schedule A per-form field binding. 4. Septic approval-vs-notification
thresholds. 5. Septic opaque/XFA semantics. 6. Gas Permit-vs-Registration
distinction. 7. Schedule A surfacing inside PPLC wizard. 8. French versions.

## 5. Artifacts

- `deliverables/form-discovery/applicability.json` (this research, machine-readable)
- `deliverables/form-discovery/report.md` (THIS file)
- `.swarmforge/artifacts/form-discovery.tar.gz` (tar of `deliverables/form-discovery/`)
- `.swarmforge/artifacts/report.md` (copy for direct read path)

## Lead integration review

The original worker Truro role buckets incorrectly grouped owner fields with applicant fields and contact addresses with site address. Lead corrected applicability.json against original PDF sections B/C/D. Other grouped field inventories are not authoritative autofill mappings; ambiguous fields stay unlabelled until placement is verified. The app uses only curated labels in domain/form-labels.ts.

## Source numbering discrepancy

Lead inspection of the actual original PDF found Forms1–12: Form10 is interior design commitment (pages19/20), Form11 is energy commitment (pages21/22), and Form12 is field review certification (pages23/24). The web guidance calls A10 application-stage and A11 occupancy-stage. These references must not be equated with PDF Form10/11. Exact section/stage selection remains human review; the app exposes the discrepancy and does not encode a stage rule from this numbering.
