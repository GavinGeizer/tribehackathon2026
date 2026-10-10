# Browser form workflow

1. Create a project and select its Nova Scotia municipality. Form discovery opens immediately.
2. Confirm professional-design, fuel-gas and on-site-sewage scope. Unknown applicability remains visible; sewage approval versus notification needs an authority-confirmed pathway.
3. Open a supported original PDF. Exact AcroForm fields appear as editable controls; signatures/read-only/unsupported fields remain locked. Truro applicant/owner/site labels were separately checked against original sections B/C/D.
4. Enter values in the browser. Leaving a text field saves the draft; checkbox/select changes save immediately. Project records and form drafts remain in this browser.
5. Select **Suggest autofill with AI**. The server maps existing project facts, grounded document extraction and other saved form values to empty fields on the selected page. Nothing is applied before **Use this value**. Accepted values retain their source, quote, method and review timestamp.
6. Preview the actual PDF with PDF.js, then export an unsigned draft. Original template content and unedited values remain; signatures are never generated. Complete the authorized submission process with the relevant authority.

## Runtime interfaces

- `POST /api/analyze`: existing multipart document extraction/classification; verified quoted fields and deterministic fallback.
- `POST /api/forms/assist`: JSON `{fields:[{name,label,type,options}],facts:[{id,label,value,quote,source}]}`; maximum100fields/50facts/250kB. Returns `{method,suggestions:[{fieldName,value,factId,reason}],warnings}`. Exact field/fact references, quoted values, role checks and professional/signature restrictions are validated server-side.
- Provider: explicit server-side `MODEL_BASE_URL`, `MODEL_API_KEY`, `MODEL_NAME` (OpenAI-compatible chat/completions), falling back to Workers AI binding when credentials are absent. Provider failure yields honestly labelled deterministic exact Truro mappings.
- User authorized SwarmForge's configured inference endpoint/key for runtime. Stored in Worker secrets via cf CLI; no keys in browser code or source control. Claude subscriptions are not runtime credits.

## Limits

The HRM general application is handled in the official PPLC portal; no verified general HRM PDF is invented. Available forms do not imply every form is required. Schedule A web numbering differs from the original numbered packet; relevant sections/stages need municipal/professional review. Gas permit/registration distinctions and sewage thresholds are unresolved. Print-only, encrypted and XFA templates may not support browser editing. No OCR, official signatures, direct submission, authenticated teams or shared database are implemented.

Truro description suggestions use verbatim segments across three lines. Longer descriptions remain fully retained in project details; an explicit continuation notice appears rather than silently claiming the draft contains the whole scope.

Implementation modules: domain/form-workspace.ts (finite discovery, reusable facts), domain/form-labels.ts (verified role labels), domain/pdf-forms.ts (original-template inspection/fill), components/FormWorkspace.tsx (browser editor/review), components/OfficialPdfPreview.tsx (actual canvas rendering), server/form-assistance.ts (model adapter/grounding), domain/storage.ts (validated draft persistence).
