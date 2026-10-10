# AI workspace review — 00e50a0 (public deployment, as served 2026-10-10)

- Source verified before any QA: `00e50a0603bc570b06a7642e9c7daea09841599c`
  (`Integrate live example analysis and source-grounded document review`).
- Deployment gate: waited through the `cf` deploy, then polled `/workspace` until the served bundle
  changed from `index-C05TR93g.js` (f3baeb7) to `index-DJxgisFx.js` (978,510 bytes). New-build markers
  confirmed in the served JS (`Analyze example document` ×1, `Example project description.txt` ×1,
  `Try synthetic sample files` ×1, `di-samples` ×1, `Grounded fields` ×1, `AI-assisted` ×2,
  `Labelled text` ×5, `AI extraction` ×3, `Current project record` ×1, `Found in document` ×1,
  `How this document was analyzed` ×1, `Text excerpt` ×1, `SYNTHETIC EXAMPLE` ×1).
  All UI results below are attributed to this bundle only.
- Read-only: no app edits, no domain mutations, and NO `/api/analyze` calls of our own
  (lead runs the full public 24 with REQUIRE_MODEL=1; not duplicated). Probes only: navigation to
  existing flows, labelling, quotes, fallback wording, overflow. Root verified local 149 unit + 24
  browser noted, not re-run.
- AI scope honesty: this build carries the existing runtime AI path only (model/deterministic via
  the real service + labelled fallback). Only the served 00e50a0 snapshot is assessed. The lead integrated the document worker artifact into this release; this reviewer does not attribute isolated worker tests to the deployed candidate.

## Verified on the public deployment (2 specs × desktop 1440 + mobile 390 = 4/4 pass)

1. One-click example entry: `Analyze example document` button present on the synthetic project's
   overview Document intelligence panel (synthetic-only affordance; navigates to Documents).
2. Samples outside dropzone: `Try synthetic sample files` lives in `.tab-stack > .di-samples`,
   a separate collapsed `<details>` section — sample links are NOT inside the clickable dropzone.
3. Document UI provenance: seed doc card shows the `.di-analysis` panel with method-honest copy
   (`AI analysis…` / `Text extraction…` / `Preloaded example…`); `Grounded fields` list shows each
   value with its source quote (length-checked), page where present, and per-field method label
   (`AI extraction` vs `Labelled text`).
4. No misleading synthetic=simulated inference: card/suggestion text contains no `simulated` claim;
   fictional input (`SYNTHETIC EXAMPLE`, `synthetic` flag, `Synthetic` badge) and analysis method
   (`AI-assisted` vs `Labelled text`/`Example evidence`) are presented as separate facts.
5. Reviewed comparison: Field assistance cards show `Current project record` vs `Found in document`,
   human-readable field labels (`Site address`, …), method badges (`Labelled text`/`AI extraction`),
   and a visible source quote before any Apply.
6. Labelled fallback: the overview `.analysis-service` line reads one of `AI document analysis
   connected` / `Text extraction available` / `Checking analysis service…` — no silent AI claim,
   no dead service state.
7. No horizontal overflow (`scrollWidth <= clientWidth + 1`) at 1440 or 390; no page errors in any run.

## Probe-authoring note (for future runs, not an app issue)

- The `.analysis-service` line lives on the Overview tab; a probe sitting on Field assistance must
  navigate back to Overview before asserting it (body-text matching from the wrong tab misses it).
  Adjusted mid-run; final probes pass as committed in scratch (scratch removed after the run).

