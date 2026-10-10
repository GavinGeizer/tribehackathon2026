import { describe, expect, test } from 'bun:test';
import { fillPdfForm, inspectPdfForm, type PdfFormField } from '../../frontend/src/domain/pdf-forms';

const TRURO = new URL(
  '../../frontend/public/official-forms/truro-building-development-application-2023.pdf',
  import.meta.url,
);
const SCHEDULE_A = new URL(
  '../../frontend/public/official-forms/ns-schedule-a-letters-undertaking.pdf',
  import.meta.url,
);
const GAS = new URL(
  '../../frontend/public/official-forms/provincial/fuel-gas-permit-application.pdf',
  import.meta.url,
);

async function bytesOf(url: URL): Promise<Uint8Array> {
  return new Uint8Array(await Bun.file(url).arrayBuffer());
}

function byName(fields: PdfFormField[]): Map<string, PdfFormField> {
  return new Map(fields.map((f) => [f.name, f]));
}

describe('pdf-forms generic AcroForm engine on real originals', () => {
  test('Truro original: 96 exact fields with types, pages, no fabricated labels', async () => {
    const fields = await inspectPdfForm(await bytesOf(TRURO));
    expect(fields.length).toBe(96);
    const map = byName(fields);
    // Exact names preserved.
    expect(map.has('Site Address')).toBe(true);
    expect(map.has('Project DescriptionRow1')).toBe(true);
    expect(map.has('Signature')).toBe(true);
    expect(map.has('New Use')).toBe(true);
    // Display labels come from original PDF tooltips, with exact field IDs retained.
    expect(map.get('Class of Work NEW')?.label).toBe('Class of Work: NEW');
    expect(map.get('Site Address')?.label).toBe('Site Address');
    expect(map.get('Name_2')?.label).toBe('Name');
    for (const f of fields) expect(f.label.length).toBeGreaterThan(0);
    // Types mapped from real AcroForm classes.
    expect(map.get('Site Address')?.type).toBe('text');
    expect(map.get('Signature')?.type).toBe('signature');
    expect(map.get('New Use')?.type).toBe('radio');
    expect(map.get('New Use')?.options).toEqual(['Yes', 'No']);
    expect(map.get('Class of Work NEW')?.type).toBe('checkbox');
    expect(map.get('Class of Work NEW')?.value).toBe(false);
    // Single-page form: every determinable page is 1; null allowed, never wrong.
    for (const f of fields) {
      expect(f.page === null || f.page === 1).toBe(true);
    }
    expect(map.get('Site Address')?.page).toBe(1);
    expect(map.get('New Use')?.page).toBe(1);
    // readOnly booleans present.
    for (const f of fields) expect(typeof f.readOnly).toBe('boolean');
    // Unsupported/signature fields are exposed, not hidden.
    expect(fields.some((f) => f.type === 'signature')).toBe(true);
  });

  test('ScheduleA original: 256 fields incl. signatures, multi-page mapping', async () => {
    const fields = await inspectPdfForm(await bytesOf(SCHEDULE_A));
    expect(fields.length).toBe(256);
    const map = byName(fields);
    expect(map.get('address of project')?.type).toBe('text');
    expect(map.get('name of project')?.type).toBe('text');
    const sigs = fields.filter((f) => f.type === 'signature');
    expect(sigs.length).toBe(11);
    // Multi-page doc: at least two distinct non-null pages identified.
    const pages = new Set(fields.map((f) => f.page).filter((p) => p !== null));
    expect(pages.size).toBeGreaterThanOrEqual(2);
    for (const p of pages) expect(p! >= 1 && p! <= 24).toBe(true);
    expect(map.get('address of project')?.page).not.toBeNull();
  });

  test('gas original: 54 fields with checkboxes + signatures, page mapping', async () => {
    const fields = await inspectPdfForm(await bytesOf(GAS));
    expect(fields.length).toBe(54);
    const map = byName(fields);
    expect(map.get('Company Name')?.type).toBe('text');
    expect(map.get('Heating')?.type).toBe('checkbox');
    expect(map.get('Heating')?.value).toBe(false);
    expect(map.get('Heating')?.page).toBe(1);
    expect(map.get('Company Name')?.page).toBe(1);
    expect(map.get('Cylinders')?.page).toBe(2);
    expect(map.get('Permit Fees')?.page).toBe(3);
    const sigs = fields.filter((f) => f.type === 'signature');
    expect(sigs.length).toBe(2);
  });

  test('draft roundtrip: text + checkbox + radio fill, preservation, no flatten/sign', async () => {
    const before = await bytesOf(GAS);
    const out = await fillPdfForm(before, {
      'Company Name': 'Acme Test Co',
      Heating: true,
    });
    expect(out.length).toBeGreaterThan(50_000);
    const after = byName(await inspectPdfForm(out));
    expect(after.get('Company Name')?.value).toBe('Acme Test Co');
    expect(after.get('Heating')?.value).toBe(true);
    // Unfilled values preserved as blank; field count identical (no flatten).
    expect(after.size).toBe(54);
    expect(after.get('Street')?.value).toBe('');
    expect(after.get('Laundry')?.value).toBe(false);
    // Signatures untouched.
    expect(after.get('Card Holders Signature')?.type).toBe('signature');

    // Radio roundtrip on Truro.
    const truroOut = await fillPdfForm(await bytesOf(TRURO), { 'New Use': 'Yes' });
    const truroAfter = byName(await inspectPdfForm(truroOut));
    expect(truroAfter.size).toBe(96);
    const newUse = truroAfter.get('New Use');
    expect(newUse?.type).toBe('radio');
    expect(newUse?.value).toBe('Yes');
    // Unchecking works too.
    const gasOut2 = await fillPdfForm(out, { Heating: false });
    expect(byName(await inspectPdfForm(gasOut2)).get('Heating')?.value).toBe(false);
  });

  test('read-only fields are exposed and rejected', async () => {
    // Build a read-only variant in-memory via pdf-lib (isolated dep), then
    // verify the engine exposes readOnly=true and refuses to fill it.
    const mod = await import('../../frontend/node_modules/pdf-lib/cjs/index.js');
    const { PDFDocument } = mod as unknown as {
      PDFDocument: {
        load(b: Uint8Array): Promise<{
          getForm(): { getTextField(n: string): { enableReadOnly(): void } };
          save(): Promise<Uint8Array>;
        }>;
      };
    };
    const doc = await PDFDocument.load(await bytesOf(GAS));
    doc.getForm().getTextField('Company Name').enableReadOnly();
    const roBytes = new Uint8Array(await doc.save());
    const inspected = byName(await inspectPdfForm(roBytes));
    expect(inspected.get('Company Name')?.readOnly).toBe(true);
    await expect(fillPdfForm(roBytes, { 'Company Name': 'x' })).rejects.toThrow(/read-only/);
  });

  test('unknown keys, type mismatches, signatures rejected; corrupt bytes graceful', async () => {
    const gas = await bytesOf(GAS);
    await expect(fillPdfForm(gas, { 'No Such Field': 'x' })).rejects.toThrow(/Unknown form field/);
    await expect(fillPdfForm(gas, { 'Company Name': true as unknown as string })).rejects.toThrow(
      /requires a string/,
    );
    await expect(fillPdfForm(gas, { Heating: 'yes' as unknown as boolean })).rejects.toThrow(
      /requires a boolean/,
    );
    await expect(fillPdfForm(gas, { 'Card Holders Signature': 'signed' })).rejects.toThrow(/signature/i);
    await expect(fillPdfForm(await bytesOf(TRURO), { 'New Use': 'Maybe' })).rejects.toThrow(
      /not one of the radio options/,
    );
    await expect(inspectPdfForm(new Uint8Array([1, 2, 3]))).rejects.toThrow(/Could not read the PDF form/);
    await expect(fillPdfForm(new Uint8Array([1, 2, 3]), {})).rejects.toThrow(/Could not read the PDF form/);
    // never ignoreEncryption: the string must not appear in the engine source.
    const src = await Bun.file(
      new URL('../../frontend/src/domain/pdf-forms.ts', import.meta.url),
    ).text();
    expect(src).not.toContain('ignoreEncryption: true');
    expect(src).toContain('NEVER');
  });
});
test('rejects a genuine XFA dictionary without silently converting the form',async()=>{
 const {PDFDocument,PDFName,PDFDict,PDFString}=await import('../../frontend/node_modules/pdf-lib/cjs/index.js');
 const doc=await PDFDocument.load(await Bun.file('frontend/public/official-forms/provincial/fuel-gas-permit-application.pdf').arrayBuffer());
 doc.catalog.lookup(PDFName.of('AcroForm'),PDFDict).set(PDFName.of('XFA'),PDFString.of('Synthetic unsupported XFA marker'));
 const bytes=await doc.save({updateFieldAppearances:false});
 await expect(inspectPdfForm(bytes)).rejects.toThrow(/XFA/);await expect(fillPdfForm(bytes,{})).rejects.toThrow(/XFA/);
});
