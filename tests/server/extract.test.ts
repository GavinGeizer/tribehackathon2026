import { describe, expect, test } from "bun:test";
import { extractPdfText } from "../../server/extract.ts";
import { HttpError } from "../../server/validation.ts";

/** Minimal single-page text PDF generated inline (no external fixture). */
function minimalPdf(lines: string[]): Uint8Array {
  const content = `BT /F1 12 Tf 50 700 Td (${lines.join(") Tj 0 -16 Td (")}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

describe("extractPdfText", () => {
  test("extracts text from a generated PDF fixture", async () => {
    const bytes = minimalPdf(["Project Address: 123 Main Street", "Energy letter body"]);
    const result = await extractPdfText(bytes);
    expect(result.pages).toBe(1);
    expect(result.text).toContain("Project Address: 123 Main Street");
  });

  test("rejects corrupt pdf bytes as 422", async () => {
    try {
      await extractPdfText(new TextEncoder().encode("%PDF-1.4 corrupt >>>"));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(422);
    }
  });

  test("rejects scanned/empty pdf with actionable message", async () => {
    // A structurally valid PDF with no text content.
    const bytes = minimalPdf(["   "]);
    try {
      await extractPdfText(bytes);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(422);
      expect((err as HttpError).message.toLowerCase()).toMatch(/scan|no extractable text|no readable/);
    }
  });

  test("rejects over-page-count pdfs", async () => {
    const fakeUnpdf = {
      getDocumentProxy: async () => ({ numPages: 61, destroy: async () => {} }),
      extractText: async () => ({ totalPages: 61, text: ["x"] }),
    };
    try {
      await extractPdfText(new Uint8Array([1, 2, 3]), { unpdf: fakeUnpdf });
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(422);
    }
  });
});
