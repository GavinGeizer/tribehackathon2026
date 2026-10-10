import { test, expect } from 'bun:test';
import { createDemoProject } from '../../frontend/src/domain/seed';
import { loadProjects, saveProjects } from '../../frontend/src/domain/storage';

test('new jurisdiction and permit metadata survive browser persistence without changing legacy documents', () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const items = new Map<string, string>();
  const storage = { get length() { return items.size; }, getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v); }, removeItem: (k: string) => { items.delete(k); }, clear: () => items.clear(), key: (n: number) => [...items.keys()][n] ?? null };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try {
    const project = createDemoProject();
    project.jurisdiction = { province: 'NS', municipality: 'truro', municipalityName: 'Truro', customerType: 'individual', workflow: 'manual' };
    project.permit = { status: 'issued', reference: 'SYNTHETIC-RECORD-1', issuedOn: '2026-09-10', expiresOn: '2026-11-09', expirySource: 'Synthetic user-recorded permit date, not a municipal identifier', reminderDays: [30, 7], remindersEnabled: true, renewal: null };
    saveProjects([project]);
    const loaded = loadProjects()[0];
    expect(loaded.jurisdiction).toEqual(project.jurisdiction);
    expect(loaded.permit).toEqual(project.permit);
    expect(loaded.documents).toEqual(project.documents);
  } finally { if (before) Object.defineProperty(globalThis, 'localStorage', before); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
