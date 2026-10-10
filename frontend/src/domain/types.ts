import type { PermitRecord, ProjectJurisdiction } from './lifecycle-types';
export type Applicability = 'applicable' | 'not_applicable' | 'undetermined';
export type EvidenceState = 'satisfied' | 'missing' | 'incomplete' | 'conflicting' | 'human_review';
export type DocumentType = 'construction_plan' | 'elevations' | 'professional_architectural' | 'professional_electrical' | 'professional_mechanical' | 'professional_structural' | 'professional_plumbing' | 'professional_fire' | 'professional_geotechnical' | 'energy_letter' | 'energy_checklist' | 'heritage_photos' | 'highway_approval' | 'existing_conditions' | 'project_description' | 'other';
export interface ProjectDetails {
  address: string;
  description: string;
  proposedArea: number | null;
  storeys: number | null;
  externalWalls: boolean | null;
  onHrmRoad: boolean | null;
  rightOfWayWork: boolean | null;
  heritageProperty: boolean | null;
  energyDocument: 'hrm_checklist' | 'other' | null;
}
export interface ExtractedField { value: string; evidence: string; page?: number; method: 'explicit_label' | 'model'; }
export interface DocumentAnalysis {
  documentType: DocumentType;
  text: string;
  pages: number;
  fields: Record<string, ExtractedField>;
  method: 'deterministic' | 'model';
  uncertainties: string[];
  warnings: string[];
}
export interface ProjectDocument extends DocumentAnalysis {
  id: string; name: string; size: number; uploadedAt: string;
  synthetic?: boolean;
  userConfirmedType?: boolean;
}
export type Predicate = { field: 'proposedArea' | 'storeys' | 'externalWalls' | 'onHrmRoad' | 'rightOfWayWork' | 'heritageProperty' | 'energyDocument'; operator: 'eq' | 'gt' | 'lte'; value: number | boolean | string };
export type Condition = Predicate | { all: Condition[] } | { any: Condition[] };
export interface Requirement {
  id: string; title: string; description: string;
  jurisdiction: string; permitType: 'commercial-renovation';
  applicability: Condition;
  evidenceTypes: DocumentType[];
  classification: 'required' | 'optional' | 'later_stage';
  sourceUrl: string; sourceSection: string; lastVerified: string;
  verificationStatus: 'verified' | 'needs_review';
  exceptions: string[]; humanReviewNotes: string[];
  suggestedFilename?: string;
}
export interface Acknowledgement { requirementId: string; note: string; at: string; }
export interface Activity { id: string; at: string; message: string; }
export interface Project {
  id: string; name: string; contractor: string; client: string;
  details: ProjectDetails; documents: ProjectDocument[];
  acknowledgements: Acknowledgement[]; activity: Activity[];
  createdAt: string; updatedAt: string; synthetic: boolean;
  jurisdiction?: ProjectJurisdiction; permit?: PermitRecord;
}
export interface RequirementResult {
  requirement: Requirement;
  applicability: Applicability;
  evidenceState: EvidenceState;
  evidence: { documentId: string; documentName: string; quote: string; page?: number }[];
  reasons: string[]; nextAction: string; acknowledged: boolean;
}
export interface Evaluation {
  results: RequirementResult[];
  applicable: number; supported: number; missing: number;
  conflicts: number; unknown: number; humanReview: number;
  evaluatedAt: string;
}
export interface ReportData { project: Project; evaluation: Evaluation; generatedAt: string; disclaimer: string; }
