# Form discovery v2: condition precision + canonical field geometry (2026-10-10)

- Base: `eca30a9ae4abb79d1e19dc6c4db0d6b4ca746029` on `permitpath/build` (pinned,
  verified `git rev-parse HEAD`). Retrieval date **2026-10-10**.
- Ownership: `deliverables/form-discovery/**` ONLY (v1 `applicability.json` +
  `report.md` untouched; this adds `discovery-v2.json` + extends this report).
  No code, catalog, PDF, rules, UI, or shared files touched.
- Machine-readable output: `discovery-v2.json` (`conditions_review`,
  `cbrm_honesty`, `field_geometry`, `states_guidance`).
- Method: curl re-fetch of CBRM forms hub + permits page (both 200); pypdf
  widget inspection (exact `/T` names, `/Rect` coordinates, `/FT` types).
  PDFs untrusted; names/rects asserted, never content as requirements.
  No field names invented (anonymous widgets = `T=None`; XFA = no rects).

## 1. Condition precision verdicts (evidence in JSON)

1. **municipality == truro → SUPPORTED as municipality gate.** Work-class
   precision comes from the applicant's own checkbox (RENOVATION verbatim);
   add `needs_answer` only for PDF-vs-webchannel choice (parity unknown).
2. **municipality == cbrm → SUPPORTED + $10,000 value threshold.**
   Source-backed refinement: structural AND non-structural work >$10,000 needs
   a permit (single application may bundle renovations/additions/change of
   use); non-structural <$10,000 (roofing, painting, shingles, siding,
   window/door replacement, fences, sheds <100 sq ft) does NOT. Recommend a
   `needs_answer` value question before selecting; below-threshold → available
   as information only.
3. **professionalDesign → SUPPORTED conditional.** Trigger = professionals
   ENGAGED for field review (the source's own if-clause), A10/A11 timing,
   municipal filing. Keep `needs_answer` wording mirrored on the source; never
   default-select.
4. **fuelGasWork → direction correct, PRECISION LIMITED.** One form, two
   instruments (Permit vs Registration); keep one `needs_answer`, map both
   outcomes to the same form, record instrument choice unresolved.
5. **onsiteSewage → direction correct, PRECISION LIMITED.** Approval-vs-
   notification thresholds need regulation text. One `needs_answer` for
   septic-work existence; both pathways `available` (not auto-selected) with
   'confirm pathway with NSE'; details bundled with approval; alert available
   once a reference number exists.

## 2. CBRM print-PDF honesty (browser fill unsupported)

- `cbrm-permit-application.pdf`: 2 pp, **0 AcroForm fields** (pypdf
  confirmed). Print/scan only — product must offer download + manual
  completion, never in-browser field fill for this PDF.
- Role-context print labels (exact transcriptions, sectioned A–N incl.
  Section D renovation semantics and the 'Structural Renovation' definition)
  are in `cbrm_honesty.role_context_print_labels` for the lead's manual-
  completion guidance. No widget rects exist; none invented. A future overlay
  worker needs a raster pass for anchor coordinates — explicitly out of scope
  here; lead may add separate overlay support later.

## 3. Canonical field geometry (fillable originals)

- `field_geometry.pages[]`: exact `/T` + `/Rect` (PDF user space, origin
  bottom-left, points) + `/FT` + role per widget for truro (38 key widgets),
  gas (all 54 across 3 pp), septic approval p3 signatures/checkboxes,
  notification p3, alert (all 15), schedule-a distinctive fields (discipline
  grid p2, owner signature p2, prime signer p4, seal p22, initials p23).
- Septic approval p1/p2 + notification p1/p2 named widgets are fully
  enumerated in v1 `applicability.json`; anonymous `T=None` checkboxes are
  reported with coordinates but NO invented names. Septic details (XFA) has
  no standard widgets — stated, not fabricated.

## 4. States guidance

- `selected` / `needs_answer` / `available` semantics pinned in JSON; no
  answer may be assumed or defaulted; below-threshold or unconfirmed-pathway
  forms stay `available`, never auto-selected.

## Lead correction: XFA naming is not XFA presence

The onsite-sewage-submission-details original has hierarchy-style field names but no AcroForm /XFA entry according to direct pypdf inspection. The worker XFA description must not be taken as confirmed XFA presence. The engine checks actual /XFA presence before opening or saving; hierarchy-style names alone do not disable editing.
