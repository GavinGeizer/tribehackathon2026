import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadResourceCatalog, resourcesFor, downloadPathFor, isGeneralBuildingPermitForm } from '../../frontend/src/domain/resources';

test('government Schedule A remains the verified original and a scoped supplement', () => {
  const form = resourcesFor('truro', loadResourceCatalog()).find(r => r.id === 'ns-schedule-a-letters-undertaking')!;
  expect(form.jurisdiction).toBe('nova_scotia');
  expect(form.url).toStartWith('https://www.novascotia.ca/');
  expect(isGeneralBuildingPermitForm(form)).toBe(false);
  expect(downloadPathFor(form)).toBe('/official-forms/ns-schedule-a-letters-undertaking.pdf');
  const bytes = readFileSync('frontend/public/official-forms/ns-schedule-a-letters-undertaking.pdf');
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('ad88408f6c6e4aa6101b19694995e26c2a576f84172720c87f61255ff92462de');
});
