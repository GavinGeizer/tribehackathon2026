# Lead follow-up

Worker results below cover its own ba4f620 checkout. Lead independently validated the latest6a79977 deployment and recovered spec (public8/8 affected flows; full12/12 local). Pre-save Workflow display finding corrected locally: selecting non-HRM immediately displays manual before Save. A focused desktop/mobile regression now asserts that behavior.

# Lifecycle browser QA — findings and notes (ba4f620, public deployment)

- Candidate: `ba4f620471c9376d1d8ce6cd9b887b6b17b495cd` (exact build; merged 31351f1, user dashboard retained, workspace routes preserved).
- Target: public deployment `https://permitpath.gavin-geizer.workers.dev/workspace` AFTER it serves this build. Verified: served JS bundle contains the lifecycle surface (`Permit lifecycle`, `Prepare renewal draft`, `Save permit record`, `Town of Truro`, `INTERNAL WORKSHEET`). Spec opens `/workspace` (new build routes `/` to landing, `/workspace` + `/dashboard` to the workspace).
- Owned spec: `tests/browser/lifecycle.spec.ts` (3 tests × desktop 1440 + narrow 390 = 6 runs). All passed against the public URL.
- Local checks: `npm test` (bun) 143 pass / 0 fail.

## Verified on the actual public UI

1. Permit lifecycle: issued record saved with status/reference/issued-on/expires-on/expiry source; `Saved — validator passed` shown; `Expires:` badge correct.
2. Real in-app `expires_soon` notification computed from the current date (no stubbed clock); shows expiry date, reference, and the in-app-only disclaimer.
3. Actual `.ics` downloaded and inspected: `DTSTART;VALUE=DATE:<expiry>`, `TRIGGER:-P30D`, `TRIGGER:-P7D`, `SUMMARY:Permit expiry:`; no renewal-approval claim inside.
4. Renewal: draft created as `needs_review` + `Eligibility: unverified` + renewal-review notice; approval WITHOUT the checkbox refused with the explicit human-review error; checkbox → `Approved for manual handoff` with approval timestamp; Activity audit holds permit-saved / draft-prepared / draft-approved entries.
5. Reload: permit metadata (expiry badge, reference, approval status) persists.
6. Jurisdiction: Truro switch locks Workflow to manual on save, shows the no-automation notice + disclaimer switch, HRM rules (e.g. Building Elevations) drop out and the internal coverage notice appears; persists after reload.
7. Field assistance: seed candidates quote source docs (`Project Address: 122 …` from `SYNTHETIC project-description-wrong-address.txt`); address discrepancy flagged; reviewed apply writes Activity audit; both seed docs preserved (count 2); worksheet preview + downloaded `.txt` start with `INTERNAL WORKSHEET - NOT OFFICIAL FORM - not submitted`.
8. No page errors in any run; no horizontal overflow on narrow; keyboard Tab reaches the lifecycle form.

## Findings for the lead (no speculative fixes applied)

- Pre-save display: after switching municipality to Truro (pre-save), the disabled Workflow selector still shows the prior `commercial-renovation` value; the manual lock applies on save (`save()` forces `workflow='manual'`). Spec asserts the post-save value. Cosmetic only; enforcement is correct.
- `cf dev` (committed `npm run dev`) cannot boot in this sandbox: the Cloudflare vite plugin requires `CLOUDFLARE_API_TOKEN`. Local runs used a scratch no-CF vite config under `.swarmforge/` (untracked, not committed). Public-URL runs are unaffected and are the evidence here.
- Prior d953300 session note: local first-run `localStorage` is empty until the first save/update (seed lives in memory); the spec asserts the preserved doc count directly (2) instead of a before/after delta.

## Not claimed

- Nothing validated on any older deployed candidate; all UI evidence above is from the current public deployment serving this build's lifecycle surface.
