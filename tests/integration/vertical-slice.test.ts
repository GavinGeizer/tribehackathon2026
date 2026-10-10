import { describe, expect, test } from 'bun:test';
import { evaluateProject } from '../../frontend/src/domain/engine';
import { createDemoProject, createProject } from '../../frontend/src/domain/seed';
import { buildReportData } from '../../frontend/src/domain/report';
import type { DocumentAnalysis, Evaluation, Project, ProjectDocument } from '../../frontend/src/domain/types';
import worker from '../../server/index';

const fixtureRoot = new URL('../../deliverables/qa/', import.meta.url);

async function uploadFixture(project: Project, filename: string): Promise<ProjectDocument> {
  const fixture = Bun.file(new URL(filename, fixtureRoot));
  const bytes = await fixture.arrayBuffer();
  const form = new FormData();
  form.set('file', new File([bytes], filename, {
    type: filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
  }));
  form.set('project', JSON.stringify(project.details));
  const response = await worker.fetch(new Request('https://permitpath.test/api/analyze', {
    method: 'POST', body: form,
  }), {});
  expect(response.status).toBe(200);
  const analysis = await response.json() as DocumentAnalysis;
  expect(analysis.text.length).toBeGreaterThan(0);
  return {
    ...analysis,
    id: `integration-${filename}`,
    name: filename,
    size: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
    synthetic: true,
  };
}

function appendDocument(project: Project, document: ProjectDocument): Project {
  return { ...project, documents: [...project.documents, document], updatedAt: new Date().toISOString() };
}

function conflicts(evaluation: Evaluation): number {
  return evaluation.results.filter(result => result.evidenceState === 'conflicting').length;
}

describe('PermitPath document-to-readiness vertical slice', () => {
  test('the synthetic demo exposes missing, supporting, uncertain, and conflicting evidence', () => {
    const project = createDemoProject();
    const evaluation = evaluateProject(project);
    expect(project.synthetic).toBe(true);
    expect(project.documents.some(document => document.synthetic)).toBe(true);
    expect(evaluation.results.some(result => result.applicability === 'applicable' && result.evidenceState === 'missing')).toBe(true);
    expect(evaluation.results.some(result => result.evidenceState === 'satisfied' && result.evidence.length > 0)).toBe(true);
    expect(evaluation.results.some(result => result.applicability === 'undetermined')).toBe(true);
    expect(project.documents.some(document => document.fields.projectAddress &&
      document.fields.projectAddress.value !== project.details.address)).toBe(true);
    expect(conflicts(evaluation)).toBeGreaterThan(0);
  });

  test('an actual elevations PDF supplies traceable evidence and clears the missing state', async () => {
    const before = createDemoProject();
    const missingElevation = evaluateProject(before).results.find(result =>
      result.applicability === 'applicable' && result.evidenceState === 'missing' &&
      result.requirement.evidenceTypes.includes('elevations'));
    expect(missingElevation).toBeDefined();
    const document = await uploadFixture(before, 'A-201-Elevations.pdf');
    expect(document.documentType).toBe('elevations');
    expect(document.pages).toBeGreaterThan(0);
    const after = evaluateProject(appendDocument(before, document));
    const result = after.results.find(item => item.requirement.id === missingElevation!.requirement.id)!;
    expect(result.applicability).toBe('applicable');
    expect(['satisfied', 'human_review', 'incomplete']).toContain(result.evidenceState);
    expect(result.evidence.some(evidence => evidence.documentId === document.id && evidence.quote.trim().length > 0)).toBe(true);
    // Supporting evidence records presence; it does not certify drawing compliance.
    expect(buildReportData(appendDocument(before, document), after).disclaimer).toMatch(/compliance|approval|guarantee/i);
  });

  test('removing wrong-address evidence and uploading a corrected description reduces conflicts', async () => {
    const before = createDemoProject();
    const wrongAddress = before.documents.filter(document => document.fields.projectAddress &&
      document.fields.projectAddress.value !== before.details.address);
    expect(wrongAddress.length).toBeGreaterThan(0);
    const beforeEvaluation = evaluateProject(before);
    expect(conflicts(beforeEvaluation)).toBeGreaterThan(0);
    const removedIds = new Set(wrongAddress.map(document => document.id));
    const cleaned = { ...before, documents: before.documents.filter(document => !removedIds.has(document.id)) };
    const replacement = await uploadFixture(cleaned, 'replacement-project-description.txt');
    expect(replacement.documentType).toBe('project_description');
    expect(replacement.fields.projectAddress).toBeDefined();
    expect(replacement.fields.projectAddress.value).toContain('120 Example Lane');
    const after = evaluateProject(appendDocument(cleaned, replacement));
    expect(conflicts(after)).toBeLessThan(conflicts(beforeEvaluation));
    expect(after.results.flatMap(result => result.evidence).every(evidence => !removedIds.has(evidence.documentId))).toBe(true);
  });

  test('acknowledging a missing requirement preserves its missing evidence state', () => {
    const project = createDemoProject();
    const before = evaluateProject(project);
    const missing = before.results.find(result => result.applicability === 'applicable' && result.evidenceState === 'missing')!;
    expect(missing).toBeDefined();
    const acknowledged = {
      ...project,
      acknowledgements: [...project.acknowledgements, {
        requirementId: missing.requirement.id, note: 'We have recorded this gap for follow-up.', at: new Date().toISOString(),
      }],
    };
    const after = evaluateProject(acknowledged);
    const result = after.results.find(item => item.requirement.id === missing.requirement.id)!;
    expect(result.acknowledged).toBe(true);
    expect(result.evidenceState).toBe('missing');
    expect(result.evidence).toEqual(missing.evidence);
    expect(after.supported).toBe(before.supported);
  });

  test('a new project report uses the latest evaluation and preserves official citations and uncertainty', async () => {
    const demo = createDemoProject();
    const project = createProject({ name: 'Integration project', contractor: 'Synthetic builder', client: 'Synthetic client', details: demo.details });
    expect(project.documents).toHaveLength(0);
    const before = evaluateProject(project);
    const document = await uploadFixture(project, 'A-201-Elevations.pdf');
    const updated = appendDocument(project, document);
    const latest = evaluateProject(updated);
    expect(latest.results.some(result => result.evidence.some(evidence => evidence.documentId === document.id))).toBe(true);
    expect(before.results.every(result => result.evidence.every(evidence => evidence.documentId !== document.id))).toBe(true);
    const report = buildReportData(updated, latest);
    expect(report.project).toEqual(updated);
    expect(report.evaluation).toEqual(latest);
    expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
    expect(report.disclaimer.trim().length).toBeGreaterThan(0);
    expect(report.disclaimer).toMatch(/compliance|approval|guarantee/i);
    expect(report.evaluation.results.some(result => result.applicability === 'undetermined')).toBe(true);
    expect(report.evaluation.results.length).toBeGreaterThan(0);
    const regulatoryRequirements = report.evaluation.results.filter(result => result.requirement.classification === 'required');
    expect(regulatoryRequirements.length).toBeGreaterThan(0);
    for (const result of regulatoryRequirements) {
      expect(new URL(result.requirement.sourceUrl).hostname).toMatch(/(^|\.)halifax\.ca$/);
      expect(result.requirement.sourceSection.trim().length).toBeGreaterThan(0);
    }
  });
});
