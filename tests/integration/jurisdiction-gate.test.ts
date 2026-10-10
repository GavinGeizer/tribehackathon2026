import { expect, test } from 'bun:test';
import { createDemoProject } from '../../frontend/src/domain/seed';
import { evaluateProject } from '../../frontend/src/domain/engine';

test('Halifax rules are not applied to a different municipality or unsupported workflow', () => {
  const project = createDemoProject();
  project.jurisdiction = { province: 'NS', municipality: 'truro', municipalityName: 'Truro', customerType: 'individual', workflow: 'manual' };
  const evaluation = evaluateProject(project);
  expect(evaluation.applicable).toBe(0);
  expect(evaluation.results.some(r => r.requirement.sourceUrl === 'https://www.halifax.ca/media/72812')).toBe(false);
  expect(evaluation.results.some(r => r.requirement.id === 'internal-coverage-review')).toBe(true);
});
