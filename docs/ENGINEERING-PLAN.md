# Software-only delivery plan

Latest user override:2026-10-10; no competition artifacts. Nova Scotia lifecycle vision for individuals and companies. Deadline15:00Halifax.

Deliver stable deployed currentslice first; add independent lifecycle and assistedhandoff slices. VerifiedHRMcommercial-renovationassessment only. Othermunicipalities allowprojecttracking, officialsource/form discovery and guidedmanualhandoff; automatedassessment remains clearlyunavailable untilverifiedpacks. No automaticmunicipalsubmission/renewal API exists in currentresearch; neversecretlysubmit.

Sharedtypes: types.ts optional Project.jurisdiction and Project.permit; lifecycle-types.ts authoritative. Backwardbrowserrecords default to existingHRMcommercialflow, lifecycle emptymanualmetadata. Extend storagevalidations before UIintegration so new fields aren't stripped.

Ownership: lead sharedtypes/storage/App/server/deploy; Swarm lifecycleworker domain/lifecycle.ts+tests/lifecycle; frontendworker components/{LifecycleTab,JurisdictionPanel,AssistanceTab}.tsx only; regulatoryworker deliverables/ns-regulatory only; documentworker domain/assistance.ts+tests/assistance only. Leadnormalizes sourcecatalog and integrates, QA verifiesexactcandidate.

Lifecycle API getPermitRecord(project), updatePermitRecord(project,patch), getPermitNotifications(projects,now), buildReminderCalendar(project,now), prepareRenewal(project,now), approveRenewalDraft(project,approved,now). DatesexplicituserrecordedISOYYYY-MM-DD; missingexpiryunknown, no jurisdiction-generalexpiry guess. CalendaractualICSVALARM; in-appnotificationsonly, no backgroundemail/push claims. Renewaldrafteligibilityunverified, approvalmanualhandoff only.

Assistance API getFieldSuggestions(project), applyFieldSuggestion(project,suggestion), detectDocumentDiscrepancies(project), buildApplicationWorksheet(project). Reuse groundedextractedfields with displayedquote/source and explicituserapplyaction. Internalworksheetexport distinctlynotofficialform; officialforms from verifiedcatalog. Neverlet suggestions redefine officialrequirements.

Next checkpoints: current AI+publicdeployment; lifecycle/forms integration; sourcecoverage and storage migration; exactrevision unit/browser/deployedgoldenpath; technicalfeatureinventory/handoff. Presentationworkstream retired and reassignedengineering.
