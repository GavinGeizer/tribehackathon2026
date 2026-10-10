# PermitPath regulatory research — Halifax commercial renovation (pre-submission QA prototype)

- Retrieval date: 2026-10-10 (all sources fetched this day; see SHA256 below)
- Jurisdiction: Halifax Regional Municipality (HRM)
- Permit type: commercial-renovation (existing commercial / large-scale residential / mixed-use — renovation stream)
- Base SHA (actual, verified `git rev-parse HEAD` in /workspace/repo): `23d3cd58a917795b0929e2607545562b47da6ebb`
  - NOTE: the dispatch cited `27e6cf20f9c4dcafc7ba0dbff59cee5d129b3a37` as "current remote main".
    That SHA exists locally but is the *parent* commit (initial frontend scaffold); HEAD has since
    moved one commit forward (`23d3cd5` "refactor: remove unused assets and styles").
    `git status` reports branch `main` up to date with `origin/main`. All regulatory work below is
    anchored to actual HEAD `23d3cd5`.
- Demo scenario evaluated: standalone commercial interior renovation, whole-building area 450 m²,
  2 storeys, external-wall alteration = Yes (to exercise the Elevations branch), NOT a mall leasehold.

## 1. Sources (evidence)

| # | URL (as tasked) | Final URL after redirects | Type / pages | SHA256 of local copy | Used for |
|---|---|---|---|---|---|
| 1 | https://www.halifax.ca/home-property/building-development-permits/commercial-mixed-use-building-permits/changes-existing | same | HTML guidance page | n/a (HTML saved in build logs, not shipped) | Renovation trigger definition, ROW/Water/Sign pointers, leasehold FAQ, A11 timing corroboration |
| 2 | https://www.halifax.ca/media/72812 | https://www.halifax.ca/sites/default/files/documents/home-property/building-renovating/Commercial%20Building%20Permit%20Renovation%20Required%20Documents%20table.pdf | PDF, 5 pp (native text) | `26ae97b111a51437335e6bef74247e5953f91e13076b1a8b4b3cdebc4f7e61ff` | `rules.json` — every rule's Required-When condition; `source-quotes.md` verbatim rows |
| 3 | https://www.halifax.ca/media/71350 | https://www.halifax.ca/sites/default/files/documents/home-property/building-renovating/DocumentNamingConventions.pdf | PDF, 4 pp (native text) | `63637293629551ea2dcaaccca49107e5f07ca302b6efe4d4873d0c138710fb48` | `naming.json` — 30 exact Building-permit file-name strings (pp2–3) |
| 4 | https://www.halifax.ca/media/72829 | https://www.halifax.ca/sites/default/files/documents/home-property/building-renovating/Leasehold%20required%20documents%20.pdf | PDF, 1 p (scanned image, no text layer) | `1b17b01335ee6d46f20b58e5b94004db8c1b92fbe2f9eef048675c2a3e6c7301` | Leasehold context only (OCR + Tesseract; NOT encoded into rules.json per "no leasehold exemptions without verification") |
| 5 | https://www.halifax.ca/home-property/building-development-permits/help-using-online-pplc-system/how-apply-a-permit | same | HTML portal help | n/a | Portal integration evidence (manual upload + auto-recognition; 100 MB cap; metric entry) |

- Firecrawl: installed via pip during this run (`firecrawl-py`) but NOT used for retrieval — no API key
  and the task permits "official fetch and PDF tools" as fallback. Retrieval was direct `curl` +
  `pdftotext -layout` (+ `pymupdf` page dump for page attribution, Tesseract OCR for the scanned
  leasehold PDF). This is documented so a future run can re-verify with Firecrawl if desired.
- Exact source wording for every encoded row is in `source-quotes.md` (same directory).

## 2. What the evidence supports (supported workflow)

Pre-submission QA flow supported by the sources:

1. **Trigger check (page, §Changes to Existing):** a Commercial Building Permit (renovation) is
   required when work includes changes to interior/exterior walls, plumbing, structural
   repairs/changes, drywall, garage alteration, space renovation, or non-structural repairs > $10,000.
   The demo (interior renovation + external-wall alteration) squarely triggers this.
