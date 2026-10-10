import { describe, expect, test } from "bun:test";
import {
  applyFieldSuggestion,
  buildApplicationWorksheet,
  detectDocumentDiscrepancies,
  getFieldSuggestions,
} from "../../frontend/src/domain/assistance";
import type { FieldSuggestion, Project, ProjectDocument } from "../../frontend/src/domain/lifecycle-types";
import type { Project as DomainProject } from "../../frontend/src/domain/types";

function doc(
  id: string,
  fields: ProjectDocument["fields"],
  text: string,
  pages = 1,
): ProjectDocument {
  return {
    id,
    name: `${id}.txt`,
    size: text.length,
    uploadedAt: "2026-10-10T10:00:00.000Z",
    documentType: "project_description",
    text,
    pages,
    fields: fields as unknown as ProjectDocument["fields"],
    method: "deterministic",
    uncertainties: [],
    warnings: [],
  } as unknown as ProjectDocument;
}

function project(docs: ProjectDocument[], facts?: Partial<DomainProject>): DomainProject {
  return {
    id: "p1",
    name: "Juniper Studio storefront renovation",
    contractor: "Seabright Works",
    client: "Juniper Studio",
    details: {
      address: "120 Example Lane, Halifax, NS",
      description: "Storefront window replacement.",
      proposedArea: 450,
      storeys: 2,
      externalWalls: true,
      onHrmRoad: null,
      rightOfWayWork: true,
      heritageProperty: null,
      energyDocument: null,
    },
    documents: docs as unknown as DomainProject["documents"],
    acknowledgements: [],
    activity: [{ id: "a0", at: "2026-10-10T10:00:00.000Z", message: "Project created." }],
    createdAt: "2026-10-10T10:00:00.000Z",
    updatedAt: "2026-10-10T10:00:00.000Z",
    synthetic: true,
    ...facts,
  };
}

// Real input-dependent fields: values appear verbatim in doc text with a verbatim quote.
function realDocs(): ProjectDocument[] {
  return [
    doc(
      "d1",
      {
        projectAddress: {
          value: "122 Example Lane, Halifax, NS",
          evidence: "Project Address: 122 Example Lane, Halifax, NS",
          page: 1,
          method: "explicit_label",
        },
      },
      "Project Address: 122 Example Lane, Halifax, NS\nScope of work noted.",
    ),
    doc(
      "d2",
      {
        projectAddress: {
          value: "120 Example Lane, Halifax, NS",
          evidence: "Project Address: 120 Example Lane, Halifax, NS",
          page: 1,
          method: "explicit_label",
        },
        owner: {
          value: "Harbour Light Co.",
          evidence: "Owner: Harbour Light Co.",
          page: 1,
          method: "explicit_label",
        },
      },
      "Project Address: 120 Example Lane, Halifax, NS\nOwner: Harbour Light Co.",
    ),
    doc(
      "d3",
      {
        contractor: {
          value: "Seabright Works",
          evidence: "Contractor: Seabright Works",
          page: 1,
          method: "model",
        },
      },
      "Contractor: Seabright Works\nWork described below.",
    ),
  ];
}

describe("getFieldSuggestions", () => {
  test("suggests only grounded values that differ from current facts", () => {
    const p = project(realDocs());
    const out = getFieldSuggestions(p);
    const addr = out.find((s) => s.field === "address");
    expect(addr?.value).toBe("122 Example Lane, Halifax, NS");
    expect(addr?.method).toBe("explicit_label");
    expect(addr?.quote).toBe("Project Address: 122 Example Lane, Halifax, NS");
    // contractor matches current facts -> no suggestion
    expect(out.some((s) => s.field === "contractor")).toBe(false);
    // client differs -> suggested from the owner field
    const client = out.find((s) => s.field === "client");
    expect(client?.value).toBe("Harbour Light Co.");
    // no confidence percentages anywhere
    expect(JSON.stringify(out)).not.toMatch(/confidence|percent|%|score/i);
  });

  test("rejects ungrounded, stale, or mis-paged fields", () => {
    const bad = doc(
      "bad",
      {
        projectAddress: {
          value: "999 Invented Road",
          evidence: "Project Address: somewhere else",
          page: 1,
          method: "explicit_label",
        },
        client: {
          value: "x",
          evidence: "Client: x",
          page: 1,
          method: "explicit_label",
        },
        contractorName: {
          value: "Page Ghost",
          evidence: "Contractor: Page Ghost",
          page: 99,
          method: "model",
        },
      },
      "Project Address: somewhere else\nClient: x\nContractor: Page Ghost",
      2,
    );
    expect(getFieldSuggestions(project([bad]))).toHaveLength(0);
  });

  test("maps known aliases and dedupes identical values per field", () => {
    const mk = (id: string, key: string) =>
      doc(
        id,
        {
          [key]: {
            value: "North Star Bakery",
            evidence: `${key}: North Star Bakery`,
            page: 1,
            method: "model" as const,
          },
        },
        `${key}: North Star Bakery`,
      );
    const out = getFieldSuggestions(
      project([mk("a", "clientName"), mk("b", "client")], { client: "Someone Else" }),
    );
    expect(out.filter((s) => s.field === "client")).toHaveLength(1);
  });

  test("never invents values when documents carry no usable fields", () => {
    const empty = doc("e", {}, "No labeled lines here.");
    expect(getFieldSuggestions(project([empty]))).toHaveLength(0);
  });
});

