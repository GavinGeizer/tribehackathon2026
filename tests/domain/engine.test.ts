import { describe, expect, test } from 'bun:test';
import { evaluateCondition, evaluateProject } from '../../frontend/src/domain/engine';
import { createDemoProject, createProject } from '../../frontend/src/domain/seed';
import { buildReportData } from '../../frontend/src/domain/report';
import { requirements } from '../../frontend/src/domain/rules';

describe('PermitPath evidence rules', () => {
 test('three-valued groups preserve known decisive predicates', () => {
  const details = createDemoProject().details;
  expect(evaluateCondition({all:[{field:'heritageProperty',operator:'eq',value:true},{field:'externalWalls',operator:'eq',value:false}]}, details)).toBe(false);
  expect(evaluateCondition({any:[{field:'heritageProperty',operator:'eq',value:true},{field:'externalWalls',operator:'eq',value:true}]}, details)).toBe(true);
 });
 test('demo contains support, missing evidence, unknowns and an internal conflict', () => {
  const e=evaluateProject(createDemoProject());
  expect(e.supported).toBe(1); expect(e.missing).toBe(1); expect(e.unknown).toBe(2); expect(e.conflicts).toBe(1);
  expect(e.results.find(r=>r.requirement.id==='internal-address-check')?.requirement.classification).toBe('optional');
 });
 test('600 square metres and three storeys are small; either larger fact activates professionals', () => {
  const p=createDemoProject(); p.details.proposedArea=600; p.details.storeys=3;
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='construction_plan_small')?.applicability).toBe('applicable');
  p.details.proposedArea=601;
  const e=evaluateProject(p); expect(e.results.filter(r=>r.requirement.id.startsWith('prof_') && r.requirement.classification==='required' && r.applicability==='applicable')).toHaveLength(7);
 });
 test('acknowledgement never fills missing evidence and uncertain source still needs review after upload', () => {
  const p=createDemoProject(); p.acknowledgements.push({requirementId:'elevations_small_extwalls',at:new Date().toISOString(),note:'reviewed'});
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='elevations_small_extwalls')?.evidenceState).toBe('missing');
  p.documents.push({...p.documents[0],id:'elev',documentType:'elevations'});
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='elevations_small_extwalls')?.evidenceState).toBe('human_review');
 });
 test('generic existing-conditions letter cannot verify seven professional disciplines', () => {
  const p=createDemoProject(); p.details.proposedArea=700; p.documents=[{...p.documents[0],documentType:'existing_conditions'}];
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='prof_structural_required_large')?.evidenceState).toBe('human_review');
 });
 test('empty extracted text is incomplete, and address mismatch conflicts with matched evidence', () => {
  const p=createDemoProject(); p.documents[0].text='';
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='construction_plan_small')?.evidenceState).toBe('incomplete');
  p.documents[0].text='Construction plan'; p.documents[0].fields.projectAddress.value='122 Example Lane';
  expect(evaluateProject(p).results.find(r=>r.requirement.id==='construction_plan_small')?.evidenceState).toBe('conflicting');
 });
 test('report snapshots evidence, uncertainty, and presence-only disclaimer', () => {
  const p=createDemoProject(); const r=buildReportData(p,evaluateProject(p)); p.name='changed';
  expect(r.project.name).not.toBe('changed'); expect(r.disclaimer).toContain('compliance');
  expect(requirements.filter(r=>r.classification==='required')).toHaveLength(13);
 });
 test('new projects reject invalid facts', () => {
  const p=createDemoProject(); expect(()=>createProject({name:'',contractor:'',client:'',details:p.details})).toThrow();
  expect(()=>createProject({name:'Valid',contractor:'',client:'',details:{...p.details,storeys:1.5}})).toThrow();
 });
});

test('four storeys triggers large requirements even with small area, and unknown energy selection stays unknown',()=>{
 const p=createDemoProject();p.details.storeys=4;
 const e=evaluateProject(p); expect(e.results.find(r=>r.requirement.id==='a10_energy_undertaking_required_large')?.applicability).toBe('applicable');
 expect(e.results.find(r=>r.requirement.id==='hrm_energy_checklist_required_large')?.applicability).toBe('undetermined');
 p.details.energyDocument='other';expect(evaluateProject(p).results.find(r=>r.requirement.id==='hrm_energy_checklist_required_large')?.applicability).toBe('not_applicable');
 p.details.energyDocument='hrm_checklist';expect(evaluateProject(p).results.find(r=>r.requirement.id==='hrm_energy_checklist_required_large')?.applicability).toBe('applicable');
});
test('null walls remain unknown and a known false road-work fact overrides unknown ownership',()=>{
 const p=createDemoProject();p.details.externalWalls=null;p.details.rightOfWayWork=false;
 const e=evaluateProject(p);expect(e.results.find(r=>r.requirement.id==='elevations_small_extwalls')?.applicability).toBe('undetermined');
 expect(e.results.find(r=>r.requirement.id==='nstir_approval_conditional')?.applicability).toBe('not_applicable');
});
test('street-only address needs clarification rather than a definite address conflict',()=>{
 const p=createDemoProject();p.documents=[p.documents[0]];p.documents[0].fields.projectAddress.value='120 Example Lane';
 const e=evaluateProject(p);expect(e.conflicts).toBe(0);expect(e.results.find(r=>r.requirement.id==='construction_plan_small')?.evidenceState).toBe('human_review');
});

test('readable classified plans without extracted address require human confirmation',()=>{
 const p=createDemoProject();p.documents=[p.documents[0]];p.documents[0].fields={};
 const e=evaluateProject(p);const r=e.results.find(r=>r.requirement.id==='construction_plan_small');
 expect(r?.evidenceState).toBe('human_review');expect(r?.reasons.join(' ')).toContain('No project address was extracted');expect(e.supported).toBe(0);
});
test('professional substitution names the professional author explicitly',()=>{
 for(const r of requirements.filter(r=>r.id.startsWith('prof_') && r.classification==='required')) expect(r.title).toContain('Professional’s Approval of Existing Conditions Letter');
});
