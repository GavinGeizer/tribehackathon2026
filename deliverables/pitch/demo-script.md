# PermitPath — Live Demo Script (5-minute pitch, flexible)

> Prototype scope: features below are planned. Verify against `status.md` checklist before presenting anything as working. Present the plain-language pipeline live (document text → validated extraction → official rule pack → evidence check → report). Any AI-assisted reading is pending until final integration and must be labeled live.

## Setup (before timer)

1. Open the demo workspace (no login expected). The status indicator shows whether AI-assisted reading is enabled (pending until final integration) and the file limits.
2. Load the synthetic demo project. Confirm banner: "Synthetic demonstration — no real customer data."
3. Have two files ready: (a) project document text containing a quoted scope line + address; (b) a second document with a *different* address to show the inconsistency flag.

## Walkthrough (~4 min)

**0:00–0:40 — Project facts.** Create or open a project. Enter: address, description, size, storeys, exterior-wall and road/right-of-way answers. Narrate: "Unknown stays unknown — leaving a fact blank keeps dependent checks undecided, never assumed."

**0:40–1:40 — Document text + validated extraction.**
- Add a file to the workspace. Show the extracted key facts, each with its evidence quote + page number.
- If AI-assisted reading is enabled, say so per field; otherwise state: "Validated extraction without AI — AI-assisted reading is pending until final integration."

**1:40–2:50 — Official rule pack + evidence check.**
- Show the per-requirement results: whether it applies, what the evidence shows, why, and the next action.
- Worked example: a larger/taller project triggers additional requirements that a smaller one does not. If the checker is not yet implemented, narrate as planned and show the static slide instead — do not fake a live result.
- Inconsistency check: open document (b); show the conflict flag citing the two addresses.

**2:50–3:40 — Resolve + export.**
- Record a review note on a gap and state: "The note records our review — it never turns missing evidence into satisfied."
- Export the readiness report: cited, page-numbered, with disclaimer ("readiness counts supporting evidence, not legal compliance"). Show readable citations.

**3:40–5:00 — Architecture + ask.**
- Plain-language architecture: browser-local workspace records; server reads files to extract text, then forgets them; validated extraction runs without AI; AI-assisted reading pending until final integration.
- Explicit non-goals: no municipal integration, no submission, no compliance guarantee.
- Ask: customer pilots to measure frequency, time cost, and willingness to pay (see `pilot-metrics.md`). No interviews conducted yet — all value statements are expectations to test.

## If something fails (say it out loud)

- Scan/corrupt file → "No readable text; needs manual text or professional review. Project state preserved."
- Unsupported file / over limits → show the error and the limits.
- AI unconfigured → "AI-assisted reading pending — validated path shown." Never claim AI ran.
