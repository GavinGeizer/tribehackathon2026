import { officialFieldLabel } from './form-labels';
import type { Project } from './types';
import type { OfficialResource } from './lifecycle-types';
import { getProjectJurisdiction } from './jurisdiction';
import { OFFICIAL_RESOURCES, downloadPathFor } from './resources';
export type FormQuestion = 'professionalDesign' | 'fuelGasWork' | 'onsiteSewage';
export interface FormReview { value:string; source:string; quote:string; method:'model'|'deterministic'; at:string; }
export interface FormDraft { values: Record<string,string|boolean>; updatedAt: string; reviews?:Record<string,FormReview>; }
export interface ProjectForms { answers: Partial<Record<FormQuestion,boolean|null>>; drafts: Record<string,FormDraft>; sewagePath?:'approval'|'notification'|null; }
export interface DiscoveredForm { resource: OfficialResource; state:'selected'|'needs_answer'|'available'; reason:string; }
export const FORM_QUESTIONS: {id:FormQuestion;label:string;description:string;sourceUrl:string}[] = [
 {id:'professionalDesign',label:'Are engineers, architects or interior design professionals involved?',description:'Schedule A letters accompany applications using these professionals. The owner and consultants complete relevant schedules. The guidance page and downloaded packet use different numbering; confirm the required sections and stage with the municipality and professionals.',sourceUrl:'https://www.novascotia.ca/building-permits-schedule-letters-undertaking'},
 {id:'fuelGasWork',label:'Does this project include fuel-gas installation work?',description:'Gas work may have a separate Fuel Safety permit process. Confirm applicability and authorized applicant with Fuel Safety.',sourceUrl:'https://novascotia.ca/lae/fuelsafety/'},
 {id:'onsiteSewage',label:'Does this project involve an on-site sewage system?',description:'Approval versus notification and professional submission requirements need confirmation; these forms are candidates for review.',sourceUrl:'https://novascotia.ca/nse/wastewater/regulations.tech.guidelines.asp'},
];
export function discoverProjectForms(project:Project):DiscoveredForm[] {
 const municipality=getProjectJurisdiction(project).municipality;
 const answers=project.forms?.answers??{};
 const general:Record<string,string>={truro:'truro-building-development-application-2023',cbrm:'cbrm-permit-application'};
 const conditions:Record<string,FormQuestion>={'ns-schedule-a-letters-undertaking':'professionalDesign','fuel-gas-permit-application':'fuelGasWork','onsite-sewage-application-for-approval':'onsiteSewage','onsite-sewage-notification':'onsiteSewage','onsite-sewage-submission-details':'onsiteSewage'};
 return OFFICIAL_RESOURCES.filter(r=>r.format==='pdf' && downloadPathFor(r) && (r.kind==='application_form'||r.id==='onsite-sewage-submission-details') && (r.jurisdiction===municipality||r.jurisdiction==='nova_scotia')).map(resource=>{
  const question=conditions[resource.id];
  if(resource.id===general[municipality]) return {resource,state:'selected' as const,reason:'Official municipal building and development application; confirm the class of work and supporting documents.'};
  if(question){const answer=answers[question];
   if(question==='onsiteSewage'&&answer===true){const path=project.forms?.sewagePath;const match=resource.id==='onsite-sewage-notification'?path==='notification':path==='approval';return {resource,state:!path?'needs_answer' as const:match?'selected' as const:'available' as const,reason:!path?'On-site sewage work is confirmed, but approval versus notification is unresolved. Confirm the pathway with the authority.':match?'Matches the pathway you recorded. Verify the correct process and supporting evidence with Nova Scotia Environment.':'This form belongs to the other sewage pathway; confirm changes with the authority.'};}
   return {resource,state:answer===true?'selected' as const:answer===false?'available' as const:'needs_answer' as const,reason:question==='professionalDesign'?'Professional-design schedules: relevant sections require owner/consultant review and signatures.':answer===true?'Related to your project answer; confirm the exact process and applicant eligibility with the authority.':'Answer the project scope question to determine whether this form should be considered.'};}
  return {resource,state:'available' as const,reason:'Available official form. Applicability has not been assessed for this project.'};
 });
}
export interface FormFact {id:string;label:string;value:string;quote:string;source:string;}
export function collectFormFacts(project:Project,excludeResource?:string):FormFact[] {
 const facts:FormFact[]=[];
 for(const [label,value] of Object.entries({projectName:project.name,projectAddress:project.details.address,projectDescription:project.details.description,contractor:project.contractor,client:project.client})) if(value.trim()) facts.push({id:`project:${label}`,label,value,quote:value,source:'Project details (user record)'});

 if(excludeResource==='truro-building-development-application-2023'&&project.details.description.trim()){
  const scope=project.details.description;let cursor=0;
  for(let line=1;line<=3&&cursor<scope.length;line++){
   while(scope[cursor]&&/\s/.test(scope[cursor]))cursor++;
   let end=Math.min(cursor+90,scope.length);
   if(end<scope.length){const boundary=scope.lastIndexOf(' ',end);if(boundary>cursor)end=boundary;}
   const value=scope.slice(cursor,end);if(value)facts.push({id:`project:description:line${line}`,label:`Project Description row ${line}`,value,quote:scope,source:`Project details — description line ${line} (verbatim segment; review full scope)`});cursor=end;
  }
 }
 for(const d of project.documents) for(const [label,f] of Object.entries(d.fields)) if(f.value.trim()&&f.evidence.includes(f.value)&&d.text.includes(f.evidence)) facts.push({id:`document:${d.id}:${label}`,label,value:f.value,quote:f.evidence,source:`${d.name}${f.page?` · page ${f.page}`:''}`});
 for(const [resource,draft]of Object.entries(project.forms?.drafts??{})) if(resource!==excludeResource) for(const [label,value]of Object.entries(draft.values)) if(typeof value==='string'&&value.trim())facts.push({id:`form:${resource}:${label}`,label:officialFieldLabel(resource,label),value,quote:value,source:`Saved form draft: ${OFFICIAL_RESOURCES.find(r=>r.id===resource)?.title??resource} · ${label}`});
 return facts.slice(0,50);
}
