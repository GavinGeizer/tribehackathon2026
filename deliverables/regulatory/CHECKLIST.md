# Independent validation checklist (human)

- [ ] Base SHA: `git rev-parse HEAD` == `23d3cd58a917795b0929e2607545562b47da6ebb` (record any drift)
- [ ] Re-download the 3 PDFs from the media URLs and compare SHA256 with research.md §1
- [ ] `pdftotext -layout` the renovation table; spot-check 3 rows against `source-quotes.md`
- [ ] `python3 deliverables/regulatory/tests/validate_regulatory.py` passes from repo root
- [ ] Demo scenario (450 m² / 2 storeys / ext-walls Yes) reviewed: construction plan + elevations
      required; no large-project rules fire; A11 shown as later-stage (not a blocker)
- [ ] All 4 `needs_review` rules cleared or explicitly accepted by a reviewer:
      `elevations_small_extwalls`, `hrm_energy_checklist_required_large`,
      `hrm_energy_checklist_optional_small`, `prof_energy_conservation_na`
      (heritage resolved via lead-confirmed `heritageProperty` shared type; energy pair keeps
      needs_review for AND/OR precedence ambiguity)
- [ ] Heritage / road / ROW unknowns have a resolution path (lookup or applicant question), not defaults
- [ ] `deliverables/regulatory.tar.gz` contents verified: `tar tzf deliverables/regulatory.tar.gz`
- [ ] No real customer data used; no files outside `deliverables/regulatory/` + tarball touched
