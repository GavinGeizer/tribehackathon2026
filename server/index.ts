/**
 * Cloudflare Worker entry: `export default { fetch(request, env, ctx) }`.
 *
 * - `GET /api/health` → `{ status: "ok", mode, maxFileBytes }` (exact shape).
 * - `POST /api/analyze` → multipart `file` + `project` (ProjectDetails JSON)
 *   returns DocumentAnalysis. No persisted uploads; same-origin CORS only.
 *
 * Env (all optional): MODEL_API_KEY, MODEL_BASE_URL, MODEL_NAME plus an
 * `ASSETS` binding for non-API pass-through (configured by the lead's
 * Cloudflare setup).
 */
import type { DocumentAnalysis, ProjectDetails } from "../frontend/src/domain/types";
import { analyzeDocument, getMode, type ModelEnv } from "./ai";
import { analyzeDeterministic } from "./deterministic";
import { extractPdfText, extractPlainText } from "./extract";
import {
  assertFileSize,
  decodeTextBytes,
  getFileKind,
  HttpError,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  sanitizeFilename,
} from "./validation";

export interface WorkerEnv extends ModelEnv {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin navigations / curl / tests
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return requestUrl.origin === originUrl.origin;
  } catch {
    return false;
  }
}

/**
 * Normalize uploader-supplied project JSON. Requires at least an address;
 * missing optional fields become null. Throws HttpError 400 on malformed
 * input (never throws on absent optional fields).
 */
export function normalizeProject(raw: unknown): ProjectDetails {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new HttpError(400, "The project field must be a JSON object. Include at least an address.");
  }
  const obj = raw as Record<string, unknown>;
  const addressRaw = obj["address"];
  if (typeof addressRaw !== "string" || addressRaw.trim() === "") {
    throw new HttpError(400, "A project address is required. Add the site address and try again.");
  }

  const descriptionRaw = obj["description"];
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

  return {
    address: addressRaw.trim().slice(0, 500),
    description: typeof descriptionRaw === "string" ? descriptionRaw.slice(0, 5000) : "",
    proposedArea: numOrNull(obj["proposedArea"]),
    storeys: numOrNull(obj["storeys"]),
    externalWalls: boolOrNull(obj["externalWalls"]),
    onHrmRoad: boolOrNull(obj["onHrmRoad"]),
    rightOfWayWork: boolOrNull(obj["rightOfWayWork"]),
    heritageProperty: boolOrNull(obj["heritageProperty"]),
    energyDocument: obj["energyDocument"] === "hrm_checklist" || obj["energyDocument"] === "other" ? obj["energyDocument"] : null,
  };
}

async function handleHealth(env: WorkerEnv): Promise<Response> {
  return jsonResponse({
    status: "ok",
    mode: getMode(env),
    maxFileBytes: MAX_FILE_BYTES,
  });
}

async function handleAnalyze(request: Request, env: WorkerEnv): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "The request must be multipart form data with a file and project field.");
  }

  const fileValue = form.get("file");
  const projectValue = form.get("project");

  if (!(fileValue instanceof File)) {
    return errorResponse(400, "A file upload is required. Attach a PDF, TXT, or MD file.");
  }
  if (typeof projectValue !== "string" || projectValue.trim() === "") {
    return errorResponse(400, "A project JSON field is required. Include at least an address.");
  }

  let project: ProjectDetails;
  try {
    project = normalizeProject(JSON.parse(projectValue));
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    return errorResponse(400, "The project field is not valid JSON. Include at least an address.");
  }

  const filename = sanitizeFilename(fileValue.name || "upload");
  const mimeType = fileValue.type || "";
  const size = fileValue.size;

  try {
    assertFileSize(size);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    return errorResponse(400, "The upload could not be validated.");
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await fileValue.arrayBuffer());
  } catch {
    return errorResponse(400, "The uploaded file could not be read. Try uploading it again.");
  }
  if (bytes.byteLength !== size && size > 0) {
    // Use actual bytes when the declared size disagrees; re-check the cap.
    try {
      assertFileSize(bytes.byteLength);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message);
      return errorResponse(400, "The upload could not be validated.");
    }
  }

  let kind: "pdf" | "text";
  try {
    kind = getFileKind({ filename, mimeType, size: bytes.byteLength }, bytes);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    return errorResponse(415, "Unsupported file type. Upload a PDF, TXT, or MD file.");
  }

  let text: string;
  let pages: number;
  try {
    if (kind === "pdf") {
      const extracted = await extractPdfText(bytes);
      text = extracted.text;
      pages = extracted.pages;
    } else {
      const decoded = decodeTextBytes(bytes);
      const plain = extractPlainText(decoded);
      text = plain.text;
      pages = plain.pages;
    }
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    return errorResponse(422, "The document could not be processed. Try a text-based PDF or TXT/MD file.");
  }

  // Preserve the original extracted text verbatim in the response.
  let deterministic: ReturnType<typeof analyzeDeterministic>;
  try {
    deterministic = analyzeDeterministic(filename, text, project.address);
  } catch {
    return errorResponse(422, `Extracted text exceeds the ${MAX_TEXT_CHARS}-character limit. Split the document and try again.`);
  }

  let model: Awaited<ReturnType<typeof analyzeDocument>>;
  try {
    model = await analyzeDocument({
      filename,
      text,
      pages,
      project,
      deterministic,
      env,
    });
  } catch {
    // analyzeDocument never throws for model failures, but stay safe: fall
    // back to deterministic with a clear warning.
    model = {
      documentType: deterministic.documentType,
      fields: deterministic.fields,
      method: "deterministic",
      warnings: ["The model request failed unexpectedly; used deterministic analysis instead."],
    };
  }

  const uncertainties = [...deterministic.uncertainties];
  if (model.method === "model") {
    uncertainties.push("Model-assisted classification was used; professional evidence always requires human verification.");
  }

  const analysis: DocumentAnalysis = {
    documentType: model.documentType,
    text,
    pages,
    fields: model.fields,
    method: model.method,
    uncertainties,
    warnings: [...deterministic.warnings, ...model.warnings],
  };
  return jsonResponse(analysis, 200);
}

async function handleFetch(request: Request, env: WorkerEnv): Promise<Response> {
  if (!isSameOrigin(request)) {
    return errorResponse(403, "Cross-origin requests are not allowed. Use the same origin.");
  }
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return handleHealth(env);
  }
  if (request.method === "POST" && url.pathname === "/api/analyze") {
    return handleAnalyze(request, env);
  }
  if (url.pathname.startsWith("/api/")) {
    return errorResponse(404, "Unknown API route.");
  }
  // Non-API traffic passes through to the lead-configured ASSETS binding.
  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  return errorResponse(404, "Not found.");
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    try {
      return await handleFetch(request, env);
    } catch {
      // Sanitized: never leak upstream keys/bodies or stack traces.
      return errorResponse(500, "The document service encountered an error. Try again.");
    }
  },
};

export default worker;