describe("applyFieldSuggestion", () => {
  test("applies a reviewed suggestion and preserves audit with old value", () => {
    const p = project(realDocs());
    const suggestion = getFieldSuggestions(p).find((s) => s.field === "address")!;
    expect(suggestion).toBeDefined();
    const before = p.activity.length;
    const next = applyFieldSuggestion(p, suggestion);
    expect(next.details.address).toBe(suggestion.value);
    expect(next.activity.length).toBe(before + 1);
    const note = next.activity[next.activity.length - 1]!.message;
    expect(note).toContain("Reviewed field update");
    expect(note).toContain(suggestion.quote);
    expect(note).toContain(suggestion.documentId);
    expect(note).toContain("120 Example Lane, Halifax, NS"); // old value
    expect(next.permit).toBeUndefined();
  });

  test("does not mutate the input project", () => {
    const p = project(realDocs());
    const suggestion = getFieldSuggestions(p).find((s) => s.field === "client")!;
    const snapshot = JSON.stringify(p);
    applyFieldSuggestion(p, suggestion);
    expect(JSON.stringify(p)).toBe(snapshot);
  });

  test("rejects stale suggestions that no longer match document fields", () => {
    const p = project(realDocs());
    const stale: FieldSuggestion = {
      id: "d1|address",
      field: "address",
      value: "Old Value No Longer Present",
      documentId: "d1",
      documentName: "d1.txt",
      quote: "Project Address: Old Value No Longer Present",
      page: 1,
      method: "explicit_label",
    };
    expect(() => applyFieldSuggestion(p, stale)).toThrow(/stale|no longer matches/i);
  });

  test("rejects injected suggestions for unknown documents or fields", () => {
    const p = project(realDocs());
    const injected: FieldSuggestion = {
      id: "ghost|address",
      field: "address",
      value: "1 Ghost Street",
      documentId: "ghost",
      documentName: "ghost.txt",
      quote: "Address: 1 Ghost Street",
      method: "model",
    };
    expect(() => applyFieldSuggestion(p, injected)).toThrow(/unknown document/i);
  });

  test("client suggestions update the top-level client and preserve origin", () => {
    const p = project(realDocs());
    const suggestion = getFieldSuggestions(p).find((s) => s.field === "client")!;
    const next = applyFieldSuggestion(p, suggestion);
    expect(next.client).toBe("Harbour Light Co.");
    expect(next.details.address).toBe(p.details.address); // untouched
  });
});

