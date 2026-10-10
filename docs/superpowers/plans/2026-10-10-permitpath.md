# PermitPath Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development to execute independent tasks and integrate continuously.

**Goal:** Deliver a working, source-backed commercial-renovation readiness demo and usable pitch PDFs before 15:00 Halifax.
**Architecture:** React/Vite browser workspace, persistent local project records, stateless Worker extraction API, declarative deterministic requirements. Optional validated model adapter with deterministic fallback.
**Tech Stack:** React, TypeScript, Vite, Zod, unpdf, jsPDF, Bun tests, Cloudflare cf CLI.
**Spec:** docs/superpowers/specs/2026-10-10-permitpath-design.md

## Global constraints
- Real municipal sources only; verified 2026-10-10 and linked by every rule.
- Unknown applicability remains visible. Optional/later-stage items excluded from required evidence counts.
- Synthetic demo; no permit submissions; runtime secrets server-side.
- No file-based production persistence; browser-scoped project records explicitly described.
- API 5 MiB PDF/TXT/MD; 60 pages; 150k extracted characters; 20 documents/project.

## Review focus
- Area/storey boundary AND/OR logic and missing condition inputs.
- Uploaded-file address mismatches and evidence acknowledgement never satisfying a missing document.
- Corrupt/scan PDFs, unsupported files and inference failure preserve state.
- Browser quota/corrupt storage and narrow layouts remain usable.
- PDF export has usable citations/line wrapping and reflects latest evaluation.

## Tasks
1. Regulatory worker: original official PDF inspection, traceable rules and naming inventory; independently verify source rows before integration.
2. Domain worker: tests first for applicability (600/601, 3/4, unknown), evidence/address conflicts, acknowledgements, readiness, filename sanitation, report data; implement types.ts contracts; build synthetic fixtures and browser persistence. Files frontend/src/domain/{rules,engine,seed,storage,report}.ts and tests/domain/**.
3. Frontend worker: build project dashboard/create/details/upload/classify/evidence/source/resolve/history/report UI against agreed contracts. Files frontend/src/{App.tsx,App.css,index.css,components/**}; test actual interactions after integration.
4. Document worker: tests first for multipart validation, TXT/PDF extraction, structured model validation, fallback/timeouts/empty files; implement server/index.ts, server/{extract,ai}.ts, tests/server/**.
5. Product worker: primary competitor research; idea snapshot, Round1 PDF, final PDF, editable source, demo/Q&A/pilot metrics. Files deliverables/pitch/**.
6. Lead: scaffold shared contracts; install/configure; inspect artifacts and source SHAs; integrate tasks 1–5; run Bun tests and production build; resolve defects with focused regressions; deploy and test desktop/mobile golden path; update final feature inventory, delivery status and submission package.

## Integration checkpoints
- C1: shared contracts pushed on permitpath/build and workers confirm exact SHA.
- C2: source dataset + app shell + extraction/evaluation integrated, create/upload/resolve/export works locally.
- C3: unit/API/browser QA passes; deploy functional increment well before deadline.
- C4: final verified feature inventory/decks/demo link assembled; freeze essential scope at 14:00, finish delivery by 14:30.
