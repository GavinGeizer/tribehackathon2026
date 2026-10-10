import type { DocumentAnalysis, DocumentType, ProjectDetails } from '../domain/types';

export const MAX_FILE_BYTES_FALLBACK = 5242880;
export const MAX_DOCS_PER_PROJECT = 20;

const ACCEPTED_EXT = new Set(['pdf', 'txt', 'md']);
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

export interface HealthInfo {
  status: 'ok';
  mode: 'deterministic' | 'model';
  maxFileBytes: number;
}

export interface UploadOutcome {
  added: number;
  errors: string[];
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function validateFile(
  file: File,
  currentCount: number,
  maxBytes: number,
): string | null {
  if (currentCount >= MAX_DOCS_PER_PROJECT) {
    return `"${file.name}" was skipped: a project holds at most ${MAX_DOCS_PER_PROJECT} documents.`;
  }
  if (file.size > maxBytes) {
    return `"${file.name}" was skipped: ${(file.size / 1048576).toFixed(1)} MiB exceeds the ${(maxBytes / 1048576).toFixed(1)} MiB limit.`;
  }
  const ext = extOf(file.name);
  if (!ACCEPTED_EXT.has(ext)) {
    return `"${file.name}" was skipped: only PDF, TXT, or MD files are accepted.`;
  }
  if (file.type !== '' && !ACCEPTED_MIME.has(file.type) && ext === 'pdf') {
    return `"${file.name}" was skipped: the file does not look like a PDF.`;
  }
  return null;
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed (HTTP ${res.status}).`);
  const data = (await res.json()) as Partial<HealthInfo>;
  if (data.status !== 'ok') throw new Error('Analysis service reported an unhealthy status.');
  return {
    status: 'ok',
    mode: data.mode === 'model' ? 'model' : 'deterministic',
    maxFileBytes:
      typeof data.maxFileBytes === 'number' && data.maxFileBytes > 0
        ? data.maxFileBytes
        : MAX_FILE_BYTES_FALLBACK,
  };
}

export async function analyzeDocument(
  file: File,
  details: ProjectDetails,
): Promise<DocumentAnalysis> {
  const form = new FormData();
  form.append('file', file);
  form.append('project', JSON.stringify(details));
  let res: Response;
  try {
    res = await fetch('/api/analyze', { method: 'POST', body: form });
  } catch {
    throw new Error(
      'Could not reach the analysis service. Check your connection and try again — the project is unchanged.',
    );
  }
  if (!res.ok) {
    let message = `Analysis failed (HTTP ${res.status}). The project is unchanged.`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) message = body.error;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  const data = (await res.json()) as DocumentAnalysis;
  if (
    !data ||
    typeof data.text !== 'string' ||
    typeof data.documentType !== 'string'
  ) {
    throw new Error('The analysis service returned an unreadable response. The project is unchanged.');
  }
  return data;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  construction_plan: 'Construction plans',
  elevations: 'Elevations',
  professional_architectural: 'Professional architectural design',
  professional_electrical: 'Professional electrical design',
  professional_mechanical: 'Professional mechanical design',
  professional_structural: 'Professional structural design',
  professional_plumbing: 'Professional plumbing design',
  professional_fire: 'Professional fire suppression design',
  professional_geotechnical: 'Professional geotechnical design',
  energy_letter: 'Energy conservation undertaking letter',
  energy_checklist: 'Energy checklist (HRM)',
  heritage_photos: 'Heritage photos / documentation',
  highway_approval: 'Provincial-road approval',
  existing_conditions: 'Existing-conditions letter (review required)',
  project_description: 'Project description',
  other: 'Other supporting document',
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MiB`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