describe("detectDocumentDiscrepancies", () => {
  test("flags different street numbers on an otherwise complete address as conflicting", () => {
    const out = detectDocumentDiscrepancies(project(realDocs()));
    const addr = out.find((d) => d.field === "address");
    expect(addr?.severity).toBe("conflicting");
    expect(addr?.evidence).toHaveLength(2);
    for (const e of addr!.evidence) {
      expect(e.quote.trim().length).toBeGreaterThan(0);
      expect(e.value.trim().length).toBeGreaterThan(0);
    }
  });

  test("treats partial addresses as needs_review, not confident conflicts", () => {
    const full = doc(
      "full",
      {
        projectAddress: {
          value: "120 Example Lane, Halifax, NS",
          evidence: "Project Address: 120 Example Lane, Halifax, NS",
          page: 1,
          method: "explicit_label",
        },
      },
      "Project Address: 120 Example Lane, Halifax, NS",
    );
    const partial = doc(
      "part",
      {
        address: {
          value: "120 Example Lane",
          evidence: "Address: 120 Example Lane",
          page: 1,
          method: "explicit_label",
        },
      },
      "Address: 120 Example Lane",
    );
    const out = detectDocumentDiscrepancies(project([full, partial]));
    expect(out.filter((d) => d.field === "address")).toHaveLength(1);
    expect(out.find((d) => d.field === "address")?.severity).toBe("needs_review");
  });

  test("does not treat contractor vs client roles as a conflict", () => {
    const same = doc(
      "s",
      {
        client: { value: "Same Person", evidence: "Client: Same Person", method: "explicit_label" },
        contractor: {
          value: "Same Person",
          evidence: "Contractor: Same Person",
          method: "explicit_label",
        },
      },
      "Client: Same Person\nContractor: Same Person",
    );
    const other = doc(
      "o",
      {
        contractor: {
          value: "Other Builder",
          evidence: "Contractor: Other Builder",
          method: "explicit_label",
        },
      },
      "Contractor: Other Builder",
    );
    const out = detectDocumentDiscrepancies(project([same, other]));
    // contractor "Same Person" vs "Other Builder" within the same role IS compared;
    // client "Same Person" is never compared against contractor values.
    expect(out.some((d) => /client.*contractor|contractor.*client/i.test(d.title))).toBe(false);
  });

  test("keeps consistent contractor values quiet", () => {
    const mk = (id: string) =>
      doc(
        id,
        {
          contractor: {
            value: "Seabright Works",
            evidence: "Contractor: Seabright Works",
            method: "explicit_label",
          },
        },
        "Contractor: Seabright Works",
      );
    expect(detectDocumentDiscrepancies(project([mk("a"), mk("b")]))).toHaveLength(0);
  });

  test("project description differences alone are needs_review", () => {
    const mk = (id: string, value: string) =>
      doc(
        id,
        {
          projectDescription: {
            value,
            evidence: `Scope: ${value}`,
            page: 1,
            method: "explicit_label",
          },
        },
        `Scope: ${value}`,
      );
    const out = detectDocumentDiscrepancies(
      project([mk("a", "Replace storefront windows."), mk("b", "Renovate lobby and storage rooms.")]),
    );
    const desc = out.find((d) => d.field === "description");
    expect(desc?.severity).toBe("needs_review");
  });

  test("ignores ungrounded fields and engineered judgments", () => {
    const fake = doc(
      "f",
      {
        projectAddress: {
          value: "Invented",
          evidence: "Something unrelated",
          method: "model",
        },
      },
      "Something unrelated",
    );
    expect(detectDocumentDiscrepancies(project([fake]))).toHaveLength(0);
  });
});

describe("buildApplicationWorksheet", () => {
  test("hrm commercial worksheet cites official source and is marked internal", () => {
    const p = project(realDocs(), {
      jurisdiction: {
        province: "NS",
        municipality: "hrm",
        municipalityName: "Halifax Regional Municipality",
        customerType: "small_company",
        workflow: "commercial-renovation",
      },
    });
    const sheet = buildApplicationWorksheet(p);
    expect(sheet).toContain("INTERNAL WORKSHEET - NOT OFFICIAL FORM - not submitted");
    expect(sheet).toContain("https://www.halifax.ca/media/72812");
    expect(sheet).toContain("Juniper Studio storefront renovation");
    expect(sheet).toContain("120 Example Lane, Halifax, NS");
    expect(sheet).toContain("d1.txt");
    // plain UTF-8 ASCII worksheet
    expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(sheet)).toBe(true);
  });

  test("non-hrm jurisdictions never cite hrm law", () => {
    const p = project(realDocs(), {
      jurisdiction: {
        province: "NS",
        municipality: "truro",
        municipalityName: "Town of Truro",
        customerType: "individual",
        workflow: "manual",
      },
    });
    const sheet = buildApplicationWorksheet(p);
    expect(sheet).not.toContain("https://www.halifax.ca/media/72812");
    expect(sheet).toContain("Truro");
    expect(sheet).toContain("INTERNAL WORKSHEET - NOT OFFICIAL FORM - not submitted");
  });

  test("worksheet lists unresolved discrepancies and reviewed notes", () => {
    const p = project(realDocs());
    const fixed = applyFieldSuggestion(
      p,
      getFieldSuggestions(p).find((s) => s.field === "client")!,
    );
    const sheet = buildApplicationWorksheet(fixed);
    expect(sheet).toContain("Unresolved discrepancies");
    expect(sheet).toContain("Reviewed proposal notes");
    expect(sheet).toContain("Harbour Light Co.");
  });
});
