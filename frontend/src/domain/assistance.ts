import type {
  DocumentDiscrepancy,
  FieldSuggestion,
} from "./lifecycle-types";
import type { ExtractedField, Project, ProjectDocument } from "./types";

type SuggestField = FieldSuggestion["field"];

const FIELD_KEYS: Record<SuggestField, string[]> = {
  address: ["projectAddress", "address"],
  client: ["client", "clientName"],
  contractor: ["contractor", "contractorName"],
  name: ["projectName", "name"],
  description: ["description", "scope", "projectDescription"],
};

const READ_MIN = 2;
const READ_MAX = 500;

function pagesOf(doc: ProjectDocument): string[] {
  return doc.text.split("\f");
}

function validPage(doc: ProjectDocument, field: ExtractedField): boolean {
  if (field.page === undefined) return true;
  if (!Number.isInteger(field.page) || field.page < 1 || field.page > doc.pages) return false;
  const span = pagesOf(doc)[field.page - 1] ?? "";
  return span.includes(field.evidence);
}

function grounded(doc: ProjectDocument, field: ExtractedField): boolean {
  const value = field.value.trim();
  const quote = field.evidence.trim();
  if (value.length < READ_MIN || value.length > READ_MAX) return false;
  if (quote.length < READ_MIN || quote.length > READ_MAX) return false;
  if (field.method !== "explicit_label" && field.method !== "model") return false;
  if (!doc.text.includes(field.evidence)) return false;
  if (!field.evidence.includes(field.value)) return false;
  return validPage(doc, field);
}

function currentOf(project: Project, field: SuggestField): string {
  if (field === "address") return project.details.address;
  if (field === "description") return project.details.description;
  if (field === "client") return project.client;
  if (field === "contractor") return project.contractor;
  return project.name;
}

