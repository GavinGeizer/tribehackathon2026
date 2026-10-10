import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadResourceCatalog, downloadPathFor, isGeneralBuildingPermitForm } from '../../frontend/src/domain/resources';
const manifest = JSON.parse(readFileSync('deliverables/ns-government-forms/manifest.json', 'utf8'));

test('provincial pack joins the integrated catalog by exact official URL with scoped purposes', () => {
  const catalog = loadResourceCatalog();
  expect(new Set(catalog.map(r => r.url)).size).toBe(catalog.length);
  for (const supplied of manifest.resources) {
    const integrated = catalog.find(r => r.url === supplied.url)!;
    expect(integrated).toBeDefined();
    expect(integrated.jurisdiction).toBe('nova_scotia');
    expect(integrated.kind).toBe(supplied.kind);
    expect(isGeneralBuildingPermitForm(integrated)).toBe(false);
    expect(downloadPathFor(integrated)).not.toBeNull();
  }
});

test('every shipped provincial PDF retains verified original bytes', () => {
  const catalog = loadResourceCatalog();
  for (const entry of manifest.files) {
    const resource = catalog.find(r => r.url === entry.sourceUrl)!;
    const path = 'frontend/public' + downloadPathFor(resource);
    const bytes = readFileSync(path);
    expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  }
});
