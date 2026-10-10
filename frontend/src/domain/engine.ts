import { getProjectJurisdiction, hasVerifiedRulePack } from './jurisdiction';
import { requirements } from './rules';
import type { Condition, Evaluation, Project, ProjectDetails, ProjectDocument, Requirement, RequirementResult } from './types';
export function evaluateCondition(condition: Condition, details: ProjectDetails): boolean | null {
 if ('all' in condition) { const values=condition.all.map(c=>evaluateCondition(c,details)); return values.includes(false)?false:values.includes(null)?null:true; }
 if ('any' in condition) { const values=condition.any.map(c=>evaluateCondition(c,details)); return values.includes(true)?true:values.includes(null)?null:false; }
 const value=details[condition.field]; if(value===null || value===undefined) return null;
 if(condition.operator==='eq') return value===condition.value;
 if(typeof value!=='number' || typeof condition.value!=='number') return null;
 return condition.operator==='gt'?value>condition.value:value<=condition.value;
}
const normalize=(value:string)=>value.toLowerCase().replace(/\(synthetic\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function addressField(doc:ProjectDocument) { return doc.fields.projectAddress ?? doc.fields.address; }
function addressRelation(doc:ProjectDocument,project:Project):'match'|'partial'|'conflict'|'absent' {
 const field=addressField(doc); if(!field?.value.trim()) return 'absent';
 const actual=normalize(field.value), expected=normalize(project.details.address);
 if(actual===expected) return 'match';
 if(actual.startsWith(expected+' ') || expected.startsWith(actual+' ')) return 'partial';
 return 'conflict';
}
function wrongAddress(doc:ProjectDocument,project:Project) { return addressRelation(doc,project)==='conflict'; }
function evidenceFor(doc:ProjectDocument) { const field=addressField(doc); return {documentId:doc.id,documentName:doc.name,quote:field?`${field.evidence} (extracted address: ${field.value})`:doc.text.trim().slice(0,500),...(field?.page?{page:field.page}:{})}; }
function assess(requirement:Requirement,project:Project):RequirementResult {
 const condition=evaluateCondition(requirement.applicability,project.details);
 const applicability=condition===null?'undetermined':condition?'applicable':'not_applicable';
 const docs=project.documents.filter(d=>requirement.evidenceTypes.includes(d.documentType));
 const readable=docs.filter(d=>d.text.trim().length>0);
 let evidenceState:RequirementResult['evidenceState']='missing'; const reasons:string[]=[];
 if(applicability==='undetermined') reasons.push('Project facts are unknown. Confirm the condition before deciding whether this document is required.');
 if(applicability==='not_applicable') reasons.push('Current project facts do not meet the encoded condition.');
 if(docs.some(d=>wrongAddress(d,project))) { evidenceState='conflicting'; reasons.push(`Document address differs from project address: ${project.details.address}. Confirm which address is correct.`); }
 else if(!docs.length) reasons.push('No document classified as supporting this item has been added.');
 else if(!readable.length) { evidenceState='incomplete'; reasons.push('Document is present but contains no readable extracted text. Upload readable evidence or seek manual review.'); }
 else if(requirement.verificationStatus==='needs_review' || requirement.id.startsWith('prof_') || requirement.evidenceTypes.includes('energy_letter') || docs.some(d=>d.uncertainties.length>0 || d.warnings.length>0 || (addressRelation(d,project)==='partial' || addressRelation(d,project)==='absent'))) { evidenceState='human_review'; reasons.push('Supporting document is present; source ambiguity, professional adequacy or extraction uncertainty requires human review.'); }
 else { evidenceState='satisfied'; reasons.push('Matching document with readable text is present. This confirms supporting evidence only, not completeness of drawings or legal compliance.'); }
 if(docs.some(d=>addressRelation(d,project)==='absent')) reasons.push('No project address was extracted from the supporting document. Confirm that it belongs to this project before relying on the evidence.');
 if(docs.some(d=>addressRelation(d,project)==='partial')) reasons.push('Document address is less specific or includes additional locality information. Confirm that both addresses refer to the same property.');
 if(docs.some(d=>d.documentType==='existing_conditions')) reasons.push('Generic existing-conditions letter: confirm author, specific discipline, and whether the work leaves that design unchanged.');
 reasons.push(...requirement.humanReviewNotes);
 const nextAction=applicability==='undetermined'?'Confirm the unknown project facts and review the cited condition.':applicability==='not_applicable'?'Retain the source and revisit if scope or facts change.':evidenceState==='missing'?'Add the listed document or have a qualified reviewer confirm an exception.':evidenceState==='incomplete'?'Supply readable text and have the document reviewed.':evidenceState==='conflicting'?'Resolve address discrepancies and replace or correct affected documents.':evidenceState==='human_review'?'Ask a qualified reviewer to check source interpretation and document adequacy.':'Retain the evidence and confirm technical adequacy with your reviewer.';
 return {requirement,applicability,evidenceState,evidence:docs.map(evidenceFor),reasons,nextAction,acknowledged:project.acknowledgements.some(a=>a.requirementId===requirement.id)};
}
export function evaluateProject(project:Project):Evaluation {
 const results:RequirementResult[]=hasVerifiedRulePack(project)?requirements.map(r=>assess(r,project)):[];
 if(!hasVerifiedRulePack(project)) {
  const jurisdiction=getProjectJurisdiction(project);
  const requirement:Requirement={id:'internal-coverage-review',title:'Municipal requirements need verification',description:`No automated rule pack is verified for ${jurisdiction.municipalityName} / ${jurisdiction.workflow}. Halifax requirements have not been applied.`,jurisdiction:jurisdiction.municipalityName,permitType:'commercial-renovation',applicability:{all:[]},evidenceTypes:[],classification:'optional',sourceUrl:'',sourceSection:'PermitPath coverage notice, not a municipal requirement',lastVerified:'2026-10-10',verificationStatus:'needs_review',exceptions:[],humanReviewNotes:['Use verified official sources and qualified review. Lifecycle tracking and document assistance remain available.']};
  results.push({requirement,applicability:'undetermined',evidenceState:'human_review',evidence:[],reasons:[requirement.description,...requirement.humanReviewNotes],nextAction:'Confirm the jurisdiction and obtain its official requirements before submission.',acknowledged:false});
 }
 const mismatches=project.documents.filter(d=>wrongAddress(d,project));
 if(mismatches.length) {
  const requirement:Requirement={id:'internal-address-check',title:'Document address consistency (internal check)',description:'PermitPath internal consistency check—not a municipal rule.',jurisdiction:'PermitPath internal check',permitType:'commercial-renovation',applicability:{all:[]},evidenceTypes:[],classification:'optional',sourceUrl:'',sourceSection:'Internal data-quality finding; no regulatory source',lastVerified:'2026-10-10',verificationStatus:'verified',exceptions:[],humanReviewNotes:['PermitPath internal consistency check—not a municipal rule. Excluded from the required denominator.']};
  results.push({requirement,applicability:'applicable',evidenceState:'conflicting',evidence:mismatches.map(evidenceFor),reasons:[`Expected project address: ${project.details.address}.`,...requirement.humanReviewNotes],nextAction:'Confirm the correct address and replace or correct the conflicting documents.',acknowledged:project.acknowledgements.some(a=>a.requirementId===requirement.id)});
 }
 const required=results.filter(r=>r.requirement.classification==='required'); const applicable=required.filter(r=>r.applicability==='applicable');
 return {results,applicable:applicable.length,supported:applicable.filter(r=>r.evidenceState==='satisfied').length,missing:applicable.filter(r=>r.evidenceState==='missing' || r.evidenceState==='incomplete').length,conflicts:results.filter(r=>r.applicability!=='not_applicable'&&r.evidenceState==='conflicting').length,unknown:required.filter(r=>r.applicability==='undetermined').length,humanReview:applicable.filter(r=>r.evidenceState==='human_review' || r.requirement.verificationStatus==='needs_review').length,evaluatedAt:new Date().toISOString()};
}
