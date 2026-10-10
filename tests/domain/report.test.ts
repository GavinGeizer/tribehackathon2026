import { expect, test } from 'bun:test';
import { createDemoProject } from '../../frontend/src/domain/seed';
import { evaluateProject } from '../../frontend/src/domain/engine';
import { buildReportPdf } from '../../frontend/src/domain/report';
test('report is a real paginated PDF with source citations, evidence and acknowledgement notes',()=>{
 const p=createDemoProject();p.acknowledgements.push({requirementId:'elevations_small_extwalls',at:new Date().toISOString(),note:'Awaiting architect review'});
 const pdf=buildReportPdf(p,evaluateProject(p)); const bytes=pdf.output();
 expect(bytes.startsWith('%PDF-')).toBe(true);expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
 expect(bytes).toContain('https://www.halifax.ca/media/72812');expect(bytes).toContain('Awaiting architect review');expect(bytes).toContain('extracted address');expect(bytes).toContain('Synthetic demo');
});

test('PDF facts label area units and the total-building assumption',()=>{
 const p=createDemoProject();const text=buildReportPdf(p,evaluateProject(p)).output();
 expect(text).toContain('Proposed Total Area');expect(text).toContain('total building assumption');expect(text).toContain('m²');
});

test('lifecycle export includes recorded dates, jurisdiction and reviewed provenance', () => {
 const p=createDemoProject();
 p.jurisdiction={province:'NS',municipality:'truro',municipalityName:'Town of Truro',customerType:'individual',workflow:'manual'};
 p.permit={status:'issued',reference:'SYNTHETIC-REF-17',issuedOn:'2026-10-01',expiresOn:'2026-11-09',expirySource:'Synthetic issued record',reminderDays:[30,7],remindersEnabled:true,renewal:null};
 p.activity.push({id:'review-17',at:'2026-10-10T13:00:00Z',message:'Reviewed field update: corrected contractor from quoted evidence.'});
 const text=buildReportPdf(p,evaluateProject(p)).output();
 expect(text).toContain('Town of Truro');expect(text).toContain('SYNTHETIC-REF-17');
 expect(text).toContain('2026-11-09');expect(text).toContain('Synthetic issued record');
 expect(text).toContain('Reviewed field update');expect(text).not.toContain('https://www.halifax.ca/media/72812');
});
