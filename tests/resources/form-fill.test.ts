import { describe, expect, test } from 'bun:test';
import { createProject } from '../../frontend/src/domain/seed';
import type { Project } from '../../frontend/src/domain/types';
import {
  fillTruroFormPdf,
  TRURO_FORM_FIELDS_TOTAL,
  truroAutofillWorkflow,
  type TruroPdfDocument,
  type TruroPdfForm,
  type TruroPdfLib,
} from '../../frontend/src/domain/form-fill';

const TRURO_PDF = new URL(
  '../../frontend/public/official-forms/truro-building-development-application-2023.pdf',
  import.meta.url,
);

function truroProject(overrides: Partial<Project['details']> = {}, extra: Partial<Project> = {}): Project {
  const p = createProject({
    name: 'Truro storefront renovation',
    contractor: 'Fundy Builders',
    client: 'Main Street Books',
    details: {
      address: '12 Prince Street, Truro, NS',
      description: 'Interior renovation of a street-level retail unit with partition changes.',
      proposedArea: null,
      storeys: null,
      externalWalls: null,
      onHrmRoad: null,
      rightOfWayWork: null,
      heritageProperty: null,
      energyDocument: null,
      ...overrides,
    },
  });
  return {
    ...p,
    jurisdiction: {
      province: 'NS',
      municipality: 'truro',
      municipalityName: 'Town of Truro',
      customerType: 'small_company',
      workflow: 'manual',
    },
    ...extra,
  };
}

function hrmProject(): Project {
  const p = truroProject();
  return {
    ...p,
    jurisdiction: {
      province: 'NS',
      municipality: 'hrm',
      municipalityName: 'Halifax Regional Municipality',
      customerType: 'small_company',
      workflow: 'commercial-renovation',
    },
  };
}

async function loadPdfLib(): Promise<TruroPdfLib> {
  // Isolated test dep (installed to /tmp/pp-pdf-test by the worker); the
  // frontend bundle resolves `pdf-lib` itself at integration time.
  const mod = await import('../../frontend/node_modules/pdf-lib/es/index.js');
  return mod as unknown as TruroPdfLib;
}

