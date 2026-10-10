import { getProjectJurisdiction } from './jurisdiction';
import type { Project } from './types';

/**
 * Reviewed autofill for Truro's 2023 Building & Development Application.
 * Only the verified Site Address and Project DescriptionRow1/2/3 fields
 * are mapped from project facts, after explicit approval for each group.
 * Applicant identity, contractor boxes with ambiguous labels, ownership,
 * contact details, dates, checkboxes and signatures remain untouched.
 * Original fillable template is preserved. Output is a draft for review;
 * this workflow never signs or submits an application.
 */

export const TRURO_FORM_FIELDS_TOTAL = 96;
export const TRURO_FORM_FILE = 'truro-building-development-application-2023.pdf';
export const TRURO_FORM_PATH = `/official-forms/${TRURO_FORM_FILE}`;

export type TruroProposalKind = 'name' | 'address' | 'scope' | 'contractor';

export interface TruroFieldProposal {
  kind: TruroProposalKind;
  /** Exact AcroForm field name(s) in the official template. */
  fieldNames: string[];
  label: string;
  value: string;
  /** Why this mapping is trusted (shown in UI + audit). */
  basis: string;
  needsExplicitApproval: true;
}

export interface TruroFillReport {
  filledFieldNames: string[];
  unfilledUnknownCount: number;
  unfilledUnknownSample: string[];
  userApprovalAudit: { kind: TruroProposalKind; fieldNames: string[]; value: string; at: string }[];
  approvalCount: number;
  outputLabel: 'DRAFT — NEEDS REVIEW';
  templatePreserved: boolean;
}

export interface TruroUnsupported {
  supported: false;
  reason: string;
}

export interface TruroSupported {
  supported: true;
  proposals: TruroFieldProposal[];
}

export type TruroWorkflow = TruroSupported | TruroUnsupported;

function trimmed(value: string): string {
  return value.trim();
}

function wrapScope(value: string, width = 90): string[] {
  // Bounded: at most 3 rows x `width` chars. Longer scopes are wrapped to 3
  // rows and the REMAINDER IS DROPPED from the proposal — the UI labels the
  // proposal "truncated" and the reviewer must complete it manually.
  const words = value.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let current = '';
  const push = (row: string) => {
    if (rows.length < 3) rows.push(row);
  };
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > width && current) {
      push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) push(current);
  return rows.slice(0, 3);
}

export function scopeWasTruncated(scope: string, width = 90): boolean {
  return trimmed(scope).length > wrapScope(scope, width).join(' ').length;
}

export function truroAutofillWorkflow(project: Project): TruroWorkflow {
  const jurisdiction = getProjectJurisdiction(project);
  if (jurisdiction.municipality !== 'truro') {
    return {
      supported: false,
      reason:
        jurisdiction.municipality === 'hrm'
          ? 'Reviewed PDF autofill is not offered for HRM: use the HRM PPLC portal guide below. Official resource downloads remain available.'
          : `Reviewed PDF autofill is available for Truro only — not for ${jurisdiction.municipalityName}. Official resource downloads remain available below.`,
    };
  }
  const proposals: TruroFieldProposal[] = [];
  const address = trimmed(project.details.address);
  if (address) {
    proposals.push({
      kind: 'address',
      fieldNames: ['Site Address'],
      label: 'Site address (Section D "Site Address:")',
      value: address,
      basis: 'Exact AcroForm name + label match ("Site Address", TU "Site Address:").',
      needsExplicitApproval: true,
    });
  }
  const scope = trimmed(project.details.description);
  if (scope) {
    const rows = wrapScope(scope);
    const truncated = scopeWasTruncated(scope);
    const fieldNames = rows.map((_, i) => `Project DescriptionRow${i + 1}`);
    proposals.push({
      kind: 'scope',
      fieldNames,
      label: 'Project description (Section D, 3 rows)',
      value: rows.join('\n'),
      basis:
        'Exact AcroForm names (Project DescriptionRow1–3, TU "Project Description:_Row_N"). Wrapped to 3 rows' +
        (truncated
          ? '; TRUNCATED — remainder must be completed manually on the PDF.'
          : '; fits fully.') +
        ' Never truncated silently.',
      needsExplicitApproval: true,
    });
  }
  return { supported: true, proposals };
}

/** Minimal structural interface over pdf-lib (injected — no static import). */
export interface TruroPdfLib {
  PDFDocument: {
    load(data: Uint8Array | ArrayBuffer, options?: { ignoreEncryption?: boolean }): Promise<TruroPdfDocument>;
  };
}