2. **Size gate (table):** the 600 m² / 3-storey threshold splits the table. At 450 m² + 2 storeys the
   demo falls in the "small" branch: Construction Plan required; Elevations required (ext-walls Yes);
   A10 optional; professional-design rows optional (Existing-Conditions Letter substitute possible
   where work doesn't affect existing design).
3. **Document assembly:** applicant uploads one file per document type (multi-page same-type grouping
   allowed, ≤100 MB each), using the exact `naming.json` prefixes so the portal auto-recognizes types;
   otherwise manual type assignment is required (how-apply page).
4. **Later-stage gate:** A11 Certification of Field Review is submitted after completion, before
   occupancy (table p5 + page corroboration). The QA tool must surface it as a future obligation, not
   a submission blocker — hence `classification: "later_stage"` (1 of 39 rules).
5. **Related permits flagged, not decided:** ROW / Water / Sign permits are referenced on the page
   with their own triggers; only the NSTIR-approval row (fully expressible in finite fields) is
   encoded. The rest are human-review pointers (see §5).

## 3. rules.json design (assumptions made explicit)

- **39 rule objects** (13 `required`, 25 `optional`, 1 `later_stage`). Paired required/optional
  variants are used where the table gives both branches (A10, energy checklist, 7 professional-design
  disciplines), because the schema's `applicability` uses AND/OR predicate groups without negation.
- **Predicates** use the finite fields with `eq|gt|lte`:
  `proposedArea` (number, m² — meaning "Proposed Total Area"), `storeys` (number),
  `externalWalls` ("Yes"/"No"), `onHrmRoad` (boolean), `rightOfWayWork` ("YES"/other),
  plus lead-confirmed shared types `heritageProperty` (boolean|null — combined: designated
  heritage property OR heritage conservation district OR Yes to municipal/provincial heritage
  questions) and `energyDocument` (`'hrm_checklist'|'other'|null`).
  Thresholds are literal from the table: `lte 600` / `gt 600`, `lte 3` / `gt 3`.
- **Boundary assumption:** "less than or equal to 600m2 / 3 storeys" vs "greater than 600m2 /
  3 storeys" leaves no gap (600 exactly → small branch). This is a faithful reading, not an invention.
- **"Proposed Total Area" interpretation (assumption, flagged):** the table never defines whether this
  is renovated area or whole-building area. The demo brief says "whole building area 450m2", and the
  page FAQ ("you apply for a permit based on the size of the overall structure") supports whole-
  building reading. `humanReviewNotes` on size-gated rules record this; QA UI should label the input
  "total building area (verify against application guide)".
- **evidenceTypes** are internal snake_case descriptive labels (e.g. `construction_plan_drawing`,
  `energy_undertaking_letter`, `provincial_road_approval`, `heritage_photos`, `energy_checklist`)
  — NOT municipal codes, per spec. Lead-confirmed labels `heritage_photos` / `energy_checklist` used.
- **`exceptions: []` everywhere:** the table states no explicit exceptions; the Existing-Conditions
  Letter substitute is modeled as descriptive text in the relevant rules, not as an exception. Nothing
  is invented here.
- **`verificationStatus`:** `verified` (35 rules) vs `needs_review` (4: elevations truncation, energy
  checklist ×2 with AND/OR precedence ambiguity, prof-energy N/A). Heritage is now `verified` on the
  lead-confirmed combined `heritageProperty` field. See §4.

## 4. Trade-offs, ambiguities, exception uncertainty

1. **Elevations row truncated (PDF p1):** condition ends "...AND # of Storeys is less than or equal
   to 3 **and**". The verified portion is encoded; rule is `needs_review` and notes flag the dangling
   "and". Risk: a further condition (e.g. heritage overlay) may exist. Mitigation: human reviewer
   confirms against the live table before relying on this rule.
2. **Energy row AND/OR precedence (human interpretation, needs_review):** the source reads
   "Required when Proposed Total Area is greater than 600m2 OR # of Storeys is greater than 3 AND
   Type of Energy Document is HRM Energy Code Checklist" (PDF p2, lead-confirmed location).
   Encoded as ((area>600 OR storeys>3) AND energyDocument==hrm_checklist) — the likely HRM intent —
   but a strict AND-binds-tighter reading gives (area>600) OR (storeys>3 AND checklist), which would
   make the checklist required for ALL large-area projects regardless of document-type choice.
   Both energy rules stay `needs_review`; reviewer must confirm before relying. Shared type
   `energyDocument: 'hrm_checklist'|'other'|null`; null preserved as unknown, not defaulted.
3. **Heritage (lead-confirmed shared type, verified):** `heritageProperty:boolean|null` combines
   designated property OR district OR Yes answers (PDF p2). Required when true; null/unknown preserved
   as unknown → human review / property lookup. QA must never auto-clear heritage. Lead also
   confirmed naming prefixes: heritage `A-901-HeritagePhotos`, energy `W-501-EnergyCodeChecklist`,
   construction `A-102-ConstructionPlan`, elevations `A-201-Elevations`, `NSTIR` — all match
   `naming.json` (original 71350, verified).
4. **Professional Energy Conservation Design = "N/A":** ambiguous Required-When. Encoded `optional` +
   `needs_review` rather than inventing a requirement.
5. **Barrier Free:** table says Optional but cites NS Building Code §3.8 as authority — real obligation
   needs code analysis. Notes require human review.
6. **Property/ROW unknowns:** if `onHrmRoad` or `rightOfWayWork` is unknown, the NSTIR rule outcome is
   unknown → human review. The page's municipal-ROW triggers (driveway, Halifax Water connection,
   road blockage) and the Water-permit trigger (Municipal Water Boundary) are NOT in rules.json (not
   expressible in finite fields) — surfaced as checklist items instead.
