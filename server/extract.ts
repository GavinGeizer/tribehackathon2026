/**
 * PDF text extraction via unpdf (serverless PDF.js build).
 *
 * `unpdf` and `zod` are resolved with dynamic imports so the Worker bundle
 * only pays for what it uses, and so unit tests can inject fakes. The lead
 * installs `unpdf` and `zod` at the repository root.
 */
import { HttpError, MAX_PDF_PAGES, MAX_TEXT_CHARS } from "./validation";

export interface PdfExtraction {
  text: string;
  pages: number;
}

interface UnpdfModule {
  getDocumentProxy: (data: Uint8Array, options?: Record<string, unknown>) => Promise<{
    numPages: number;
    loadingTask?: { destroy?: () => Promise<void> | void };
  }>;
  extractText: (
    pdf: unknown,
    options?: { mergePages?: boolean },
  ) => Promise<{ totalPages: number; text: string | string[] }>;
}

async function loadUnpdf(): Promise<UnpdfModule> {
  try {
    return (await import("unpdf")) as unknown as UnpdfModule;
  } catch {
    throw new HttpError(
      500,
      "PDF extraction support is not installed. Ask the project lead to install the \"unpdf\" dependency.",
    );
  }
}

/**
 * Extract text from PDF bytes, preserving page evidence.
 *
 * Emits one "\f" (form-feed) separator between pages so downstream code can
 * map labeled lines back to page numbers. Throws HttpError:
 *  - 422 for scanned/empty (no extractable text) or corrupt PDFs,
 *  - 422 when page count exceeds 60 or text exceeds 150k chars.
 */
export async function extractPdfText(
  bytes: Uint8Array,
  deps?: { unpdf?: UnpdfModule },
): Promise<PdfExtraction> {
  const unpdf = deps?.unpdf ?? (await loadUnpdf());
  let pdf: { numPages: number; loadingTask?: { destroy?: () => Promise<void> | void } } | undefined;
  const destroyPdf = async (): Promise<void> => {
    // Official unpdf 1.8.1 cleanup: caller destroys pdf.loadingTask.
    try {
      await pdf?.loadingTask?.destroy?.();
    } catch {
      // Ignore cleanup failures.
    }
  };
  try {
    try {
      pdf = await unpdf.getDocumentProxy(bytes);
    } catch {
      throw new HttpError(
        422,
        "The PDF could not be read (corrupt or unsupported). Re-export the PDF and try again.",
      );
    }

    const pageCount = pdf.numPages ?? 0;
    if (!Number.isFinite(pageCount) || pageCount < 1) {
      throw new HttpError(
        422,
        "The PDF contains no readable pages. Re-export the PDF and try again.",
      );
    }
    if (pageCount > MAX_PDF_PAGES) {
      throw new HttpError(
        422,
        `The PDF has ${pageCount} pages, which exceeds the ${MAX_PDF_PAGES}-page limit. Split the document and try again.`,
      );
    }

    // Official extraction: merged text first (authoritative document text),
    // then per-page spans to preserve page evidence for labeled fields.
    let mergedText: string;
    let pages: string[];
    try {
      const merged = await unpdf.extractText(pdf, { mergePages: true });
      mergedText = typeof merged.text === "string" ? merged.text : merged.text.join("\n");
      const split = await unpdf.extractText(pdf, { mergePages: false });
      pages = Array.isArray(split.text) ? split.text : [split.text];
    } catch {
      throw new HttpError(
        422,
        "Text could not be extracted from the PDF. If this is a scanned document, add a text layer or upload a TXT/MD transcription.",
      );
    }

    if (mergedText.trim() === "") {
      throw new HttpError(
        422,
        "No extractable text was found in the PDF. Scanned/image-only PDFs are not supported — upload a text-based PDF or a TXT/MD transcription.",
      );
    }

    // Normalize whitespace per page but keep page boundaries via form-feed
    // separators so downstream code can map labeled lines to page numbers.
    const cleaned = pages.map((p) => (p ?? "").replace(/[ \t]+\n/g, "\n").trim());
    const rebuilt = cleaned.join("\n\f\n");
    // Prefer the official merged text when it agrees with per-page content;
    // otherwise fall back to the rebuilt per-page text (same content, with
    // page boundaries).
    const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();
    const joined =
      normalize(mergedText) === normalize(rebuilt.replace(/\f/g, " ")) ? mergedText : rebuilt;
    if (joined.length > MAX_TEXT_CHARS) {
      throw new HttpError(
        422,
        `Extracted PDF text is ${joined.length} characters, which exceeds the ${MAX_TEXT_CHARS}-character limit. Split the document and try again.`,
      );
    }
    return { text: joined, pages: pageCount };
  } finally {
    await destroyPdf();
  }
}

/** Extract text from TXT/MD bytes (UTF-8 enforced upstream). */
export function extractPlainText(text: string): { text: string; pages: number } {
  if (text.trim() === "") {
    throw new HttpError(
      422,
      "The text file is empty. Add content and try again.",
    );
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new HttpError(
      413,
      `Text content is ${text.length} characters, which exceeds the ${MAX_TEXT_CHARS}-character limit.`,
    );
  }
  return { text, pages: 1 };
}
