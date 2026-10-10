# PermitPath — Anticipated Q&A (credible, source-backed)

## Why use AI at all if rules are deterministic?

Rules decide applicability and evidence state; they are declarative predicates (`Predicate`/`Condition` in `frontend/src/domain/types.ts`) evaluated by `evaluateProject`. AI is only an *optional extraction adapter*: turning messy PDF text into `ExtractedField{value, evidence, page}`. Every AI output is strictly validated and every field keeps its quote + method label (`explicit_label` vs `model`). If AI is unconfigured or validation fails, the deterministic path runs and the UI labels it. Use AI to reduce typing, never to decide.

## How do you prevent hallucinations?

Four controls (planned per design): (1) AI output is strictly validated (schema `DocumentAnalysis`); untrusted document instructions never mutate rules; (2) every extracted value must carry an `evidence` quote + optional page — no quote, no credit; (3) evidence states include `conflicting`, `incomplete`, `human_review`, and unknown inputs stay `undetermined`; (4) professional evidence (architectural/electrical/mechanical/structural/plumbing/fire/geotechnical, energy letter) always requires human verification. The report carries a disclaimer: readiness counts supporting evidence, not legal compliance.

## How are you different from PermitFlow / GreenLite / Clariti?

Role and buyer differ (see `research.md`, retrieved 2026-10-10). PermitFlow describes AI-assisted permitting operations including help preparing and tracking filings. GreenLite describes permit management plus expert plan review services. Clariti/CivCheck sells to governments, with staff review required on every AI interpretation. PermitPath (planned) tests one narrow step: a source-backed readiness workspace used before filing — no filing, no stamp, no government sale. We make no claim about competitors' Halifax coverage or missing features. No customer frequency or cost comparisons claimed.

## Privacy — where does our document data go?

Browser-scoped by design: project records and extracted text persist only in the visitor's browser (`loadProjects`/`saveProjects`); the server extraction endpoint is stateless — originals are processed, not retained. No signup, no shared anonymous store in production. Limits: browser quota/corrupt storage must degrade gracefully (planned). Use synthetic demo data only; never upload real customer documents to a demo.

## Who pays, and what do they pay?

Hypothesis only — unvalidated, no interviews conducted. Payer (hypothesis): repeat professional applicants who regularly assemble Halifax commercial permit packages. Model options to test: per-project check or subscription. No job-volume figures assumed; no downtime or financial claims made. No prices set, no willingness-to-pay confirmed, no customer results invented. Validation plan: customer pilots measuring frequency, time cost, and willingness to pay; see `pilot-metrics.md`.

## What about accuracy risk / liability?

We never claim compliance. `Evaluation` counts applicable/supported/missing/conflicts/unknown/humanReview; optional and later-stage (A11) items are excluded from the required denominator. Professional drawings and energy/highway items route to human review. Acknowledgements never satisfy missing evidence. Every rule cites `sourceUrl` + `sourceSection` + `lastVerified`, with `verificationStatus: verified | needs_review`. If sources change, affected rules flip to `needs_review` visibly.

## What is NOT in the prototype?

No municipal integration, no electronic submission, no engineered-drawing verification, no fee estimate, no leasehold-exemption claims, no cross-device sync (browser-local only). AI-assisted extraction is pending until final integration and will be explicitly labeled; validated extraction without AI is the default.
