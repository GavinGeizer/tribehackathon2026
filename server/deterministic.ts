/**
 * Deterministic document analysis (rule-based heuristics only).
 *
 * IMPORTANT: these heuristics never claim AI involvement. Results produced
 * here use `method: "deterministic"` downstream.
 */
import type { DocumentType, ExtractedField } from "../frontend/src/domain/types";
import { MAX_TEXT_CHARS } from "./validation";

export interface DeterministicResult {
  documentType: DocumentType;
  fields: Record<string, ExtractedField>;
  uncertainties: string[];
  warnings: string[];
}

const PROFESSIONAL_DISCIPLINES: Array<{
  type: DocumentType;
  terms: string[];
  label: string;
}> = [
  { type: "professional_architectural", terms: ["architectural"], label: "architectural" },
  { type: "professional_structural", terms: ["structural"], label: "structural" },
  { type: "professional_electrical", terms: ["electrical"], label: "electrical" },
  { type: "professional_mechanical", terms: ["mechanical", "hvac"], label: "mechanical" },
  { type: "professional_plumbing", terms: ["plumbing"], label: "plumbing" },
  { type: "professional_fire", terms: ["fire protection", "fire suppression", "fire alarm", "sprinkler"], label: "fire protection" },
  { type: "professional_geotechnical", terms: ["geotechnical", "soils report", "soil report"], label: "geotechnical" },
];

const TYPE_SIGNALS: Array<{ type: string; terms: string[]; weight: number }> = [
  { type: "construction_plan", terms: ["floor plan", "site plan", "construction plan", "demolition plan", "reflected ceiling", "building section", "scale 1:"], weight: 3 },
  { type: "elevations", terms: ["elevation", "facade", "exterior elevation", "north elevation", "south elevation", "east elevation", "west elevation"], weight: 3 },
  { type: "energy_letter", terms: ["energy", "necb", "energy code", "energy efficiency", "energy model"], weight: 3 },
  { type: "energy_checklist", terms: ["energy checklist", "hrm energy checklist", "halifax energy checklist", "energy compliance checklist"], weight: 4 },
  { type: "heritage_photos", terms: ["heritage", "heritage photo", "heritage photograph", "heritage property photo", "character-defining"], weight: 4 },
  { type: "highway_approval", terms: ["highway", "right-of-way", "right of way", "encroachment", "hrm road", "street opening"], weight: 3 },
  { type: "existing_conditions", terms: ["existing conditions", "as-built", "as built", "current conditions", "site photos", "photograph"], weight: 2 },
  { type: "project_description", terms: ["project description", "scope of work", "scope of renovation", "proposed work", "renovation narrative"], weight: 2 },
  { type: "professional_architectural", terms: ["architect", "sealed drawing", "professional seal", "architectural drawings"], weight: 2 },
  { type: "professional_structural", terms: ["structural engineer", "structural drawing", "load calculation", "beam schedule"], weight: 2 },
  { type: "professional_electrical", terms: ["electrical engineer", "panel schedule", "lighting plan", "single-line diagram"], weight: 2 },
  { type: "professional_mechanical", terms: ["mechanical engineer", "hvac schedule", "duct layout"], weight: 2 },
  { type: "professional_plumbing", terms: ["plumbing engineer", "plumbing isometric", "fixture schedule"], weight: 2 },
  { type: "professional_fire", terms: ["fire protection engineer", "fire alarm", "sprinkler layout"], weight: 2 },
  { type: "professional_geotechnical", terms: ["geotechnical engineer", "bearing capacity", "borehole"], weight: 2 },
];

const SEAL_TERMS = [
  "professional seal",
  "sealed",
  "professional stamp",
  "licensed professional",
  "p.eng",
  "peng",
  "seal number",
  "certificate of practice",
];

const SEAL_WORDS = ["seal", "stamp"];

function containsWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`).test(haystack);
}

const LETTER_TERMS = [
  "dear ",
  "sincerely",
  "regards,",
  "letter of",
  "to whom it may concern",
];

const FILENAME_HINTS: Array<{ type: string; terms: string[] }> = [
  { type: "construction_plan", terms: ["plan", "floorplan", "floor-plan", "siteplan", "site-plan", "drawing"] },
  { type: "elevations", terms: ["elevation", "elevations", "facade"] },
  { type: "energy_letter", terms: ["energy", "necb"] },
  { type: "energy_checklist", terms: ["checklist", "hrm-checklist", "energy-checklist"] },
  { type: "heritage_photos", terms: ["heritage"] },
  { type: "highway_approval", terms: ["highway", "row", "encroach"] },
  { type: "existing_conditions", terms: ["existing", "asbuilt", "as-built", "photos"] },
  { type: "project_description", terms: ["description", "narrative", "scope", "proposal"] },
  { type: "professional_architectural", terms: ["architect"] },
  { type: "professional_structural", terms: ["struct"] },
  { type: "professional_electrical", terms: ["elect"] },
  { type: "professional_mechanical", terms: ["mech", "hvac"] },
  { type: "professional_plumbing", terms: ["plumb"] },
  { type: "professional_fire", terms: ["fire"] },
  { type: "professional_geotechnical", terms: ["geotech", "soil"] },
];

function countHits(haystack: string, terms: string[]): number {
  let hits = 0;
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(term, from);
      if (idx < 0) break;
      hits += 1;
      from = idx + term.length;
    }
  }
  return hits;
}

export interface ClassifiedDocument {
  documentType: DocumentType;
  tentative: boolean;
  reasons: string[];
}

/**
 * Rule-based classification from filename + descriptive content terms.
 * Scores content signals first; filename hints break ties or classify
 * near-empty documents. Returns "other" with tentative=true when nothing
 * matches, and flags letter-vs-sealed-design ambiguity explicitly.
 */
export function classifyDocument(filename: string, text: string): ClassifiedDocument {
  const lowered = text.toLowerCase();
  const nameLower = filename.toLowerCase();
  // String-keyed so unknown/future shared-contract types stay grounded:
  // only members of the known set below can win; anything else falls back
  // to "other" downstream.
  const scores = new Map<string, number>();
  const reasons: string[] = [];

  for (const signal of TYPE_SIGNALS) {
    const hits = countHits(lowered, signal.terms);
    if (hits > 0) {
      scores.set(signal.type, (scores.get(signal.type) ?? 0) + hits * signal.weight);
      reasons.push(`content matched ${hits} descriptive term(s) for ${signal.type}`);
    }
  }

  const filenameMatches: string[] = [];
  for (const hint of FILENAME_HINTS) {
    if (hint.terms.some((t) => nameLower.includes(t))) filenameMatches.push(hint.type);
  }
  for (const match of filenameMatches) {
    scores.set(match, (scores.get(match) ?? 0) + 1);
  }
  if (filenameMatches.length > 0) {
    reasons.push(`filename suggests ${filenameMatches.join(", ")}`);
  }

  // Ground the winner to the known shared-contract set; unknown types can
  // never be emitted even if a future signal table mentions them.
  const KNOWN_TYPES: ReadonlySet<string> = new Set([
    "construction_plan",
    "elevations",
    "professional_architectural",
    "professional_electrical",
    "professional_mechanical",
    "professional_structural",
    "professional_plumbing",
    "professional_fire",
    "professional_geotechnical",
    "energy_letter",
    "energy_checklist",
    "heritage_photos",
    "highway_approval",
    "existing_conditions",
    "project_description",
    "other",
  ]);
  let best: DocumentType = "other";
  let bestScore = 0;
  let runnerUp = 0;
  for (const [type, score] of scores) {
    if (!KNOWN_TYPES.has(type)) continue;
    if (score > bestScore) {
      runnerUp = bestScore;
      best = type as DocumentType;
      bestScore = score;
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }

  const isLetterLike = LETTER_TERMS.some((t) => lowered.includes(t));
  const hasSeal =
    SEAL_TERMS.some((t) => lowered.includes(t)) || SEAL_WORDS.some((w) => containsWord(lowered, w));
  const isProfessional = best.startsWith("professional_");

  const reasonsOut = reasons.slice(0, 8);
  if (bestScore === 0) {
    return {
      documentType: "other",
      tentative: true,
      reasons: [...reasonsOut, "no descriptive terms matched; classification is tentative"],
    };
  }

  // A letter-like document without seal language must not be presented as
  // signed professional design work.
  if (isLetterLike && isProfessional && !hasSeal) {
    return {
      documentType: best,
      tentative: true,
      reasons: [
        ...reasonsOut,
        "letter-like wording without professional seal language: distinguish a letter from signed professional design",
      ],
    };
  }

  // Close scores or filename/content disagreement stay tentative.
  const filenameTop = filenameMatches[0];
  const tentative = bestScore - runnerUp < 2 || (filenameTop !== undefined && filenameTop !== best);
  if (tentative && !reasonsOut.some((r) => r.startsWith("close or conflicting"))) {
    reasonsOut.push("close or conflicting signals: classification is tentative");
  }
  return { documentType: best, tentative, reasons: reasonsOut };
}

/** A single explicit "Label: value" occurrence with its source line. */
interface LabeledValue {
  value: string;
  evidence: string;
}

/**
 * Find explicit labeled lines such as "Project Address: 123 Main St".
 * Matching is case-insensitive, supports ":" / "-" / "=" separators, and
 * returns the source line verbatim as evidence (truncated to 280 chars).
 */
function findLabeledValues(lines: string[], labels: string[]): LabeledValue[] {
  const out: LabeledValue[] = [];
  const pattern = new RegExp(
    `^\\s*(?:project\\s+)?(${labels.join("|")})\\s*[:\\-=]\\s*(.+?)\\s*$`,
    "i",
  );
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const match = pattern.exec(trimmed);
    if (match?.[2]) {
      const value = match[2].trim().replace(/\s+/g, " ");
      if (value !== "" && value.length <= 500) {
        out.push({
          value,
          evidence: trimmed.length > 280 ? trimmed.slice(0, 280) : trimmed,
        });
      }
    }
  }
  return out;
}

export interface PageSpan {
  text: string;
  page: number;
}

/**
 * Split merged text into per-page spans. Page boundaries use the
 * form-feed character ("\f") emitted by the PDF extractor; plain-text
 * documents are a single span (page 1). Offsets let field evidence cite
 * the page where the labeled line was found.
 */
export function splitPages(fullText: string): PageSpan[] {
  const parts = fullText.split("\f");
  if (parts.length === 1) return [{ text: fullText, page: 1 }];
  return parts.map((text, i) => ({ text, page: i + 1 }));
}

/** Locate the 1-based page containing the first occurrence of `needle`. */
export function findEvidencePage(spans: PageSpan[], needle: string): number | undefined {
  const idx = spans.findIndex((s) => s.text.includes(needle));
  return idx >= 0 ? spans[idx].page : undefined;
}

const FIELD_LABELS: Record<string, string[]> = {
  projectAddress: ["project address", "site address", "property address", "address", "location", "project location"],
  projectDescription: ["project description", "description", "scope of work", "scope", "proposed work", "work description"],
  proposedArea: ["proposed area", "floor area", "gross floor area", "renovation area", "area", "total area"],
  storeys: ["storeys", "stories", "storey", "story", "number of storeys", "floors"],
  contractor: ["contractor", "general contractor", "builder"],
  client: ["client", "owner", "applicant"],
};

/**
 * Extract explicitly labeled fields only ("Label: value" lines). Values
 * that cannot be traced to a labeled line are never invented. Returns
 * `method: "explicit_label"` entries plus address-presence warnings.
 */
export function extractExplicitFields(
  fullText: string,
  projectAddress: string | null,
): { fields: Record<string, ExtractedField>; warnings: string[] } {
  const fields: Record<string, ExtractedField> = {};
  const warnings: string[] = [];
  const spans = splitPages(fullText);
  const lines = fullText.split(/\r?\n/);

  for (const [key, labels] of Object.entries(FIELD_LABELS)) {
    const hits = findLabeledValues(lines, labels);
    if (hits.length === 0) continue;
    const first = hits[0];
    const field: ExtractedField = {
      value: first.value,
      evidence: first.evidence,
      method: "explicit_label",
    };
    const page = findEvidencePage(spans, first.evidence);
    if (page !== undefined && spans.length > 1) field.page = page;
    fields[key] = field;
    if (hits.length > 1) {
      warnings.push(
        `Multiple labeled values found for "${key}"; the first occurrence was used and the rest ignored.`,
      );
    }
  }

  const addressField = fields["projectAddress"];
  if (addressField && projectAddress) {
    const docAddr = addressField.value.toLowerCase();
    const projAddr = projectAddress.toLowerCase();
    // Flag only clear mismatches: neither side contains the other.
    if (!docAddr.includes(projAddr) && !projAddr.includes(docAddr)) {
      warnings.push(
        "The document address does not match the project address. Verify the correct property documents were uploaded.",
      );
    }
  } else if (!addressField) {
    warnings.push(
      "No explicit project/site address label was found in the document. Address evidence is missing.",
    );
  }

  return { fields, warnings };
}

/**
 * Full deterministic pipeline: length guard, classification, explicit-label
 * extraction, and uncertainty/warning assembly. Never claims AI use.
 */
export function analyzeDeterministic(
  filename: string,
  text: string,
  projectAddress: string | null,
): DeterministicResult {
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`Extracted text exceeds ${MAX_TEXT_CHARS} characters.`);
  }
  const classification = classifyDocument(filename, text);
  const { fields, warnings } = extractExplicitFields(text, projectAddress);

  const uncertainties: string[] = [];
  if (classification.tentative) {
    uncertainties.push(
      `Document classification "${classification.documentType}" is tentative (rule-based heuristics only): ${classification.reasons.join("; ")}.`,
    );
  }
  if (Object.keys(fields).length === 0) {
    uncertainties.push(
      "No explicitly labeled fields were found; values were not inferred from unlabeled text.",
    );
  }

  return {
    documentType: classification.documentType,
    fields,
    uncertainties,
    warnings,
  };
}
