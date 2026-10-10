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