function canon(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function collect(project: Project, field: SuggestField) {
  const out: { doc: ProjectDocument; key: string; f: ExtractedField }[] = [];
  for (const doc of project.documents) {
    for (const key of FIELD_KEYS[field]) {
      const f = doc.fields[key];
      if (f && grounded(doc, f)) out.push({ doc, key, f });
    }
  }
  return out;
}

export function getFieldSuggestions(project: Project): FieldSuggestion[] {
  const out: FieldSuggestion[] = [];
  const seen = new Set<string>();
  const order: SuggestField[] = ["address", "client", "contractor", "name", "description"];
  for (const field of order) {
    const current = canon(currentOf(project, field));
    for (const { doc, f } of collect(project, field)) {
      const value = f.value.trim();
      // Only values that differ from current facts.
      if (canon(value) === current || canon(value) === "") continue;
      const dup = `${field}|${canon(value)}`;
      if (seen.has(dup)) continue;
      seen.add(dup);
      out.push({
        id: `${doc.id}|${field}|${canon(value).slice(0, 48)}`,
        field,
        value,
        documentId: doc.id,
        documentName: doc.name,
        quote: f.evidence,
        ...(f.page !== undefined ? { page: f.page } : {}),
        method: f.method,
      });
    }
  }
  return out;
}

function findSource(project: Project, s: FieldSuggestion) {
  const doc = project.documents.find((d) => d.id === s.documentId);
  if (!doc) throw new Error(`Unknown document "${s.documentId}". The suggestion is stale or injected.`);
  const keys = FIELD_KEYS[s.field];
  const match = keys
    .map((key) => ({ key, f: doc.fields[key] }))
    .find(({ f }) => f && f.value === s.value && f.evidence === s.quote && f.method === s.method);
  if (!match?.f) {
    throw new Error("The suggestion no longer matches the document fields. It is stale; re-run suggestions.");
  }
  if (!grounded(doc, match.f)) throw new Error("The suggestion source is no longer grounded. It is stale.");
  return doc;
}

function clone(project: Project): Project {
  return structuredClone(project);
}

export function applyFieldSuggestion(project: Project, suggestion: FieldSuggestion): Project {
  const doc = findSource(project, suggestion);
  const next = clone(project);
  const at = new Date().toISOString();
  let oldValue = "";
  if (suggestion.field === "address") {
    oldValue = next.details.address;
    next.details.address = suggestion.value;
  } else if (suggestion.field === "description") {
    oldValue = next.details.description;
    next.details.description = suggestion.value;
  } else if (suggestion.field === "client") {
    oldValue = next.client;
    next.client = suggestion.value;
  } else if (suggestion.field === "contractor") {
    oldValue = next.contractor;
    next.contractor = suggestion.value;
  } else {
    oldValue = next.name;
    next.name = suggestion.value;
  }
  next.updatedAt = at;
  next.activity = [
    ...next.activity,
    {
      id: crypto.randomUUID(),
      at,
      message:
        `Reviewed field update: ${suggestion.field} set from reviewed suggestion ` +
        `(document "${doc.name}", method ${suggestion.method}). ` +
        `Old value: "${oldValue}". New value: "${suggestion.value}". ` +
        `Quote: "${suggestion.quote}". Origin preserved; no regulatory metadata changed.`,
    },
  ];
  return next;
}

interface Valued {
  doc: ProjectDocument;
  value: string;
  quote: string;
  page?: number;
}

function valued(project: Project, field: SuggestField | "owner" | "applicant"): Valued[] {
  const out: Valued[] = [];
  for (const doc of project.documents) {
    for (const key of (field === "owner" || field === "applicant" ? [field] : FIELD_KEYS[field])) {
      const f = doc.fields[key];
      if (f && grounded(doc, f)) {
        out.push({ doc, value: f.value.trim(), quote: f.evidence.trim(), ...(f.page !== undefined ? { page: f.page } : {}) });
      }
    }
  }
  // Unique values per document+field (same doc scanned twice keeps one row).
  const seen = new Set<string>();
  return out.filter((v) => {
    const k = `${v.doc.id}|${field}|${canon(v.value)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function stripTrailingQualifier(value: string): string {
  return canon(value).replace(/\s*\((synthetic|fictional|draft|sample|example)\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function leadingNumber(value: string): string | null {
  const m = canon(value).match(/^(\d+[a-z]?)\b/);
  return m ? m[1]! : null;
}

function addressSeverity(values: Valued[]): DocumentDiscrepancy["severity"] | null {
  const distinct = new Map<string, Valued[]>();
  for (const v of values) {
    const k = stripTrailingQualifier(v.value);
    if (!distinct.has(k)) distinct.set(k, []);
    distinct.get(k)!.push(v);
  }
  if (distinct.size < 2) return null;
  const keys = [...distinct.keys()];
  // Partial address / ownership variants: one normalized value contains the other.
  const partial = keys.some((a, i) => keys.some((b, j) => i !== j && (a.startsWith(b + " ") || b.startsWith(a + " "))));
  if (partial) {
    // Different street numbers on otherwise complete addresses still conflict.
    const numbers = new Set(keys.map((k) => leadingNumber(k)));
    if (numbers.size > 1 && [...numbers].every((n) => n !== null)) return "conflicting";
    return "needs_review";
  }
  // Distinct values; differing leading street numbers on complete addresses conflict.
  const numbers = new Set(keys.map((k) => leadingNumber(k)));
  if (numbers.size > 1 && [...numbers].every((n) => n !== null)) return "conflicting";
  return "needs_review";
}

function genericSeverity(values: Valued[]): DocumentDiscrepancy["severity"] | null {
  const distinct = new Set(values.map((v) => stripTrailingQualifier(v.value)));
  if (distinct.size < 2) return null;
  return "needs_review";
}

function discrepancy(
  id: string,
  field: string,
  title: string,
  severity: DocumentDiscrepancy["severity"],
  values: Valued[],
  nextAction: string,
): DocumentDiscrepancy {
  // Keep one row per document; cap evidence for readability.
  const byDoc = new Map<string, Valued>();
  for (const v of values) if (!byDoc.has(v.doc.id)) byDoc.set(v.doc.id, v);
  return {
    id,
    field,
    title,
    severity,
    evidence: [...byDoc.values()].slice(0, 8).map((v) => ({
      documentId: v.doc.id,
      documentName: v.doc.name,
      value: v.value,
      quote: v.quote,
      ...(v.page !== undefined ? { page: v.page } : {}),
    })),
    nextAction,
  };
}

export function detectDocumentDiscrepancies(project: Project): DocumentDiscrepancy[] {
  const out: DocumentDiscrepancy[] = [];
  const addr = valued(project, "address");
  const addrSev = addressSeverity(addr);
  if (addrSev) {
    out.push(
      discrepancy(
        "address",
        "address",
        "Project address differs between documents",
        addrSev,
        addr,
        addrSev === "conflicting"
          ? "Confirm the correct street address and replace or correct the conflicting document."
          : "Confirm both addresses refer to the same property; one may be partial or carry a locality qualifier.",
      ),
    );
  }
  // Same-field, same-role comparisons only. Contractor values are never
  // compared against client values (different roles, not a conflict).
  const client = valued(project, "client");
  if (genericSeverity(client)) {
    out.push(
      discrepancy(
        "client",
        "client",
        "Client differs between documents",
        "needs_review",
        client,
        "Confirm the correct client and record which document carries the authoritative label.",
      ),
    );
  }
  for (const role of ["owner", "applicant"] as const) {
    const values = valued(project, role);
    if (genericSeverity(values)) out.push(discrepancy(
      role, role, `${role === "owner" ? "Property owner" : "Applicant"} differs between documents`,
      "needs_review", values, `Confirm the correct ${role} using authoritative records. Client, owner and applicant are separate roles.`,
    ));
  }
  const contractor = valued(project, "contractor");
  if (genericSeverity(contractor)) {
    out.push(
      discrepancy(
        "contractor",
        "contractor",
        "Contractor differs between documents",
        "needs_review",
        contractor,
        "Confirm the correct contractor and record which document carries the authoritative label.",
      ),
    );
  }
  const name = valued(project, "name");
  if (genericSeverity(name)) {
    out.push(
      discrepancy(
        "name",
        "name",
        "Project name differs between documents",
        "needs_review",
        name,
        "Confirm the canonical project name; differing labels alone are not a compliance finding.",
      ),
    );
  }
  // Description differences alone are semantic text differences, not
  // necessarily contradictions.
  const desc = valued(project, "description");
  if (genericSeverity(desc)) {
    out.push(
      discrepancy(
        "description",
        "description",
        "Project description differs between documents",
        "needs_review",
        desc,
        "Compare the quoted scopes manually; different wording alone is not a contradiction.",
      ),
    );
  }
  return out;
}

const HRM_SOURCE_URL = "https://www.halifax.ca/media/72812";

function ascii(value: string): string {
  return value
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

export function buildApplicationWorksheet(project: Project): string {
  const lines: string[] = [];
  const j = project.jurisdiction;
  const isHrmCommercial =
    j?.province === "NS" && j.municipality === "hrm" && j.workflow === "commercial-renovation";
  const discrepancies = detectDocumentDiscrepancies(project);
  const reviewedNotes = project.activity.filter((a) => /reviewed field update/i.test(a.message));

  lines.push("INTERNAL WORKSHEET - NOT OFFICIAL FORM - not submitted");
  lines.push("This is a reviewed autofill preparation worksheet for internal use only.");
  lines.push("");
  lines.push(`Project: ${project.name}`);
  lines.push(`Client: ${project.client}`);
  lines.push(`Contractor: ${project.contractor}`);
  lines.push(`Address: ${project.details.address}`);
  lines.push(`Scope: ${project.details.description}`);
  lines.push(
    `Facts: area=${project.details.proposedArea ?? "unknown"} storeys=${project.details.storeys ?? "unknown"} ` +
      `externalWalls=${project.details.externalWalls ?? "unknown"} onHrmRoad=${project.details.onHrmRoad ?? "unknown"} ` +
      `rightOfWayWork=${project.details.rightOfWayWork ?? "unknown"} heritage=${project.details.heritageProperty ?? "unknown"} ` +
      `energy=${project.details.energyDocument ?? "unknown"}`,
  );
  lines.push("");
  lines.push(`Jurisdiction: ${j ? `${j.province} / ${j.municipalityName} (${j.municipality})` : "not recorded"}`);
  lines.push(`Permit metadata: status=${project.permit?.status ?? "not recorded"} reference=${project.permit?.reference ?? "none"}`);
  if (isHrmCommercial) {
    lines.push(`Official source: ${HRM_SOURCE_URL} (Halifax commercial renovation table; verify before relying).`);
  } else {
    lines.push("Official source: no verified pack for this jurisdiction; use manual review and municipal sources.");
  }
  lines.push("");
  lines.push("Document inventory:");
  if (!project.documents.length) lines.push("- none");
  for (const d of project.documents) lines.push(`- ${d.name} | ${d.documentType} | ${d.pages} page(s) | ${d.method}`);
  lines.push("");
  lines.push("Unresolved discrepancies:");
  if (!discrepancies.length) lines.push("- none recorded; confirm manually before any handoff.");
  for (const d of discrepancies) {
    lines.push(`- [${d.severity}] ${d.title}: ${d.nextAction}`);
    for (const e of d.evidence) lines.push(`  * ${e.documentName}: "${e.value}" (quote: "${e.quote}")`);
  }
  lines.push("");
  lines.push("Reviewed proposal notes:");
  if (!reviewedNotes.length) lines.push("- no reviewed field updates recorded yet.");
  for (const n of reviewedNotes) lines.push(`- ${n.at}: ${n.message}`);
  lines.push("");
  lines.push("Limitations: data-quality findings only, not municipal requirements. Confirm all facts with a qualified reviewer.");
  lines.push("Source citation: document quotes above; official forms come from the verified catalog only.");
  return ascii(lines.join("\n")) + "\n";
}
