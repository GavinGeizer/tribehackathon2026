/**
 * Upload validation for the PermitPath document worker.
 *
 * Platform-neutral: no Node/Cloudflare-only imports. All helpers operate on
 * plain values so they can be unit tested in isolation.
 */

export const MAX_FILE_BYTES = 5_242_880; // 5 MiB
export const MAX_TEXT_CHARS = 150_000;
export const MAX_PDF_PAGES = 60;
/**
 * Total multipart request body cap (~6 MiB). Enforced by reading the bounded
 * request stream before multipart parsing, so oversized bodies are rejected
 * with 413 even without (or regardless of) Content-Length.
 */
export const MAX_BODY_BYTES = 6_291_456; // 6 MiB

const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "md"]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream",
  "",
]);

/** HTTP error with a JSON-safe message (never includes upstream bodies/keys). */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export type FileKind = "pdf" | "text";

/**
 * Strip path components, control characters and unsafe sequences from an
 * uploader-supplied filename. Never returns an empty string.
 */
export function sanitizeFilename(raw: unknown): string {
  let name = typeof raw === "string" ? raw : "";
  // Strip any directory components (both separators) and drive letters.
  name = name.split(/[\\/]/).pop() ?? "";
  name = name.replace(/^[a-zA-Z]:/, "");
  // Remove control characters and trim whitespace/dots.
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  name = name.replace(/^\.+/, "").trim();
  // Collapse interior whitespace and cap length (keep extension).
  name = name.replace(/\s+/g, " ");
  if (name.length > 255) {
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot) : "";
    name = `${name.slice(0, 255 - ext.length)}${ext}`;
  }
  return name === "" ? "upload" : name;
}

/** Lowercase extension without the leading dot ("" when absent). */
export function getExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Throw 413 when the declared upload size exceeds the 5 MiB cap. */
export function assertFileSize(size: number): void {
  if (!Number.isFinite(size) || size < 0) {
    throw new HttpError(400, "Upload size is invalid.");
  }
  if (size === 0) {
    throw new HttpError(422, "The uploaded file is empty. Add content and try again.");
  }
  if (size > MAX_FILE_BYTES) {
    throw new HttpError(
      413,
      `File is too large. Maximum upload size is ${MAX_FILE_BYTES} bytes (5 MiB).`,
    );
  }
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

export interface UploadInfo {
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Decide whether an upload is a PDF or a plain-text document.
 *
 * Filenames alone are not trusted: a `.pdf` upload must start with the
 * `%PDF-` magic signature, otherwise it is rejected as corrupt (422).
 * Returns the file kind or throws HttpError (415 unsupported / 422 corrupt).
 */
export function getFileKind(info: UploadInfo, bytes: Uint8Array): FileKind {
  const filename = sanitizeFilename(info.filename);
  const ext = getExtension(filename);
  const mime = (info.mimeType || "").split(";")[0].trim().toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new HttpError(
      415,
      `Unsupported file type ".${ext || "?"}". Upload a PDF, TXT, or MD file.`,
    );
  }
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new HttpError(
      415,
      `Unsupported media type "${mime}". Upload a PDF, TXT, or MD file.`,
    );
  }

  const magicPdf = hasPdfSignature(bytes);
  if (ext === "pdf") {
    if (!magicPdf) {
      throw new HttpError(
        422,
        "The file is named as a PDF but does not contain valid PDF data (%PDF- signature missing). Re-export the document and try again.",
      );
    }
    return "pdf";
  }
  // A .txt/.md upload that actually starts with %PDF- is a misnamed PDF.
  if (magicPdf) return "pdf";
  return "text";
}

/**
 * Decode UTF-8 bytes to text. Rejects invalid UTF-8 and binary-looking
 * content with an actionable 422 error.
 */
export function decodeTextBytes(bytes: Uint8Array, label = "document"): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(
      422,
      `The ${label} is not valid UTF-8 text. Save it as UTF-8 plain text and try again.`,
    );
  }
  if (text.includes("\u0000")) {
    throw new HttpError(
      422,
      `The ${label} does not appear to be plain text. Upload a TXT, MD, or text-based PDF file.`,
    );
  }
  return text;
}
