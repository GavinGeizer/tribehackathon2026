# PDF processing scope

Original files are distributed unchanged. Field counts below were measured using pypdf; they are not a promise of pdf-lib editing support. Some government PDFs contain editing restrictions or structures that pdf-lib interprets differently. The application offers original downloads, with no provincial autofill. Original hashes, readability and pypdf field counts are validated separately with the provided validator.

# Lead integration note

Six additional resources integrated into the current catalog. Schedule A deduplicated by original PDF URL/hash against the initial lead entry. Original professional/septic/fuel/appeal PDFs retained; no applicability or regulatory-rule changes. Lead independently used Firecrawl for the government index, Schedule A and fuel-safety referring pages. Latest integrated candidate tests must be read separately from worker older-base test results below.

# NS Government (provincial) construction/permit form pack — research record (2026-10-10)

- Retrieval date: **2026-10-10** (all fetches this day).
- Base SHA: prior commit `c634ed9` (14-file pack) on `permitpath/build`; this
  revision trims to **7 files** per lead direction (small verified 4–8 PDF pack).
  Branch base `0307b8c` verified earlier; requested `6a79977` in-history,
  delta docs-only.
- Scope: worker owns `deliverables/ns-government-forms/**` and
  `frontend/public/official-forms/provincial/**` plus
  `tests/resources/provincial-catalog.test.ts` ONLY. Did NOT touch
  `frontend/src/domain/resources.ts`, ResourcesTab, app/config, or shared tests.
- Method: **Firecrawl UNAVAILABLE on worker VM** — no `firecrawl` CLI, no API
  key; lead-saved `lead.firecrawl/ns-government-forms-search.json` is NOT on
  the VM (checked). Fallback: direct official-source `curl` fetches (HTTP 200,
  final URLs recorded) + `pypdf` inspection (isolated deps, nothing shipped).
  Starting point per lead: official index
  https://www.novascotia.ca/building-code-forms-and-documents (HTTP 200,
  verified; canonical, redirects from beta URL).
- Manifest: `manifest.json` — 7 `OfficialResource` entries using the EXACT fields
  from `frontend/src/domain/lifecycle-types.ts`, all `jurisdiction:
  nova_scotia`, all `verifiedOn: 2026-10-10`, `verificationStatus: verified`,
  plus `files[]` (`resourceId, filename, sourceUrl, sha256, bytes, fieldCount`).
- Shipped PDFs: `forms/` holds ONLY public official-provided PDFs (7 files, all
  `%PDF-` magic, pypdf-readable). **Parsed PDFs are untrusted data.**
- "Fillable" claimed ONLY where `pypdf get_fields()` returned fields.
- **No universal provincial building-permit form is claimed or used in this pack.**
  Building permits in NS are municipal; every entry carries an explicit SCOPE
  caveat (appeal-only / septic-only / permit-supplement / fuel-only).

## 1. Verified sources (evidence)

### Official index (starting point, per lead)

1. **Building code forms and documents** (Government of Nova Scotia) —
   https://www.novascotia.ca/building-code-forms-and-documents (final URL same
   after redirect from `beta.novascotia.ca/building-code-forms-and-documents`;
   HTTP 200 2026-10-10). "Collection of forms and documents that engineers,
   architects and interior design professionals need to use for field reviews
   of construction, as well as resolving disputes." Hub only, no PDF shipped.

### Appeal track (1 form shipped)

2. **Apply for a hearing with the NS Building Advisory Committee** —
   https://www.novascotia.ca/apply-hearing-nova-scotia-building-advisory-committee
   — "Apply for a hearing with the [NSBAC] if you disagree with a decision
   from a building official."
   - PDF: `.../2-1472/nova-scotia-building-advisory-committee-hearing-application-form-en.pdf`
     ("Hearing Application Form (PDF 94 kB)") → `forms/nsbac-hearing-application.pdf`
     (1 p, 20 fields, sha `55c7db03…`). Catalog `nsbac-hearing-application`.
   - Companion List of Exhibits page (lead-provided URL) verified reachable
     200 but its PDF NOT shipped in this trimmed pack (kept pack small; noted
     as follow-up candidate):
     https://www.novascotia.ca/list-exhibits-hearing-form-nova-scotia-building-advisory-committee-hearing

### Permit-supplement track (1 form shipped)

3. **Building permits: schedule "A" letters of undertaking** —
   https://www.novascotia.ca/building-permits-schedule-letters-undertaking —
   "You need to submit Schedule “A” Letters of Undertaking with your
   application for a building permit if you use the services of engineers,
   architects or interior design professionals."
   - PDF: `.../4-1453/nova-scotia-building-code-regulation-schedule-letters-undertaking-en.pdf`
     ("(PDF 422 kB)") → `forms/nsbc-schedule-a-letters-undertaking.pdf`
     (24 pp, 256 fields, sha `ad88408f…`). SUPPLEMENT, not standalone.

### Septic track (4 forms shipped; NSE)

