# PermitPath QA demo guide (synthetic fixtures)

All files in this directory are **synthetic demonstration fixtures only**.
Fictional project: **Juniper Studio Renovation**, fictional contractor
**Seabright Works**, project address of record
**"120 Example Lane, Halifax, NS (synthetic)"** — whole building,
proposed area **450 m²**, **2 storeys**, **externalWalls=true**.
Nothing here is a drawing for submission, professionally verified,
or sufficient for a real permit submission. Do not use real customer data
with these fixtures.

Filename note: `A-102-ConstructionPlan.pdf` and `A-201-Elevations.pdf`
use the official filename-prefix conventions researched from municipal
sources PDF72812/71350 (construction plan A-102, elevations A-201).
The contents remain synthetic test text, as labeled inside each file.

## Fixture inventory

| File | Purpose |
|---|---|
| `construction-plan-summary.pdf` / `.txt` | Construction-plan text summary; explicit "Project address" label, dimensions/layout explanation, labeled EXISTING vs PROPOSED conditions |
| `elevations-summary.pdf` / `.txt` | Four cardinal elevations with height/window/dimension text |
| `A-102-ConstructionPlan.pdf` | Byte copy of construction-plan summary under official naming convention (synthetic content) |
| `A-201-Elevations.pdf` | Byte copy of elevations summary under official naming convention (synthetic content) |
| `project-description-wrong-address.txt` | States **122 Example Lane** — intentional mismatch for conflict testing |
| `replacement-project-description.txt` | Corrected description stating **120 Example Lane** for re-upload testing |
| `corrupt.pdf` | Invalid PDF bytes; parser must reject without crashing |
| `empty.txt` | Zero-byte file; must be rejected or flagged, never counted as evidence |

## Upload sequence (golden path)

1. Create project: name "Juniper Studio Renovation", contractor
   "Seabright Works", address "120 Example Lane, Halifax, NS (synthetic)",
   proposedArea 450, storeys 2, externalWalls true. Mark project synthetic.
2. Upload `construction-plan-summary.pdf` (classify `construction_plan`).
   Expected evidence state: **presence recorded** for construction-plan evidence
   (presence only — not drawing compliance).
3. Upload `elevations-summary.pdf` (classify `elevations`).
   Expected evidence state: **presence recorded** for elevations evidence.
4. Upload `project-description-wrong-address.txt` (classify `project_description`).
   Expected evidence state: **conflicting** — file states 122 Example Lane vs
   project address 120 Example Lane. Must never show satisfied on address.
5. Upload `replacement-project-description.txt` to supersede the mismatched file.
   Expected evidence state: address conflict resolved to consistent presence.
6. Upload `corrupt.pdf`. Expected: clean rejection (invalid PDF), project intact,
   no evidence recorded.
7. Upload `empty.txt`. Expected: clean rejection (empty file), project intact,
   no evidence recorded.

## Expected evidence states (presence, not compliance)

- Presence of a matching-address text/PDF fixture may move an evidence item
  from `missing` toward `satisfied`-as-presence per the domain engine, but that
  means "a file with matching text was supplied" — never that drawings comply,
  are complete, or are professionally verified.
- Address mismatch must surface as `conflicting` (or at minimum not satisfied).
- Acknowledgements must never turn missing evidence into satisfied.
- Corrupt/empty uploads must leave project state intact.

## Source-based assumptions (from types.ts + design spec)

- `ProjectDetails` fields: address, description, proposedArea, storeys,
  externalWalls, onHrmRoad, rightOfWayWork (nullable; unknown stays unknown).
- Evidence states: satisfied | missing | incomplete | conflicting | human_review.
- Document types include construction_plan, elevations, project_description, other.
- Upload limits per spec: 20 documents/project, PDF/TXT/MD only, 5 MiB each,
  60 pages PDF, 150k extracted characters (enforced by app/server, not fixtures).
- Rule predicates cover area/storey/wall/ROW conditions; professional evidence
  always requires human verification.

## Golden-path test checklist (browser, after lead provides integrated SHA)

- [ ] Create synthetic project with the facts above; synthetic flag visible.
- [ ] Upload construction summary; evidence presence recorded with quote/page.
- [ ] Upload elevations summary; all 4 elevations text extractable.
- [ ] Upload wrong-address description; conflict flagged, never satisfied.
- [ ] Re-upload corrected description; conflict clears to consistent presence.
- [ ] Upload corrupt.pdf; rejected cleanly, project intact.
- [ ] Upload empty.txt; rejected cleanly, project intact.
- [ ] Report preview shows citations, disclaimer, latest evaluation.
- [ ] Narrow viewport remains usable; keyboard traversal works.

## Boundary / unknown-condition tests (600/601 area, 3/4 storeys, heritage unknown)

- [ ] Area 600 vs 601 m²: verify each side of the boundary evaluates per the
  rule predicates in the integrated source (do not assume threshold here).
- [ ] Storeys 3 vs 4: verify each side of the storey boundary per integrated rules.
- [ ] Heritage status unknown: requirement applicability must show undetermined /
  human_review, never silently applicable or not_applicable.
- [ ] onHrmRoad / rightOfWayWork unknown: related requirements stay undetermined.
- [ ] UI unavailable in this task: no end-to-end results are claimed; these are
  instructions for the later browser QA pass on the integrated SHA.

## Dependencies needed (report to lead; NOT installed in repo)

- Fixture generation used `reportlab` and `pypdf` installed to
  `/tmp/opencode/pp-qa-libs` only (outside the repo). No package files changed.
- If the app later needs PDF generation/parsing at runtime, the lead should add
  those dependencies explicitly (frontend already plans jsPDF/unpdf per plan).
