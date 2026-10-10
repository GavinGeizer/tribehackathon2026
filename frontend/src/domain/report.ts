import { jsPDF } from 'jspdf';
import type { Evaluation, Project, ReportData } from './types';
export const REPORT_DISCLAIMER='PermitPath checks supporting document presence and project-fact consistency only. It does not verify engineering adequacy, certify legal compliance, or guarantee municipal approval. Unknown facts and ambiguous source wording require human review. Supported jurisdiction rule packs cite their last verification dates; coverage is limited to the selected verified workflow. Uploaded documents are untrusted data. Originals are processed but not retained; extracted text and project records are stored in this browser only.';
export function buildReportData(project:Project,evaluation:Evaluation):ReportData {
 return {project:structuredClone(project),evaluation:structuredClone(evaluation),generatedAt:new Date().toISOString(),disclaimer:REPORT_DISCLAIMER};
}
export function buildReportPdf(project:Project,evaluation:Evaluation):jsPDF {
 const data=buildReportData(project,evaluation); const pdf=new jsPDF({unit:'mm',format:'a4'}); let y=20;
 const clean=(value:string)=>value.replace(/[—–]/g,'-').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
 const write=(value:string,bold=false)=>{
  pdf.setFont('helvetica',bold?'bold':'normal'); pdf.setFontSize(bold?12:10);
  const lines=pdf.splitTextToSize(clean(value),170) as string[];
  for(const line of lines) {if(y>275){pdf.addPage();y=20;}pdf.text(line,20,y);y+=bold?6:5;} y+=3;
 };
 write('PermitPath - Pre-submission evidence review',true); write(data.project.name,true);
 write(`Generated: ${data.generatedAt}\nEvaluated: ${data.evaluation.evaluatedAt}\nSynthetic demonstration: ${data.project.synthetic?'YES - fictional facts and summaries, not professionally verified':'No'}`);
 write(`Contractor: ${data.project.contractor}\nClient: ${data.project.client}\nAddress: ${data.project.details.address}\nScope: ${data.project.details.description}`);
 write('Project facts',true);
 for(const [key,value] of Object.entries(data.project.details)) if(key!=='address'&&key!=='description') write(`${key==='proposedArea'?'Proposed Total Area (m²; total building assumption)':key}: ${value===null?'Unknown':String(value)}`);
 write('Supporting evidence counts (no legal compliance score)',true);
 write(`Applicable required items: ${data.evaluation.applicable}; supported: ${data.evaluation.supported}; missing/incomplete: ${data.evaluation.missing}; required conditions unknown: ${data.evaluation.unknown}; conflicts (including internal checks): ${data.evaluation.conflicts}; human review: ${data.evaluation.humanReview}. Optional and later-stage items are excluded from the required denominator.`);
 write(data.disclaimer);
 write('Document inventory',true);
 for(const d of data.project.documents) write(`${d.name} | ${d.documentType} | ${d.pages} page(s) | analysis: ${d.method} | synthetic: ${d.synthetic?'yes':'no'}\n${[...d.uncertainties,...d.warnings].join('; ') || 'No extraction uncertainty reported; this does not verify technical adequacy.'}`);
 for(const r of data.evaluation.results) {
  write(r.requirement.title,true);write(`${r.requirement.classification} | ${r.applicability} | ${r.evidenceState} | acknowledged: ${r.acknowledged?'yes':'no'}`);
  write(r.requirement.description); write(`Next action: ${r.nextAction}`);
  for(const reason of r.reasons) write(`Review note: ${reason}`);
  for(const exception of r.requirement.exceptions) write(`Exception requiring review: ${exception}`);
  if(r.evidence.length) for(const e of r.evidence) write(`Evidence: ${e.documentName}${e.page?` (page ${e.page})`:''}\nQuote: ${e.quote}`); else write('Evidence: none attached.');
  for(const a of data.project.acknowledgements.filter(a=>a.requirementId===r.requirement.id)) write(`Acknowledgement ${a.at}: ${a.note}. Acknowledgement does not satisfy evidence.`);
  write(`Source: ${r.requirement.sourceUrl || 'Internal PermitPath check - no municipal requirement'}\n${r.requirement.sourceSection}\nVerified: ${r.requirement.lastVerified}; source status: ${r.requirement.verificationStatus}`);
 }
 const pages=pdf.getNumberOfPages(); for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setFontSize(8);pdf.text(`PermitPath | ${data.project.synthetic?'Synthetic demo | ':''}Page ${page} of ${pages}`,20,290);}
 return pdf;
}

export async function exportReport(project:Project,evaluation:Evaluation):Promise<void> {
 const pdf=buildReportPdf(project,evaluation);
 pdf.save(`PermitPath-${project.name.replace(/[^a-z0-9-]+/gi,'-').slice(0,70)}.pdf`);
}
