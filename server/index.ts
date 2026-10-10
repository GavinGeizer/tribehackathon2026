/**
 * Cloudflare Worker entry: `export default { fetch(request, env, ctx) }`.
 *
 * - `GET /api/health` → `{ status: "ok", mode, maxFileBytes }` (exact shape).
 * - `POST /api/analyze` → multipart `file` + `project` (ProjectDetails JSON)
 *   returns DocumentAnalysis. No persisted uploads; same-origin CORS only.
 *
 * Env (all optional): MODEL_API_KEY, MODEL_BASE_URL, MODEL_NAME for the
 * OpenAI-compatible provider; AI (Workers AI binding) + WORKERS_AI_MODEL for
 * low-cost binding inference; ASSETS binding for non-API pass-through
 * (lead's Cloudflare setup). Model mode is exposed only when a provider is
 * actually configured.
 */
import { z } from "zod";
import { suggestFormFields } from "./form-assistance";
import type { DocumentAnalysis, ProjectDetails } from "../frontend/src/domain/types";
import { analyzeDocument, getMode, type ModelEnv } from "./ai";
import { analyzeDeterministic } from "./deterministic";
import { extractPdfText, extractPlainText } from "./extract";
import {
  assertFileSize,
  decodeTextBytes,
  getFileKind,
  HttpError,
  MAX_BODY_BYTES,
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

/**
 * Read the request body through a bounded stream: bytes are counted as they
 * arrive and reading aborts as soon as the cap is exceeded, so at most
 * `maxBytes + one chunk` is ever buffered. Throws HttpError 413 on excess.
 * Works whether or not Content-Length is present (a declared length above
 * the cap is rejected without reading the body at all).
 */
export async function withBoundedBody(request: Request, maxBytes: number): Promise<Request> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new HttpError(
        413,
        `Request body is too large. Maximum request size is ${maxBytes} bytes (~6 MiB).`,
      );
    }
  }
  if (request.body === null) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new HttpError(
          413,
          `Request body is too large. Maximum request size is ${maxBytes} bytes (~6 MiB).`,
        );
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  const headers = new Headers(request.headers);
  headers.set("content-length", String(total));
  return new Request(request.url, {
    method: request.method,
    headers,
    body: body as BodyInit,
  });
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
  const energyDocumentRaw = obj["energyDocument"];
  const energyDocument =
    energyDocumentRaw === "hrm_checklist" || energyDocumentRaw === "other" ? energyDocumentRaw : null;

  return {
    address: addressRaw.trim().slice(0, 500),
    description: typeof descriptionRaw === "string" ? descriptionRaw.slice(0, 5000) : "",
    proposedArea: numOrNull(obj["proposedArea"]),
    storeys: numOrNull(obj["storeys"]),
    externalWalls: boolOrNull(obj["externalWalls"]),
    onHrmRoad: boolOrNull(obj["onHrmRoad"]),
    rightOfWayWork: boolOrNull(obj["rightOfWayWork"]),
    heritageProperty: boolOrNull(obj["heritageProperty"]),
    energyDocument,
  } as ProjectDetails;
}

async function handleHealth(env: WorkerEnv): Promise<Response> {
  return jsonResponse({
    status: "ok",
    mode: getMode(env),
    maxFileBytes: MAX_FILE_BYTES,
  });
}

async function handleAnalyze(request: Request, env: WorkerEnv): Promise<Response> {
  // Fix 1: enforce a total body cap (~6 MiB) by reading the bounded request
  // stream BEFORE multipart parsing, so unbounded buffers are never built.
  // Rejects with 413 even when Content-Length is absent or lies.
  let bounded: Request;
  try {
    bounded = await withBoundedBody(request, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    return errorResponse(413, "Request body is too large. Keep uploads within the 5 MiB file limit.");
  }

  let form: FormData;
  try {
    form = await bounded.formData();
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
      uncertainties: [],
    };
  }

  const uncertainties = [...deterministic.uncertainties, ...model.uncertainties];
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


const formAssistanceInput = z.object({
 fields:z.array(z.object({name:z.string().min(1).max(500),label:z.string().min(1).max(500),type:z.enum(['text','checkbox','dropdown','radio']),options:z.array(z.string().max(300)).max(100)}).strict()).max(100),
 facts:z.array(z.object({id:z.string().min(1).max(700),label:z.string().min(1).max(500),value:z.string().min(1).max(10000),quote:z.string().min(1).max(12000),source:z.string().min(1).max(1500)}).strict()).max(50),
}).strict().superRefine((data,ctx)=>{
 if(new Set(data.fields.map(f=>f.name)).size!==data.fields.length)ctx.addIssue({code:'custom',message:'Field names must be unique.'});
 if(new Set(data.facts.map(f=>f.id)).size!==data.facts.length)ctx.addIssue({code:'custom',message:'Source facts must be unique.'});
 if(data.facts.some(f=>!f.quote.includes(f.value)))ctx.addIssue({code:'custom',message:'Each fact value must appear in its source quote.'});
});
async function handleFormAssistance(request:Request,env:WorkerEnv):Promise<Response>{
 if(!request.headers.get('content-type')?.includes('application/json'))return errorResponse(415,'Send form fields and source facts as JSON.');
 let input:unknown;
 try{const bounded=await withBoundedBody(request,250000);input=await bounded.json();}catch(err){return errorResponse(err instanceof HttpError?err.status:400,'Form assistance input is invalid or exceeds the 250 kB limit.');}
 const parsed=formAssistanceInput.safeParse(input);
 if(!parsed.success)return errorResponse(400,'Provide up to 100 unique official fields and 50 quoted source facts. Every fact value must appear in its evidence quote.');
 if(!parsed.data.fields.length||!parsed.data.facts.length)return jsonResponse({method:'deterministic',suggestions:[],warnings:['No empty fields or reusable facts were provided.']});
 const result=await suggestFormFields({...parsed.data,env});
 return jsonResponse(result);
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
  if (request.method === "POST" && url.pathname === "/api/forms/assist") {
    return handleFormAssistance(request, env);
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
