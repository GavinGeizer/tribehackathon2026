# PermitPath interface direction

The front page is a working project dashboard. Make the next useful action obvious within 15 seconds.

## Research and choices

Researched 2026-10-10 using Firecrawl and the local UI/UX Pro Max skill.
- NN/g visual hierarchy: https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ — scale, restrained contrast and grouping establish reading order.
- Linear: https://linear.app/ — Firecrawl branding extraction observed Inter/system sans, four-pixel spacing foundation, eight-pixel corners and restrained surfaces. Reference for disciplined hierarchy only; no borrowed assets, copy or branding. Extracted values are observations, not PermitPath specifications.
- UI/UX Pro Max recommends Minimalism & Swiss Style for professional dashboards, semantic tokens, keyboard focus and accessible contrast. Its marketing hero and italic serif body suggestions did not fit this operational dashboard; the narrower typography query recommends sans body with mono for data.

## Chosen system (product decisions)

Warm paper canvas, ink navy text, deep teal primary action; limited amber/red reserved for status. Existing brand stays coherent. Use sans UI typography, tabular numerals and small monospace document identifiers. One large, concise heading; generous margins; disciplined borders. No glowing gradients, random floating cards, decorative charts or inflated metrics. Existing Lucide icons stay consistent.

## Dashboard composition

- Compact workspace label and a strong heading explaining the purpose.
- One primary New project action; a clearly labelled synthetic demo action.
- Real aggregate signals computed from projects and deterministic evaluation: project count, missing evidence, unresolved review; no legal compliance percentage.
- Main project list with address, actual evidence count and status. Strong project selection affordance.
- A narrower attention queue linking real outstanding findings back to the project.
- A small source/evidence/next-action example derived from the actual seed, using the verified Halifax source. It should explain traceability without pretending to be another live project.
- Clearly visible verified coverage and browser-local storage limitations, without overwhelming the first heading.

All buttons must work. Preserve create form validation and decimal m² input. Preserve accessible names used in current golden-path tests. Dense rows on desktop become stacked on 375px. Keyboard focus visible, 4.5:1 normal text contrast, no color-only statuses, reduced-motion support. Scope new styles to dashboard classes so workspace behavior stays stable.

## User frontend base update (11:20 Halifax)

User instructed us to build on GitHubmain9502e2e. Merged as64e78a5. Its green/white/Inter landingpage, dashboardlayout, header/footer and Tailwind primitives are now the authoritative visualbase. Preserve these authoredcomponents. Previous navy/teal dashboard direction above is superseded where it conflicts. Functionalworkspace lives /workspace; '/' renders authoredlanding. Dashboardworker must adapt newpages/dashboard.tsx to realprojects and remove samplemetrics/deadbuttons while preservinglayout. Scoped legacyCSS supports oldworkspace until visualintegration; do not bleed it onto newlanding.