describe('truro reviewed autofill workflow', () => {
  test('unsupported outside Truro (HRM portal guide, others get downloads only)', () => {
    const hrm = truroAutofillWorkflow(hrmProject());
    expect(hrm.supported).toBe(false);
    if (!hrm.supported) expect(hrm.reason).toContain('HRM');

    const cbrm = truroProject();
    cbrm.jurisdiction = {
      province: 'NS',
      municipality: 'cbrm',
      municipalityName: 'Cape Breton Regional Municipality',
      customerType: 'small_company',
      workflow: 'manual',
    };
    const res = truroAutofillWorkflow(cbrm);
    expect(res.supported).toBe(false);
  });

  test('Truro proposals map only unambiguous fields, nothing fabricated', () => {
    const wf = truroAutofillWorkflow(truroProject());
    expect(wf.supported).toBe(true);
    if (!wf.supported) return;
    const byKind = new Map(wf.proposals.map((p) => [p.kind, p]));
    expect(byKind.get('address')?.fieldNames).toEqual(['Site Address']);
    expect(byKind.get('address')?.value).toBe('12 Prince Street, Truro, NS');
    expect(byKind.get('scope')?.fieldNames[0]).toBe('Project DescriptionRow1');
    expect(byKind.has('contractor')).toBe(false);
    expect(byKind.has('name')).toBe(false);
    // Every proposal needs explicit approval.
    expect(wf.proposals.every((p) => p.needsExplicitApproval)).toBe(true);
  });

  test('real PDF roundtrip: template has 96 fields, fill is non-empty, template preserved', async () => {
    const pdfLib = await loadPdfLib();
    const templateBytes = new Uint8Array(await Bun.file(TRURO_PDF).arrayBuffer());
    const before: TruroPdfDocument = await pdfLib.PDFDocument.load(templateBytes.slice(), {
      ignoreEncryption: true,
    } as never);
    const beforeCount = (before.getForm() as unknown as { getFields(): unknown[] }).getFields().length;
    expect(beforeCount).toBe(TRURO_FORM_FIELDS_TOTAL);

    const project = truroProject();
    const { bytes, report } = await fillTruroFormPdf(
      project,
      {
        templateBytes,
        approvals: { name: true, address: true, scope: true, contractor: true },
      },
      pdfLib,
    );
    expect(bytes.length).toBeGreaterThan(50_000);
    expect(report.outputLabel).toBe('DRAFT — NEEDS REVIEW');
    expect(report.templatePreserved).toBe(true);
    expect(report.filledFieldNames).toContain('Site Address');
    expect(report.filledFieldNames).not.toContain('Text19');
    expect(report.filledFieldNames).not.toContain('Name');
    expect(report.unfilledUnknownCount).toBe(96 - report.filledFieldNames.length);
    expect(report.userApprovalAudit.length).toBe(2);

    // Re-read the output with the real library: values landed, unknowns blank.
    const outDoc: TruroPdfDocument = await pdfLib.PDFDocument.load(bytes, {
      ignoreEncryption: true,
    } as never);
    const outForm = outDoc.getForm() as unknown as TruroPdfForm & {
      getTextField(n: string): { getText(): string | undefined };
      getFields(): unknown[];
    };
    expect(outForm.getFields().length).toBe(96);
    expect(outForm.getTextField('Site Address').getText()).toBe('12 Prince Street, Truro, NS');
    expect(outForm.getTextField('Text19').getText()).toBeUndefined();
    expect(outForm.getTextField('Name').getText()).toBeUndefined();
    expect(outForm.getTextField('Project DescriptionRow1').getText()).toContain('Interior renovation');
    expect(outForm.getTextField('Company').getText()).toBeUndefined();
    expect(outForm.getTextField('Owner or Authorized Agent').getText()).toBeUndefined();
    expect(outForm.getTextField('Date').getText()).toBeUndefined();
  });

  test('no approval means no fields filled; signature/date never filled', async () => {
    const pdfLib = await loadPdfLib();
    const templateBytes = new Uint8Array(await Bun.file(TRURO_PDF).arrayBuffer());
    const project = truroProject();
    const { bytes, report } = await fillTruroFormPdf(
      project,
      { templateBytes, approvals: { name: false, address: false, scope: false, contractor: false } },
      pdfLib,
    );
    expect(report.filledFieldNames).toEqual([]);
    expect(report.unfilledUnknownCount).toBe(96);
    expect(report.userApprovalAudit).toEqual([]);
    const outDoc: TruroPdfDocument = await pdfLib.PDFDocument.load(bytes, {
      ignoreEncryption: true,
    } as never);
    const outForm = outDoc.getForm() as unknown as {
      getTextField(n: string): { getText(): string | undefined };
      getField(n: string): { constructor: { name: string } };
    };
    // Signature is a /Sig field, not a text field: getTextField throws, which
    // proves it cannot be text-filled through this path. It stays untouched.
    expect(() => outForm.getTextField('Signature')).toThrow();
    expect(outForm.getField('Signature').constructor.name).toBe('PDFSignature');
    expect(outForm.getTextField('Date').getText()).toBeUndefined();
    expect(outForm.getTextField('Site Address').getText()).toBeUndefined();
  });

  test('unsupported workflow throws (failure path)', async () => {
    const pdfLib = await loadPdfLib();
    const templateBytes = new Uint8Array(await Bun.file(TRURO_PDF).arrayBuffer());
    await expect(
      fillTruroFormPdf(
        hrmProject(),
        { templateBytes, approvals: { name: true, address: true, scope: true, contractor: true } },
        pdfLib,
      ),
    ).rejects.toThrow();
  });
});
