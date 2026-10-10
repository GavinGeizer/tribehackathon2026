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

## Latest team dashboard base — 9b81bad

Adopt the substantial new `pages/dashboard.tsx` and `DASHBOARD-NEW.HTML` as the team's intended visual direction. Keep its restrained green/white palette, sidebar hierarchy, typography and project-card composition while replacing all mock statistics, user identity and project records with actual browser-local state. Do not expose a static dashboard as working functionality.

UI/UX Pro Max review applied on 2026-10-10: focused UX search returned web keyboard navigation, visible focus and unobscured focus guidance; React card search returned composition with props. Use real semantic buttons and logical focus order, readable status text alongside color, and responsive cards/sidebar without horizontal overflow. Review at desktop and 390px. Existing Lucide icons provide a consistent web icon system. These recommendations refine the user's design rather than replacing it.

Implemented frontend review: latest9b81bad dashboard uses actual projects/evidence stats; parentlegacyCSS isolated from newdashboard, singleheader/mainlandmark. Workspacepalette nowmatchesusergreen/white; projectscope usesmultilineeditor; smallmetadata enlarged12px; mobileSearchfullwidth andoffscreenmenuhiddenfromkeyboard; SVGiconsreuseexistingLucide; Escapeclosesmenu/restoresfocus; radiogroupssupportArrow/Home/End. Verifiedat1440,390 and375/reducedmotion; testscoveractualconditionalrequirementchangeandCSVexport.

## Project workspace revision (October 10, 2026)

User retained the authored homepage and overview dashboard, and requested a cleaner project view. Applied UI/UX Pro Max minimalism/Swiss-style guidance for enterprise dashboards: quiet borders, consistent spacing, one green accent, readable hierarchy, no decorative gradients/shadows. Lead replaced the crowded setup-form sidebar with a project navigation rail and dedicated details section. Readiness shows evidence counts, with separate gaps/conflicts/unknowns; next-action rows open actual source evidence. Document intelligence exposes live service mode, actual non-synthetic model-analysis counts and direct upload/review routes. Controls remain keyboard accessible with roving tab navigation, arrow/Home/End keys, visible focus and reduced-motion support. Desktop and 390px screenshots reviewed; horizontal overflow measured false. SwarmForge owns the independent document-results redesign.
