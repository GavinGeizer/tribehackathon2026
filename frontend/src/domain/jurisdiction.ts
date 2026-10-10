import type { Project } from './types';
import type { ProjectJurisdiction } from './lifecycle-types';
export function getProjectJurisdiction(project: Project): ProjectJurisdiction {
  return project.jurisdiction ?? { province: 'NS', municipality: 'hrm', municipalityName: 'Halifax Regional Municipality', customerType: 'small_company', workflow: 'commercial-renovation' };
}
export function hasVerifiedRulePack(project: Project): boolean {
  const jurisdiction = getProjectJurisdiction(project);
  return jurisdiction.municipality === 'hrm' && jurisdiction.workflow === 'commercial-renovation';
}
