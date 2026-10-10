/**
 * Generic AcroForm engine over ORIGINAL official PDF forms (browser completion).
 *
 * Scope: pure pdf-lib read/fill of AcroForm fields. No jurisdiction rules, no
 * project-data mapping, no persistence, no form discovery — the lead owns
 * UI/persistence/discovery. Callers pass raw template bytes and explicit
 * per-field values; this module never fabricates labels or values.
 *
 * Loading uses the real bundler-resolvable lazy `await import('pdf-lib')`
 * (`pdf-lib` is installed in `frontend/`). Encrypted/protected PDFs are
 * rejected gracefully — `ignoreEncryption` is NEVER used.
 *
 * Preservation: filling sets only the requested, validated fields; all other
 * content and unfilled values are preserved through pdf-lib serialization.
 * The output bytes differ from the original template. Output is never flattened and never signed.
 */

export interface PdfFormField {
  name: string;
  /** Human label; defaults to the original field name — never fabricated. */
  label: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'signature' | 'unsupported';
  options: string[];
  value: string | boolean;
  readOnly: boolean;
  /** 1-based page of the first widget, or null when not determinable. */
  page: number | null;
}

export interface PdfLibLike {
  PDFDocument: {
    load(data: Uint8Array | ArrayBuffer, options?: { ignoreEncryption?: boolean }): Promise<PdfDocumentLike>;
  };
  PDFName?: { of(name: string): unknown };
}

export interface PdfFormLike {
  getFields(): PdfFieldLike[];
}

export interface PdfDocumentLike {
  getForm(): PdfFormLike;
  getPages(): { node: { get(key: unknown): unknown } }[];
  context: { lookup(ref: unknown): { size(): number; get(i: number): unknown } | { get(key: unknown): unknown } };
  save(): Promise<Uint8Array>;
}

export interface PdfFieldLike {
  getName(): string;
  isReadOnly(): boolean;
  acroField: { getWidgets(): { dict: unknown }[] };
}

let pdfClasses: Record<string, unknown> = {};

async function loadPdfLib(): Promise<PdfLibLike> {
  // Lazy actual import (bundler-resolvable; `pdf-lib` is a frontend
  // dependency). Test/Node runners without installed frontend node_modules
  // fall back to the isolated path ONLY via NODE_PATH resolution — never a
  // second copy or a static import.
  const library = await import('pdf-lib');
  pdfClasses = library as unknown as Record<string, unknown>;
  return library as unknown as PdfLibLike;
}

function classOf(field: { constructor: { name: string } }): string {
  for (const name of ['PDFTextField','PDFCheckBox','PDFRadioGroup','PDFDropdown','PDFOptionList','PDFSignature']) {
    const ctor = pdfClasses[name];
    if (typeof ctor === 'function' && field instanceof ctor) return name;
  }
  return 'unsupported';
}

/** Map a 1-based page number from widget refs; null when indeterminable. */
function pageOf(doc:PdfDocumentLike,pdfLib:PdfLibLike,widgets:{dict:unknown}[]):number|null {
 try {
  if(!pdfLib.PDFName)return null;
  const widgetDicts=new Set(widgets.map(w=>w.dict));
  for(const [index,page] of doc.getPages().entries()){
   const refs=page.node.get(pdfLib.PDFName.of('Annots'));if(!refs)continue;
   const array=doc.context.lookup(refs) as {size():number;get(i:number):unknown};
   if(typeof array.size!=='function')continue;
   for(let i=0;i<array.size();i++)if(widgetDicts.has(doc.context.lookup(array.get(i))))return index+1;
  }
 }catch{/* Unknown page stays explicit. */}
 return null;
}

/**
 * Page identification via widget refs: match each field's widget annotation
 * object against page /Annots arrays by comparing the looked-up annotation
 * dictionaries' /T entries. Falls back to null when not determinable.
 */
