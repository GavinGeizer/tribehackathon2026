import { describe, expect, test } from "bun:test";
import { analyzeDeterministic, classifyDocument, extractExplicitFields } from "../../server/deterministic.ts";

describe("classifyDocument", () => {
  test("classifies an energy letter from content terms", () => {
    const result = classifyDocument(
      "scan001.txt",
      "To whom it may concern: this energy letter confirms NECB compliance for the renovation.",
    );
    expect(result.documentType).toBe("energy_letter");
  });

  test("classifies heritage photos and energy checklist from new content terms", () => {
    const heritage = classifyDocument(
      "photos.txt",
      "Heritage property photo record showing character-defining elements of the facade.",
    );
    expect(heritage.documentType).toBe("heritage_photos");
    const checklist = classifyDocument(
      "checklist.txt",
      "Attached HRM energy checklist completed for the renovation scope.",
    );
    expect(checklist.documentType).toBe("energy_checklist");
  });

  test("unknown document types stay grounded to other", () => {
    const result = classifyDocument("mystery.txt", "Some text with no known signals.");
    expect(result.documentType).toBe("other");
    expect(result.tentative).toBe(true);
  });

  test("letter-like professional content without seal stays tentative", () => {
    const result = classifyDocument(
      "letter.txt",
      "Dear reviewer, sincerely we attach architectural drawings for the lobby renovation. Regards, the design team.",
    );
    expect(result.documentType).toBe("professional_architectural");
    expect(result.tentative).toBe(true);
  });

  test("arbitrary address-only text is tentative other with unknown language", () => {
    const result = classifyDocument("notes.txt", "Some text mentioning 123 Main Street Halifax.");
    expect(result.documentType).toBe("other");
    expect(result.tentative).toBe(true);
  });

  test("filename hint classifies a plan when content is thin", () => {
    const result = classifyDocument("floor-plan-v2.txt", "Sheet A1 notes.");
    expect(result.documentType).toBe("construction_plan");
  });
});

describe("extractExplicitFields", () => {
  test("extracts Project Address with explicit_label method and evidence", () => {
    const { fields } = extractExplicitFields(
      "Project Address: 123 Main Street, Halifax\nScope: lobby renovation",
      "123 Main Street, Halifax",
    );
    expect(fields["projectAddress"]?.value).toBe("123 Main Street, Halifax");
    expect(fields["projectAddress"]?.method).toBe("explicit_label");
    expect(fields["projectAddress"]?.evidence).toContain("Project Address:");
  });

  test("supports Address variant label", () => {
    const { fields } = extractExplicitFields("Address: 45 Barrington St\n", null);
    expect(fields["projectAddress"]?.value).toBe("45 Barrington St");
    expect(fields["projectAddress"]?.method).toBe("explicit_label");
  });

  test("address mismatch produces a warning", () => {
    const { warnings } = extractExplicitFields(
      "Project Address: 999 Other Road\n",
      "123 Main Street, Halifax",
    );
    expect(warnings.some((w) => w.toLowerCase().includes("does not match"))).toBe(true);
  });

  test("missing address label warns without inventing values", () => {
    const { fields, warnings } = extractExplicitFields("Just some notes.\n", null);
    expect(fields["projectAddress"]).toBeUndefined();
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("analyzeDeterministic", () => {
  test("never claims AI use", () => {
    const result = analyzeDeterministic(
      "energy.txt",
      "Energy letter: NECB compliance.\nProject Address: 1 Test Rd",
      "1 Test Rd",
    );
    expect(result.documentType).toBe("energy_letter");
    const joined = JSON.stringify(result).toLowerCase();
    expect(joined).not.toContain("ai ");
    expect(joined).not.toContain("artificial intelligence");
  });
});

test("explicit labels preserve client, owner and applicant as distinct roles", () => {
  const { fields } = extractExplicitFields("Client: Fictional Tenant\nOwner: Fictional Landlord\nApplicant: Fictional Architect", null);
  expect(fields.client?.value).toBe("Fictional Tenant");
  expect(fields.owner?.value).toBe("Fictional Landlord");
  expect(fields.applicant?.value).toBe("Fictional Architect");
  expect(extractExplicitFields("Owner: Fictional Landlord", null).fields.client).toBeUndefined();
});
