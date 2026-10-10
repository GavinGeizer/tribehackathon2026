# Verification strategy

Domain tests exercise true/false/unknown applicability, condition boundaries, address conflicts, missing evidence, human-review limits, acknowledgements, readiness denominators, storage and reporting.

API tests exercise PDF/text ingestion, type/size validation, empty/corrupt PDFs, input-dependent extraction, strict model schema and fallback.

The lead will test the integrated application with a fresh browser context on desktop and a narrow viewport, including create, upload, source inspection, resolution, persistence, and actual PDF download. A separate deployment smoke/golden path must verify the exact deployed candidate. Worker tests on earlier revisions are integration inputs, not proof of the final candidate.
