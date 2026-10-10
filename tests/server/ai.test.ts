import { describe, expect, test } from "bun:test";
import { analyzeDocument } from "../../server/ai.ts";
import type { ProjectDetails } from "../../frontend/src/domain/types.ts";

const PROJECT: ProjectDetails = {
  address: "123 Main Street, Halifax",
  description: "Lobby renovation",
  proposedArea: null,
  storeys: null,
  externalWalls: null,
  onHrmRoad: null,
  rightOfWayWork: null,
};

const DETERMINISTIC = {
  documentType: "other" as const,
  fields: {},
};

function modelResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe("analyzeDocument", () => {
  test("returns deterministic when env is unconfigured", async () => {
    const result = await analyzeDocument({
      filename: "notes.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: {},
    });
    expect(result.method).toBe("deterministic");
    expect(result.warnings).toEqual([]);
  });

  test("accepts valid model output with grounded evidence", async () => {
    const text = "Project Address: 123 Main Street, Halifax\nEnergy letter body.";
    const fetchImpl = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "energy_letter",
                extractedFields: {
                  projectAddress: {
                    value: "123 Main Street, Halifax",
                    evidence: "Project Address: 123 Main Street, Halifax",
                  },
                },
                warnings: [],
                uncertainties: [],
              }),
            },
          },
        ],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "energy.txt",
      text,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("model");
    expect(result.documentType).toBe("energy_letter");
    expect(result.fields["projectAddress"]?.method).toBe("model");
  });

  test("falls back on invalid documentType", async () => {
    const fetchImpl = (async () =>
      modelResponse({
        choices: [{ message: { content: JSON.stringify({ documentType: "spaceship", extractedFields: {} }) } }],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: "Project Address: 1 Test Rd",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("falls back on ungrounded evidence", async () => {
    const fetchImpl = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "energy_letter",
                extractedFields: {
                  projectAddress: { value: "Nowhere", evidence: "Quote never in the document" },
                },
              }),
            },
          },
        ],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: "Project Address: 1 Test Rd",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
  });

  test("rejects arbitrary confidence numbers", async () => {
    const text = "Project Address: 1 Test Rd";
    const fetchImpl = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "energy_letter",
                extractedFields: {},
                confidence: 0.97,
              }),
            },
          },
        ],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
  });

  test("falls back on timeout / service error without leaking details", async () => {
    const failing = (async () => {
      throw new Error("socket exploded with SECRET_KEY=abc body={private:true}");
    }) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "SECRET_KEY=abc", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl: failing,
    });
    expect(result.method).toBe("deterministic");
    const joined = result.warnings.join(" ");
    expect(joined).not.toContain("SECRET_KEY");
    expect(joined).not.toContain("private");

    const badStatus = (async () => new Response("upstream key=SECRET body=xxx", { status: 500 })) as typeof fetch;
    const result2 = await analyzeDocument({
      filename: "x.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl: badStatus,
    });
    expect(result2.method).toBe("deterministic");
    expect(result2.warnings.join(" ")).not.toContain("SECRET");
  });

  test("sends at most 20k chars and no-tools payload shape", async () => {
    let seenBody = "";
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      seenBody = String(init?.body ?? "");
      return modelResponse({
        choices: [{ message: { content: JSON.stringify({ documentType: "other", extractedFields: {} }) } }],
      });
    }) as typeof fetch;
    const longText = `Project Address: 1 Test Rd\n${"x".repeat(25_000)}`;
    await analyzeDocument({
      filename: "x.txt",
      text: longText,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    const body = JSON.parse(seenBody) as { messages: Array<{ content: string }>; tools?: unknown };
    expect(body.messages[1]?.content.length).toBeLessThan(25_000);
    expect("tools" in body).toBe(false);
    expect(seenBody).toContain("UNTRUSTED");
  });
});