function pageViaAnnots(
  doc: PdfDocumentLike,
  pdfLib: PdfLibLike,
  fieldName: string,
): number | null {
  try {
    const PDFName = pdfLib.PDFName;
    if (!PDFName) return null;
    const pages = doc.getPages();
    for (let pi = 0; pi < pages.length; pi++) {
      const annotsRef = pages[pi]!.node.get(PDFName.of('Annots'));
      if (!annotsRef) continue;
      const arr = doc.context.lookup(annotsRef) as { size(): number; get(i: number): unknown };
      if (typeof arr.size !== 'function') continue;
      for (let i = 0; i < arr.size(); i++) {
        const annot = doc.context.lookup(arr.get(i)) as { get(key: unknown): unknown };
        if (!annot || typeof annot.get !== 'function') continue;
        const t = annot.get(PDFName.of('T'));
        if (t && String(t).replace(/^\(|\)$/g, '') === fieldName) return pi + 1;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readValue(field: PdfFieldLike & Record<string, unknown>): string | boolean {
  const kind = classOf(field as { constructor: { name: string } });
  try {
    if (kind === 'PDFCheckBox') {
      return Boolean((field as unknown as { isChecked(): boolean }).isChecked());
    }
    if (kind === 'PDFRadioGroup') {
      const sel = (field as unknown as { getSelected(): string | undefined }).getSelected();
      return sel ?? '';
    }
    if (kind === 'PDFDropdown' || kind === 'PDFOptionList') {
      return ((field as unknown as { getSelected(): string[] }).getSelected() ?? [])[0] ?? '';
    }
    if (kind === 'PDFTextField') {
      const text = (field as unknown as { getText(): string | undefined }).getText();
      return text ?? '';
    }
  } catch {
    return '';
  }
  return '';
}

function fieldType(kind: string): PdfFormField['type'] {
  if (kind === 'PDFTextField') return 'text';
  if (kind === 'PDFCheckBox') return 'checkbox';
  if (kind === 'PDFDropdown') return 'dropdown';
  if (kind === 'PDFOptionList') return 'unsupported';
  if (kind === 'PDFRadioGroup') return 'radio';
  if (kind === 'PDFSignature') return 'signature';
  return 'unsupported';
}

function fieldOptions(field: PdfFieldLike & Record<string, unknown>): string[] {
  const kind = classOf(field as { constructor: { name: string } });
  try {
    if (kind === 'PDFRadioGroup') {
      return [...((field as unknown as { getOptions(): string[] }).getOptions() ?? [])];
    }
    if (kind === 'PDFDropdown' || kind === 'PDFOptionList') {
      return [...((field as unknown as { getOptions(): string[] }).getOptions() ?? [])];
    }
    if (kind === 'PDFCheckBox') {
      const f = field as unknown as {
        acroField: { dict: { get(key: unknown): unknown } };
      };
      void f;
      return [];
    }
  } catch {
    return [];
  }
  return [];
}

function assertAcroFormSupported(doc:PdfDocumentLike,pdfLib:PdfLibLike):void {
 const name=pdfLib.PDFName;if(!name)return;
 const catalog=(doc as unknown as {catalog:{get(key:unknown):unknown}}).catalog;
 const ref=catalog.get(name.of('AcroForm'));if(!ref)return;
 const form=doc.context.lookup(ref) as {get(key:unknown):unknown};
 if(form.get(name.of('XFA')))throw new Error('This official template uses XFA. Browser editing is not supported for this form; use the original official process.');
}

/**
 * Inspect the AcroForm of an ORIGINAL official PDF. Field names are exact;
 * labels default to the original name (no fabricated labels); pages are
 * identified via widget refs where possible (null otherwise).
 * Throws a clear error on corrupt bytes or protected PDFs.
 */
export async function inspectPdfForm(bytes: Uint8Array): Promise<PdfFormField[]> {
  const pdfLib = await loadPdfLib();
  let doc: PdfDocumentLike;
  try {
    // NEVER ignoreEncryption: protected PDFs must fail gracefully here.
    doc = await pdfLib.PDFDocument.load(bytes.slice().buffer as ArrayBuffer);
  } catch (e) {
    throw new Error(
      `Could not read the PDF form (${e instanceof Error ? e.message.slice(0, 160) : 'unreadable bytes'}). ` +
        'The file may be corrupt or password-protected; use the original official PDF.',
    );
  }
  assertAcroFormSupported(doc,pdfLib);
  let rawFields: PdfFieldLike[];
  try {
    rawFields = doc.getForm().getFields() as unknown as PdfFieldLike[];
  } catch (e) {
    throw new Error(
      `This PDF has no readable AcroForm (${e instanceof Error ? e.message.slice(0, 120) : 'unknown'}).`,
    );
  }
  void pageOf;
  return rawFields.map((f) => {
    const name = f.getName();
    const kind = classOf(f as { constructor: { name: string } });
    const type = fieldType(kind);
    let readOnly = false;
    try {
      readOnly = f.isReadOnly();
    } catch {
      readOnly = true;
    }
    return {
      name,
      label: (()=>{
       try{const dict=(f.acroField as unknown as {dict:{get(key:unknown):unknown}}).dict;const tooltip=pdfLib.PDFName?dict.get(pdfLib.PDFName.of('TU')):null;const value=tooltip&&typeof (tooltip as {decodeText?:unknown}).decodeText==='function'?(tooltip as {decodeText():string}).decodeText():'';return value.trim().replace(/:\s*$/,'')||name;}catch{return name;}
      })(),
      type,
      options: fieldOptions(f as PdfFieldLike & Record<string, unknown>),
      value: readValue(f as PdfFieldLike & Record<string, unknown>),
      readOnly,
      page: pageOf(doc,pdfLib,f.acroField.getWidgets()) ?? pageViaAnnots(doc, pdfLib, name),
    };
  });
}

/**
 * Fill an ORIGINAL official PDF with explicit values. Strict validation:
 * - unknown keys are rejected (never silently ignored),
 * - text/dropdown/radio require string values; checkbox requires boolean,
 * - read-only, signature, and unsupported fields are rejected,
 * - radio values must be one of the field options.
 * Original content and unfilled values are preserved; output is not flattened
 * and not signed. Throws a clear error on corrupt/protected input.
 */
export async function fillPdfForm(
  bytes: Uint8Array,
  values: Record<string, string | boolean>,
): Promise<Uint8Array> {
  const pdfLib = await loadPdfLib();
  let doc: PdfDocumentLike;
  try {
    // NEVER ignoreEncryption: protected PDFs must fail gracefully here.
    doc = await pdfLib.PDFDocument.load(bytes.slice().buffer as ArrayBuffer);
  } catch (e) {
    throw new Error(
      `Could not read the PDF form (${e instanceof Error ? e.message.slice(0, 160) : 'unreadable bytes'}). ` +
        'The file may be corrupt or password-protected; use the original official PDF.',
    );
  }
  assertAcroFormSupported(doc,pdfLib);
  const form = doc.getForm() as unknown as {
    getFields(): PdfFieldLike[];
    getTextField(name: string): { setText(v: string): void };
    getCheckBox(name: string): { check(): void; uncheck(): void };
    getDropdown(name: string): { setOptions(o: string[]): void; select(v: string): void; clear():void };
    getRadioGroup(name: string): { select(v: string): void; clear(): void };
  };
  const known = new Map<string, PdfFieldLike>();
  for (const f of form.getFields()) known.set(f.getName(), f);

  for (const key of Object.keys(values)) {
    const field = known.get(key);
    if (!field) throw new Error(`Unknown form field "${key}". Only exact field names from inspectPdfForm are accepted.`);
    const kind = classOf(field as { constructor: { name: string } });
    const type = fieldType(kind);
    const value = values[key];
    let readOnly = false;
    try {
      readOnly = field.isReadOnly();
    } catch {
      readOnly = true;
    }
    if (readOnly) throw new Error(`Field "${key}" is read-only and cannot be filled.`);
    if (type === 'signature') throw new Error(`Field "${key}" is a signature field and is never filled.`);
    if (type === 'unsupported') throw new Error(`Field "${key}" has an unsupported type and cannot be filled.`);
    if (type === 'text') {
      if (typeof value !== 'string') throw new Error(`Field "${key}" is a text field and requires a string value.`);
      form.getTextField(key).setText(value);
    } else if (type === 'checkbox') {
      if (typeof value !== 'boolean') throw new Error(`Field "${key}" is a checkbox and requires a boolean value.`);
      if (value) form.getCheckBox(key).check();
      else form.getCheckBox(key).uncheck();
    } else if (type === 'dropdown') {
      if (typeof value !== 'string') throw new Error(`Field "${key}" is a dropdown and requires a string value.`);
      const options = fieldOptions(field as PdfFieldLike & Record<string, unknown>);
      if (value!=='' && options.length && !options.includes(value)) {
        throw new Error(`Field "${key}" value "${value}" is not one of the dropdown options.`);
      }
      if(value==='') form.getDropdown(key).clear();
      else form.getDropdown(key).select(value);
    } else if (type === 'radio') {
      if (typeof value !== 'string') throw new Error(`Field "${key}" is a radio group and requires a string value.`);
      const options = fieldOptions(field as PdfFieldLike & Record<string, unknown>);
      if (value!=='' && !options.includes(value)) {
        throw new Error(`Field "${key}" value "${value}" is not one of the radio options (${options.join(', ') || 'none'}).`);
      }
      if(value==='') form.getRadioGroup(key).clear();
      else form.getRadioGroup(key).select(value);
    }
  }
  const out = await doc.save();
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}
