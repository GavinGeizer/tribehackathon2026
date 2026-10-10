# Source-validation checklist (independent, fixture-level)

Scope: validate the QA fixtures in `deliverables/qa/` against the pinned
source revision `74b915a` WITHOUT modifying shared types, configs, or
package files. Tested SHA and parse counts are recorded in
`.swarmforge/artifacts/report.md`. This checklist asserts fixture quality
only — it does not assert fitness for real submission.

Base source: `74b915a575227b67adcb0fa379e007258443eabb`
Authoritative interfaces: `frontend/src/domain/types.ts`,
`docs/superpowers/specs/2026-10-10-permitpath-design.md`.
Retrieval date: 2026-10-10. Deadline: 2026-10-10 15:00 Halifax.

## 1. Base revision

- [ ] `git rev-parse HEAD` starts with `74b915a` (detached checkout of
  `origin/permitpath/build` history).
- [ ] `git status` shows changes ONLY under `deliverables/qa/**`
  (plus the packaged `deliverables/qa.tar.gz`).

## 2. Ownership / no-touch rules

- [ ] No changes to `frontend/src/domain/types.ts`, configs, or package files.
- [ ] No lockfiles added to the repo (PDF libs installed to `/tmp` only).
- [ ] No real customer data in any fixture (all names/addresses fictional).
- [ ] No pushes performed (automatic push disabled; handoff via artifacts).

## 3. Fixture content checks

- [ ] construction-plan-summary.pdf/.txt contain the exact label
  "Project address" with "120 Example Lane, Halifax, NS (synthetic)".
- [ ] construction-plan-summary explains dimensions/layout (15 m x 15 m,
  225 m2/floor, 450 m2 total, 2 storeys, room layout).
- [ ] construction-plan-summary has labeled EXISTING and PROPOSED conditions.
- [ ] construction-plan-summary carries "SYNTHETIC DEMONSTRATION SUMMARY —
  not drawings for submission, not professionally verified".
- [ ] elevations-summary.pdf/.txt describe 4 cardinal elevations (N/S/E/W)
  with height (~7.5 m), window sizes/counts, and widths (~15 m).
- [ ] elevations-summary marked synthetic with no-real-engineering-verification note.
- [ ] project-description-wrong-address.txt states 122 Example Lane (mismatch).
- [ ] replacement-project-description.txt states 120 Example Lane (correct).
- [ ] corrupt.pdf is rejected by a PDF parser (invalid bytes, no PDF header).
- [ ] empty.txt is zero bytes.

## 4. PDF technical checks (record counts)

- [ ] Each valid PDF parses with pypdf; record page count and character count.
- [ ] Extracted PDF text contains "120 Example Lane" and "SYNTHETIC".
- [ ] A-102-ConstructionPlan.pdf is byte-identical to construction-plan-summary.pdf.
- [ ] A-201-Elevations.pdf is byte-identical to elevations-summary.pdf.
- [ ] corrupt.pdf fails to parse (error captured, no crash).

## 5. No invented requirements

- [ ] demo-guide.md states presence-not-compliance semantics.
- [ ] demo-guide.md does not assert fixtures are sufficient for real submission.
- [ ] Boundary tests (600/601, 3/4 storeys, heritage unknown) are written as
  instructions against integrated rules, not assumed outcomes.
- [ ] UI/e2e results are NOT claimed (UI unavailable for this task).

## 6. Packaging

- [ ] `deliverables/qa.tar.gz` contains only the `qa/` tree, no lockfiles.
- [ ] Archive extracts cleanly and file listing matches `deliverables/qa/`.
