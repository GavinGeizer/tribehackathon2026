import { describe, test, expect } from 'bun:test';
import { normalizeProject } from '../../server/index';

describe('updated regulatory project contract', () => {
  test('keeps unknown heritage and energy conditions unknown', () => {
    const project = normalizeProject({ address: '120 Example Lane' });
    expect(project.heritageProperty).toBeNull();
    expect(project.energyDocument).toBeNull();
  });
  test('preserves explicit heritage and energy selection supplied by the workspace', () => {
    const project = normalizeProject({ address: '120 Example Lane', heritageProperty: true, energyDocument: 'hrm_checklist' });
    expect(project.heritageProperty).toBe(true);
    expect(project.energyDocument).toBe('hrm_checklist');
  });
});
