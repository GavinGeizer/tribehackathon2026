# PermitPath — Status & Feature Checklist (for lead before final deck delivery)

Base SHA (actual, verified 2026-10-10): `23d3cd58a917795b0929e2607545562b47da6ebb` (remote `origin/main`).
Requested reference `27e6cf20f9c4dcafc7ba0dbff59cee5d129b3a37` is the *parent* commit (initial scaffold), NOT current main. Report the actual base above.

## Planned prototype scope (per plan/design + `types.ts` contracts)

| Feature | Contract / spec | Status |
|---|---|---|
| Project dashboard / create | `createProject`, `createDemoProject`, `loadProjects`, `saveProjects` | PLANNED — verify in app before demoing live |
| Project facts (area/storeys/walls/ROW) | `ProjectDetails` fields | PLANNED |
| Upload + classify (PDF/TXT/MD, 5 MiB, 60 pp, 150k chars, 20 docs) | `POST /api/analyze` → `DocumentAnalysis` | PLANNED |
| Validated extraction + label | Extraction with evidence quote + page; AI-labeled per field | PLANNED — AI pending until final integration |
| Official rule pack + evidence check | Applicability + evidence state per requirement; unknowns stay unknown | PLANNED — regulatory verification underway |
| Inconsistency flags | Mismatched-address / conflicting-evidence flag | PLANNED |
| Review notes never satisfy | Notes recorded without changing missing-evidence state | PLANNED |
| Report export w/ citations + disclaimer | Cited readiness report reflecting latest check | PLANNED |
| Browser-local workspace, server forgets files | Records in visitor's browser; originals not retained | PLANNED |
| AI-assisted reading, labeled | Pending until final integration; workspace runs without it | PENDING — default OFF, label when enabled |
| No municipal integration/submission | design § Scope | CONFIRMED OUT OF SCOPE |

Current main `App.tsx` is a placeholder (`<div>App</div>`); all UI/domain/server work is planned on `permitpath/build` (SHA `74b915a`). Do NOT present any feature as implemented until the lead checks it in the running app.

## Lead verification checklist (must complete before final delivery)

- [ ] Rule rows independently verified against original Halifax PDFs (regulatory worker).
- [ ] Boundary behavior verified (area/storey thresholds; unknown stays unknown).
- [ ] Document text → validated extraction → rule pack → evidence check → report works on desktop + narrow viewport.
- [ ] AI path (if shown) labeled pending until final integration; workspace runs without it.
- [ ] Report citations wrap, pages cited, disclaimer present, reflects latest check.
- [ ] No real customer data in demo; synthetic banner visible.
- [ ] Decks contain no fake metrics, no invented quotes, no downtime/financial claims, no unsupported competitor claims.

## Unknowns

- Halifax source-row wording/numbering pending regulatory worker's original-PDF inspection.
- AI provider configuration (if any) undecided; assume deterministic-only for judging.
- Deployment URL pending lead integration; demo may be local.
