import { describe, expect, test } from 'bun:test';
import {
  applicationForms,
  buildingPermitCaveat,
  downloadPathFor,
  isGeneralBuildingPermitForm,
  isOfficialResource,
  KNOWN_FORM_FILES,
  loadResourceCatalog,
  OFFICIAL_RESOURCES,
  portalEntries,
  requirementsAndGuidance,
  resourcesFor,
  validateCatalog,
} from '../../frontend/src/domain/resources';

describe('official resource catalog gating + classification', () => {
  test('embedded snapshot preserves the exact OfficialResource schema', () => {
    expect(OFFICIAL_RESOURCES.length).toBe(21);
    expect(() => validateCatalog(OFFICIAL_RESOURCES)).not.toThrow();
    for (const r of OFFICIAL_RESOURCES) expect(isOfficialResource(r)).toBe(true);
  });

  test('schema guard rejects wrong shapes', () => {
    expect(isOfficialResource(null)).toBe(false);
    expect(isOfficialResource({ id: 'x' })).toBe(false);
    expect(isOfficialResource({ ...OFFICIAL_RESOURCES[0], kind: 'form' })).toBe(false);
    expect(isOfficialResource({ ...OFFICIAL_RESOURCES[0], jurisdiction: 'hrm-rules' })).toBe(false);
    expect(() => validateCatalog([{ ...OFFICIAL_RESOURCES[0] }, { ...OFFICIAL_RESOURCES[0] }])).toThrow();
  });

  test('municipality filter scopes entries and adds province-wide guidance only', () => {
    const catalog = loadResourceCatalog();
    const truro = resourcesFor('truro', catalog);
    expect(truro.length).toBeGreaterThan(0);
    for (const r of truro) expect(['truro', 'nova_scotia']).toContain(r.jurisdiction);
    // No HRM rules outside HRM: nothing hrm-scoped leaks into truro/other lists.
    expect(truro.some((r) => r.jurisdiction === 'hrm')).toBe(false);
    expect(resourcesFor('other_ns', catalog).some((r) => r.jurisdiction === 'hrm')).toBe(false);
    const hrm = resourcesFor('hrm', catalog);
    expect(hrm.some((r) => r.jurisdiction === 'hrm')).toBe(true);
    expect(hrm.some((r) => r.jurisdiction === 'truro')).toBe(false);
  });

  test('application forms are distinguished from requirements/guidance', () => {
    const catalog = loadResourceCatalog();
    const truro = resourcesFor('truro', catalog);
    const forms = applicationForms(truro);
    const reqGuide = requirementsAndGuidance(truro);
    expect(forms.every((f) => f.kind === 'application_form')).toBe(true);
    expect(reqGuide.every((r) => r.kind !== 'application_form')).toBe(true);
    expect(reqGuide.every((r) => r.kind !== 'portal')).toBe(true);
    // No overlap between the two buckets.
    const formIds = new Set(forms.map((f) => f.id));
    expect(reqGuide.some((r) => formIds.has(r.id))).toBe(false);
    // Portal entries are their own bucket.
    expect(portalEntries(truro).every((p) => p.kind === 'portal')).toBe(true);
  });

  test('non-building-permit forms are fenced off', () => {
    expect(buildingPermitCaveat('kentville-development-permit-2025')).toContain('NOT a building-permit');
    expect(buildingPermitCaveat('truro-energy-pathways')).toContain('not a general permit');
    expect(buildingPermitCaveat('truro-building-development-application-2023')).toBeNull();
    const catalog = loadResourceCatalog();
    const kentvilleForms = applicationForms(resourcesFor('kentville', catalog));
    expect(kentvilleForms.filter(isGeneralBuildingPermitForm).length).toBe(0);
    const truroForms = applicationForms(resourcesFor('truro', catalog));
    expect(truroForms.filter(isGeneralBuildingPermitForm).map((f) => f.id)).toEqual([
      'truro-building-development-application-2023',
    ]);
  });

  test('known file mappings resolve to shipped static PDFs only', () => {
    const catalog = loadResourceCatalog();
    for (const [id, file] of Object.entries(KNOWN_FORM_FILES)) {
      const entry = catalog.find((r) => r.id === id);
      expect(entry).toBeDefined();
      expect(entry!.format).toBe('pdf');
      expect(downloadPathFor(entry!)).toBe(`/official-forms/${file}`);
    }
    // Web-only entries have no download path (source link only).
    const webEntry = catalog.find((r) => r.id === 'truro-permits-page')!;
    expect(downloadPathFor(webEntry)).toBeNull();
  });
});