Referring pages (both HTTP 200 2026-10-10):
- https://novascotia.ca/nse/wastewater/regulations.tech.guidelines.asp
- https://novascotia.ca/nse/resources/permits.asp

4. **On-site sewage application for approval** —
   `https://novascotia.ca/nse/water/docs/Onsite-Sewage-Application-for-approval-form.pdf`
   → 3 pp, 66 fields, sha `a0e54d49…`. Provincial septic approval only.
5. **On-site sewage notification** —
   `https://novascotia.ca/nse/water/docs/Onsite-Sewage-Notification-form.pdf`
   → 3 pp, 53 fields, sha `d2393fb2…`. Septic notification pathway only.
6. **On-site sewage submission details** —
   `https://novascotia.ca/nse/water/docs/Onsite-submission-details-for-applications-for-approval.pdf`
   → 2 pp, 83 fields, sha `8c269baa…` (requirements companion).
7. **On-site sewage 24-hour construction alert** —
   `https://novascotia.ca/nse/water/docs/Onsite-Sewage-24-hour-construction-alert-form.pdf`
   → 1 p, 15 fields, sha `4587d4eb…`.

### Fuel-safety track (1 form shipped; NEW this revision)

Referring page: https://novascotia.ca/lae/fuelsafety/ (HTTP 200 2026-10-10;
`permits.asp` serves identical content). Links "Gas Permit and Gas
Registration (PDF)".

8. **Fuel Safety Permit Application Form (Gas Permit and Gas Registration,
   under section 18 of the Fuel Safety Regulations)** —
   https://novascotia.ca/lae/fuelsafety/docs/fuel-safety-permit-application-form.pdf
   → `forms/fuel-gas-permit-application.pdf` (3 pp, 54 fields, sha `8afef021…`,
   verified 200, final URL identical). Opening text confirms purpose
   ("Fuel Safety Permit Application Form (under section 18 of the Fuel Safety
   Regulations)"). Catalog `fuel-gas-permit-application` (application_form/pdf).
   SCOPE: fuel/gas installations only — NOT a general building-permit form.

## 2. Trade-offs (few verified > many guessed)

- Trimmed 14 → 7 to meet the 4–8 requirement. Dropped (all previously verified
  200, documented in git history `c634ed9` if the lead wants them back):
  NSBAC reply/withdrawal/exhibits forms, NSBAC rules of procedure, NSBC
  regulations user guide, septic malfunction-inspection + installation
  certificate, installer certificate app. Rationale: keep one appeal entry
  point, one permit supplement, the core septic lifecycle (apply/notify/detail/
  alert), and add the lead-requested fuel form.
- Rejected/404 guesses (NOT catalogued): `lae/buildingcode/forms.asp` (404),
  `dma/building-and-fire/` (404), `dma/building-codes-standards/` (404),
  beta-document-guess URLs (404), `/nse/septic-management/`, `/nse/septic/`,
  `nse/surface-water/septic.asp` (404), `www.novascotia.ca/onsite-sewage-*`
  beta guesses (404). NSE approval-process page is a demo placeholder — unused.
- No legal-requirement automation: no expiry/renewal/eligibility claims made
  (none found in inspected sources). Manual-download/manual-submit only.

## 3. Submission finding (scoped negative)

- Inspected: building-code hub + form pages, NSE forms/permits pages, LAE fuel
  safety page. **No publicly documented submission API** for any shipped form.
  Fuel safety has an online install-permit portal link (manual web portal, not
  a documented API — not catalogued as a resource, mentioned here only).
  Scoped to inspected pages, NOT universal.

## 4. Renewal eligibility

- **Unknown / not applicable.** No inspected source states validity, renewal,
  or eligibility for any of the 7 forms. No renewal automation proposed.

## 5. Ownership / files

- Worker-owned NEW files only: `deliverables/ns-government-forms/`
  (manifest.json, forms/*.pdf ×7, research.md THIS file,
  form-pack.tar.gz, tests/validate_provincial_pack.py),
  `frontend/public/official-forms/provincial/*.pdf` (7 byte-identical copies),
  `tests/resources/provincial-catalog.test.ts` (standalone, reads manifest).
- Untouched: `frontend/src/domain/resources.ts`, ResourcesTab, app/config,
  shared tests, municipal packs. Deps isolated to `/tmp/opencode/pp-deps`.

## 6. Unanswered questions (for lead / follow-up)

1. Firecrawl re-verification of the 7 URLs + hub pages (lead-owned).
2. French versions exist for building-code forms — English pack only; decide
   on bilingual shipping.
3. Septic approval-vs-notification thresholds — needs regulation text review.
4. Dropped 7 files restorable from git history if lead wants a larger pack.
5. Lead integration: wiring manifest into `resources.ts` + KNOWN_FORM_FILES +
   manual steps (lead's job, not done here).
6. Fuel track follow-ups: gas business licence, technician licence
   applications, online install-permit portal scope — candidates, unverified
   this run.