7. **Leasehold:** the B-201 excerpt (scanned, OCR'd) lists *minimum plan information* for leaseholds,
   plus sprinkler/structural/Part-9 commitment-certificate conditions. Per instructions it is NOT
   encoded (leasehold exemptions unverified; demo is standalone, not a mall leasehold). Shipped as
   reference PDF + quotes only. Do NOT apply Existing-Conditions-Letter shortcut logic from the mall
   FAQ to non-leasehold projects without verification.
8. **Naming scope:** `naming.json` includes ONLY the 30 Building-permit entries matching renovation-
   table document types (verified exact strings, pp2–3). Other permit types' prefixes (Deck, Sign,
   ROW…) were seen but deliberately excluded. `LOC` and `NSTIR` are literal whole file names in the
   source (no extension/prefix) — preserved exactly.
9. **No API integration claimed:** the portal evidence supports file upload with naming-convention
   auto-recognition, manual fallback, 100 MB/file cap, metric entry, and fee-pay-then-submit. No
   public API or machine-integration endpoint was documented on the fetched pages; `research.md` (this
   file) makes no such claim. Portal "integration" = naming + upload-convention alignment only.

## 5. Exclusions (deliberately NOT encoded — no invented requirements)

- Addition-stream table, fee schedules, inspection-stage documents (beyond A11), Water/ROW/Sign
  permit decision logic, land-use/zoning checks, energy-code technical content, B-201 leasehold
  minimums, processing times, French-language equivalents.

## 6. Independent validation (tests + checklist)

- Automated: `tests/validate_regulatory.py` (stdlib only) checks schema conformance (all required
  keys, finite fields/operators, classifications, `lastVerified`, snake_case evidence types),
  paired-branch sanity, naming.json exactness (30 entries, spot-checks), PDF presence, and evaluates
  the **demo scenario** (450 m² / 2 storeys / ext-walls Yes) expecting: construction plan required,
  elevations required, A10 optional, large-project rules not fired, A11 later_stage present.
  Run: `python3 tests/validate_regulatory.py` from repo root.
- Manual checklist (`CHECKLIST.md`): base-SHA confirmation, PDF re-download hash comparison,
  pdftotext row spot-checks, demo evaluation review, needs_review clearance, tarball contents.
- PDFs shipped in `pdfs/` so any reviewer can re-run `pdftotext -layout` and diff against
  `source-quotes.md`.

## 7. Unanswered questions (need follow-up, ordered)

1. Elevations row: what follows the trailing "and"? (needs live-table or HRM staff confirmation)
2. Definition of "Proposed Total Area" (renovated vs whole-building) — confirm in application guide.
3. "Type of Energy Document" portal values and default behavior (partially resolved: shared type
   `hrm_checklist|other|null` confirmed by lead; AND/OR precedence still open — see §4.2).
4. Heritage question wording in the portal (Municipal/Provincial) + property-lookup source for QA.
   (Partially resolved: combined `heritageProperty` semantics confirmed by lead; portal wiring still open.)
5. Whether Construction Plan has any large-project counterpart (table shows none — confirm omission).
6. Prof-Energy "N/A" intent; Barrier-Free §3.8 trigger specifics for renovations.
7. Water-permit boundary lookup and municipal-ROW determination data source for QA inputs.
8. Currentness: page footer says content last modified 2026-06-08; confirm no table revision since
   2026-10-10 before production use.