export interface TruroPdfDocument {
  getForm(): TruroPdfForm;
  save(): Promise<Uint8Array>;
}

export interface TruroPdfForm {
  getTextField(name: string): { setText(value: string): void };
}

/** Names this module will ever write. Everything else stays blank. */
const WRITABLE_FIELDS: Record<TruroProposalKind, string[]> = {
  name: [],
  address: ['Site Address'],
  scope: ['Project DescriptionRow1', 'Project DescriptionRow2', 'Project DescriptionRow3'],
  contractor: [],
};

const ALL_WRITABLE = new Set(Object.values(WRITABLE_FIELDS).flat());

/** Signature / declaration fields that must never be written. */
const NEVER_WRITE = new Set(['Signature', 'Date', 'Owner or Authorized Agent']);

export interface TruroFillInput {
  templateBytes: Uint8Array | ArrayBuffer;
  /** Per-kind explicit checkbox approval (kind -> approved). */
  approvals: Record<TruroProposalKind, boolean>;
  approvedAt?: string;
}

export async function fillTruroFormPdf(
  project: Project,
  input: TruroFillInput,
  pdfLib: TruroPdfLib,
): Promise<{ bytes: Uint8Array; report: TruroFillReport }> {
  const workflow = truroAutofillWorkflow(project);
  if (!workflow.supported) throw new Error(workflow.reason);
  const byKind = new Map(workflow.proposals.map((p) => [p.kind, p]));
  const filledFieldNames: string[] = [];
  const userApprovalAudit: TruroFillReport['userApprovalAudit'] = [];
  const at = input.approvedAt ?? new Date().toISOString();

  const doc = await pdfLib.PDFDocument.load(input.templateBytes, { ignoreEncryption: true });
  const form = doc.getForm();
  for (const kind of Object.keys(WRITABLE_FIELDS) as TruroProposalKind[]) {
    if (!input.approvals[kind]) continue;
    const proposal = byKind.get(kind);
    if (!proposal) continue;
    for (const fieldName of proposal.fieldNames) {
      if (!ALL_WRITABLE.has(fieldName)) throw new Error(`Refusing to write unexpected field "${fieldName}".`);
      if (NEVER_WRITE.has(fieldName)) throw new Error(`Refusing to write protected field "${fieldName}".`);
      const values = kind === 'scope' ? proposal.value.split('\n') : [proposal.value];
      const idx = proposal.fieldNames.indexOf(fieldName);
      const text = kind === 'scope' ? (values[idx] ?? '') : proposal.value;
      if (!text) continue;
      form.getTextField(fieldName).setText(text);
      filledFieldNames.push(fieldName);
    }
    userApprovalAudit.push({ kind, fieldNames: [...proposal.fieldNames], value: proposal.value, at });
  }
  const bytes = await doc.save();
  const unfilledUnknownCount = TRURO_FORM_FIELDS_TOTAL - filledFieldNames.length;
  return {
    bytes,
    report: {
      filledFieldNames,
      unfilledUnknownCount,
      unfilledUnknownSample: sampleUnfilled(filledFieldNames),
      userApprovalAudit,
      approvalCount: userApprovalAudit.length,
      outputLabel: 'DRAFT — NEEDS REVIEW',
      templatePreserved: true,
    },
  };
}

/** Representative sample of the fields intentionally left blank (audit display). */
function sampleUnfilled(filled: string[]): string[] {
  const sample = [
    'Company',
    'Address',
    'Name_2',
    'Company Name',
    'Address_2',
    'Owner or Authorized Agent',
    'Signature',
    'Date',
    'RENOVATION',
    'Lot Area',
  ];
  return sample.filter((n) => !filled.includes(n)).slice(0, 8);
}

export function logTruroDraftActivity(
  _project: Project,
  report: TruroFillReport,
): { id: string; at: string; message: string } {
  const at = new Date().toISOString();
  const filled = report.filledFieldNames.length ? report.filledFieldNames.join(', ') : 'none (all approvals off)';
  return {
    id: crypto.randomUUID(),
    at,
    message:
      `Truro draft PDF prepared (${report.outputLabel}): approved ${report.approvalCount} field group(s). ` +
      `Filled AcroForm fields: ${filled}. ${report.unfilledUnknownCount} of ${TRURO_FORM_FIELDS_TOTAL} fields left blank. ` +
      `Official template preserved (not flattened, not signed, not submitted). Verify every field against the official blank before manual submission.`,
  };
}
