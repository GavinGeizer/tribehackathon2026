# PermitPath

**From paperwork to permit-ready.** A Nova Scotia permit preparation and lifecycle prototype. Automated requirements are verified for Halifax commercial renovations; other municipalities support manual lifecycle tracking and official-resource discovery.

## Development

```sh
npm ci
npm --prefix frontend ci
npm run dev
```

`cf dev` runs the React/Vite UI and stateless document-processing Worker together. `npm run check` runs the frontend production build and Bun unit/API tests. `npm run build` builds Cloudflare deployment output; `cf deploy --prebuilt` publishes it.

## Product boundaries

PermitPath organizes supporting evidence, evaluates documented conditions, and shows missing information and uncertainties. It does not issue permits, submit applications, verify engineering drawings, or guarantee compliance or approval. Optional and later-stage items are separated from pre-submission requirements.

Projects and extracted text persist in the visitor's browser. Uploaded originals are processed server-side and not retained by PermitPath. Use synthetic data for the public hackathon demo. This prototype has no team synchronization, account management, OCR, or production retention controls.

## Sources

- [Halifax commercial renovations guidance](https://www.halifax.ca/home-property/building-development-permits/commercial-mixed-use-building-permits/changes-existing)
- [Commercial renovation required-document table](https://www.halifax.ca/media/72812)
- [Municipal document naming conventions](https://www.halifax.ca/media/71350)

Retrieved October 10, 2026. Source validation artifacts and explicit interpretations are in `deliverables/regulatory/` when integrated.

## Runtime AI

The core workflow works without inference credentials. Optional provider-neutral analysis uses strict schemas and evidence validation, and falls back to deterministic extraction on failure. Configure runtime provider settings separately from development tooling; never expose keys in client code. SwarmForge coordinates development only and is not a production dependency.

## Engineering delivery

Public app: https://permitpath.gavin-geizer.workers.dev

Current work and handoff: `docs/CURRENT-TASKS.md`, `HANDOFF.md`.
Implemented features and limits: `docs/FEATURES.md`.

`npm run test:browser` exercises desktop and mobile flows using fresh contexts. Set `DEMO_BASE_URL` to test the deployment. `npm run deploy` builds and publishes through the cf CLI. No Wrangler configuration is used.
