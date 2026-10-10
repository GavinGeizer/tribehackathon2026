export type CustomerType = 'individual' | 'independent_contractor' | 'small_company' | 'medium_company' | 'enterprise';
export type JurisdictionId = 'hrm' | 'cbrm' | 'truro' | 'kentville' | 'bridgewater' | 'other_ns';
export interface ProjectJurisdiction {
  province: 'NS'; municipality: JurisdictionId; municipalityName: string;
  customerType: CustomerType; workflow: 'commercial-renovation' | 'manual';
}
export type PermitStatus = 'preparing' | 'ready_for_review' | 'submitted_manually' | 'issued' | 'closed';
export interface RenewalDraft {
  createdAt: string; approvedAt: string | null;
  status: 'needs_review' | 'approved_for_manual_handoff';
  eligibility: 'unverified'; note: string;
}
export interface PermitRecord {
  status: PermitStatus; reference: string; issuedOn: string | null;
  expiresOn: string | null; expirySource: string;
  reminderDays: number[]; remindersEnabled: boolean;
  renewal: RenewalDraft | null;
}
export interface PermitNotification {
  id: string; projectId: string; projectName: string;
  kind: 'expired' | 'expires_soon' | 'expiry_unknown' | 'renewal_review';
  title: string; description: string; daysRemaining: number | null;
}
export interface FieldSuggestion {
  id: string; field: 'address' | 'client' | 'contractor' | 'description' | 'name';
  value: string; documentId: string; documentName: string;
  quote: string; page?: number; method: 'explicit_label' | 'model';
}
export interface DocumentDiscrepancy {
  id: string; field: string; title: string;
  severity: 'conflicting' | 'needs_review';
  evidence: { documentId: string; documentName: string; value: string; quote: string; page?: number }[];
  nextAction: string;
}
export interface OfficialResource {
  id: string; jurisdiction: JurisdictionId | 'nova_scotia';
  title: string; url: string;
  kind: 'application_form' | 'requirements' | 'guidance' | 'portal' | 'renewal_guidance';
  format: 'pdf' | 'web'; verifiedOn: string;
  verificationStatus: 'verified' | 'needs_review';
  sourceLocation: string; notes: string;
}
