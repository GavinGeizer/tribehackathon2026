import type { Evaluation, Project, ProjectDetails, ProjectDocument } from '../domain/types';
import { validateFile } from './api';

export type WorkspaceTab = 'overview' | 'documents' | 'requirements' | 'assistance' | 'lifecycle' | 'resources' | 'activity';

export const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'assistance', label: 'Field assistance' },
  { id: 'lifecycle', label: 'Permit lifecycle' },
  { id: 'resources', label: 'Official forms' },
  { id: 'activity', label: 'Activity' },
];

export interface NewProjectInput {
  name: string;
  address: string;
  description: string;
  contractor: string;
  client: string;
  /** Raw text until submit — never coerced per keystroke, so "1." survives typing. */
  proposedArea: string;
  /** Raw text until submit — never coerced per keystroke. */
  storeys: string;
  externalWalls: boolean | null;
  onHrmRoad: boolean | null;
  rightOfWayWork: boolean | null;
  heritageProperty: boolean | null;
  energyDocument: 'hrm_checklist' | 'other' | null;
}

export const EMPTY_NEW_PROJECT: NewProjectInput = {
  name: '',
  address: '',
  description: '',
  contractor: '',
  client: '',
  proposedArea: '',
  storeys: '',
  externalWalls: null,
  onHrmRoad: null,
  rightOfWayWork: null,
  heritageProperty: null,
  energyDocument: null,
};

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseArea(raw: string): number | null {
  const n = parseOptionalNumber(raw);
  return n != null && n > 0 ? n : null;
}

export function parseStoreys(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

export function inputToDetails(input: NewProjectInput): ProjectDetails {
  return {
    address: input.address.trim(),
    description: input.description.trim(),
    proposedArea: parseArea(input.proposedArea),
    storeys: parseStoreys(input.storeys),
    externalWalls: input.externalWalls,
    onHrmRoad: input.onHrmRoad,
    rightOfWayWork: input.rightOfWayWork,
    heritageProperty: input.heritageProperty,
    energyDocument: input.energyDocument,
  };
}

export interface NewProjectErrors {
  name?: string;
  address?: string;
  proposedArea?: string;
  storeys?: string;
}

export function validateNewProject(input: NewProjectInput): NewProjectErrors {
  const errors: NewProjectErrors = {};
  if (!input.name.trim()) errors.name = 'Give the project a name so you can find it later.';
  if (!input.address.trim()) errors.address = 'An address is required — requirements depend on it.';
  const areaRaw = input.proposedArea.trim();
  if (areaRaw !== '') {
    const n = Number(areaRaw);
    if (!Number.isFinite(n) || n <= 0) {
      errors.proposedArea = 'Enter a positive total area in m², or leave blank for unknown.';
    }
  }
  const storeysRaw = input.storeys.trim();
  if (storeysRaw !== '' && parseStoreys(storeysRaw) == null) {
    errors.storeys = 'Enter a whole number of storeys, or leave blank for unknown.';
  }
  return errors;
}

export function validateIncoming(
  files: FileList | File[],
  currentCount: number,
  maxBytes: number,
): { ok: File[]; errors: string[] } {
  const list = Array.from(files);
  const ok: File[] = [];
  const errors: string[] = [];
  for (const f of list) {
    const problem = validateFile(f, currentCount + ok.length, maxBytes);
    if (problem) errors.push(problem);
    else ok.push(f);
  }
  return { ok, errors };
}

export interface Readiness {
  total: number;
  supported: number;
  label: string;
}

export function computeReadiness(evaluation: Evaluation): Readiness {
  const assessed = evaluation.results.filter(
    (r) => r.applicability === 'applicable' && r.requirement.classification === 'required',
  );
  const supported = assessed.filter((r) => r.evidenceState === 'satisfied').length;
  return {
    total: assessed.length,
    supported,
    label: `${supported} of ${assessed.length} assessed submission requirements have supporting evidence`,
  };
}

/**
 * Pure upload-completion merge used by the race-safe upload flow.
 * Appends freshly analyzed documents to the LATEST document list (so type
 * confirmations, removals, or fact edits made mid-upload survive), caps at
 * 20, and applies nothing when the project was deleted mid-upload.
 * Returns `{ next, skipped }`; `skipped` is true when the target is gone.
 */
export function mergeUploadedDocuments(
  prev: Project[],
  targetId: string,
  added: ProjectDocument[],
): { next: Project[]; skipped: boolean } {
  if (!prev.some((p) => p.id === targetId)) return { next: prev, skipped: true };
  return {
    skipped: false,
    next: prev.map((p) =>
      p.id === targetId ? { ...p, documents: [...p.documents, ...added].slice(0, 20) } : p,
    ),
  };
}
