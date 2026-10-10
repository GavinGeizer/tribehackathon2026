import type { Evaluation, ProjectDetails } from '../domain/types';
import { validateFile } from './api';

export type WorkspaceTab = 'overview' | 'documents' | 'requirements' | 'activity';

export const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'activity', label: 'Activity' },
];

export interface NewProjectInput {
  name: string;
  address: string;
  description: string;
  contractor: string;
  client: string;
  proposedArea: number | null;
  storeys: number | null;
  externalWalls: boolean | null;
  onHrmRoad: boolean | null;
  rightOfWayWork: boolean | null;
}

export const EMPTY_NEW_PROJECT: NewProjectInput = {
  name: '',
  address: '',
  description: '',
  contractor: '',
  client: '',
  proposedArea: null,
  storeys: null,
  externalWalls: null,
  onHrmRoad: null,
  rightOfWayWork: null,
};

export function inputToDetails(input: NewProjectInput): ProjectDetails {
  return {
    address: input.address.trim(),
    description: input.description.trim(),
    proposedArea: input.proposedArea,
    storeys: input.storeys,
    externalWalls: input.externalWalls,
    onHrmRoad: input.onHrmRoad,
    rightOfWayWork: input.rightOfWayWork,
  };
}

export function validateNewProject(input: NewProjectInput): { name?: string; address?: string } {
  const errors: { name?: string; address?: string } = {};
  if (!input.name.trim()) errors.name = 'Give the project a name so you can find it later.';
  if (!input.address.trim()) errors.address = 'An address is required — requirements depend on it.';
  return errors;
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
