import { describe, expect, test } from "bun:test";
import { analyzeDocument } from "../../server/ai.ts";

const PROJECT = {
  address: "123 Main Street, Halifax",
  description: "Lobby renovation",
  proposedArea: null,
  storeys: null,
  externalWalls: null,
  onHrmRoad: null,
  rightOfWayWork: null,
  heritageProperty: null,
  energyDocument: null,
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
                uncertainties: ["Professional evidence always requires human verification."],
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
    // Fix 4: validated model uncertainties are preserved, not dropped.
    expect(result.uncertainties).toContain("Professional evidence always requires human verification.");
  });

  test("falls back when value is not grounded in its own evidence", async () => {
    // Evidence quote exists globally, but the scalar value is arbitrary.
    const fetchImpl = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "energy_letter",
                extractedFields: {
                  projectAddress: {
                    value: "999 Invented Boulevard",
                    evidence: "Project Address: 123 Main Street, Halifax",
                  },
                },
              }),
            },
          },
        ],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: "Project Address: 123 Main Street, Halifax\nEnergy letter body.",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
  });

  test("falls back when evidence is quoted from the wrong page", async () => {
    const text = "Page one: Project Address: 123 Main Street\fPage two: other notes";
    const fetchImpl = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "energy_letter",
                extractedFields: {
                  projectAddress: {
                    value: "123 Main Street",
                    evidence: "Project Address: 123 Main Street",
                    page: 2,
                  },
                },
              }),
            },
          },
        ],
      })) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text,
      pages: 2,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
  });

  test("rejects unknown top-level and per-field keys (strict schema)", async () => {
    const topExtra = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "other",
                extractedFields: {},
                extraSection: "invented",
              }),
            },
          },
        ],
      })) as typeof fetch;
    const r1 = await analyzeDocument({
      filename: "x.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl: topExtra,
    });
    expect(r1.method).toBe("deterministic");

    const fieldExtra = (async () =>
      modelResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                documentType: "other",
                extractedFields: {
                  f: { value: "hello", evidence: "hello", bogus: 1 },
                },
              }),
            },
          },
        ],
      })) as typeof fetch;
    const r2 = await analyzeDocument({
      filename: "x.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl: fieldExtra,
    });
    expect(r2.method).toBe("deterministic");
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

  test("enforces timeout through slow body parsing (covers response.json)", async () => {
    const slowJson = new Response(JSON.stringify({ choices: [] }), { status: 200 });
    const origJson = slowJson.json.bind(slowJson);
    slowJson.json = (() =>
      new Promise((resolve) => setTimeout(() => resolve(origJson()), 15_000))) as typeof slowJson.json;
    const fetchImpl = (async () => slowJson) as typeof fetch;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: "hello",
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(result.method).toBe("deterministic");
    expect(result.warnings.join(" ").toLowerCase()).toMatch(/timed out|could not be read/);
  }, 20000);

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

describe("analyzeDocument via Workers AI binding", () => {
  const TEXT = "Project Address: 123 Main Street, Halifax\nEnergy checklist body.";

  function workersAiEnv(run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>) {
    return { AI: { run } };
  }

  test("accepts valid binding output with grounded evidence", async () => {
    let seenModel = "";
    let seenInputs: Record<string, unknown> = {};
    const result = await analyzeDocument({
      filename: "checklist.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: workersAiEnv(async (model, inputs) => {
        seenModel = model;
        seenInputs = inputs;
        return {
          response: JSON.stringify({
            documentType: "energy_checklist",
            extractedFields: {
              projectAddress: {
                value: "123 Main Street, Halifax",
                evidence: "Project Address: 123 Main Street, Halifax",
              },
            },
            warnings: [],
            uncertainties: [],
          }),
        };
      }),
    });
    expect(result.method).toBe("model");
    expect(result.documentType).toBe("energy_checklist");
    expect(seenModel).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    const inputs = seenInputs as {
      messages: Array<{ content: string }>;
      max_tokens: number;
      temperature: number;
      response_format: { type: string; json_schema: { properties: Record<string, unknown> } };
      tools?: unknown;
    };
    expect(inputs.max_tokens).toBeLessThanOrEqual(1500);
    expect(inputs.temperature).toBe(0);
    expect(inputs.response_format.type).toBe("json_schema");
    expect("tools" in inputs).toBe(false);
    expect(JSON.stringify(inputs.messages)).toContain("UNTRUSTED");
  });

  test("prefers the binding over OpenAI-compatible env when both configured", async () => {
    let bindingUsed = false;
    const result = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: {
        MODEL_API_KEY: "k",
        MODEL_BASE_URL: "https://example.test",
        MODEL_NAME: "m",
        ...workersAiEnv(async () => {
          bindingUsed = true;
          return { response: JSON.stringify({ documentType: "other", extractedFields: {} }) };
        }),
      },
      fetchImpl: (async () => {
        throw new Error("openai-compatible path must not be called");
      }) as typeof fetch,
    });
    expect(bindingUsed).toBe(true);
    expect(result.method).toBe("model");
  });

  test(
    "falls back on binding timeout",
    async () => {
      const result = await analyzeDocument({
        filename: "x.txt",
        text: TEXT,
        pages: 1,
        project: PROJECT,
        deterministic: DETERMINISTIC,
        env: workersAiEnv(async () => new Promise(() => {})),
      });
      expect(result.method).toBe("deterministic");
      expect(result.warnings.join(" ").toLowerCase()).toContain("timed out");
    },
    20000,
  );

  test("distinguishes an immediate binding failure from a timeout", async () => {
    const result = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: workersAiEnv(async () => {
        throw new Error("binding unavailable SECRET=xyz");
      }),
    });
    expect(result.method).toBe("deterministic");
    // An immediate rejection is a provider/binding failure, not a timeout:
    // the warning must say "failed" without claiming a timeout, so the
    // operator can tell config/auth faults apart from slow inference.
    expect(result.warnings.join(" ").toLowerCase()).toContain("failed");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain("timed out");
    expect(result.warnings.join(" ")).not.toContain("SECRET");
  });

  test("distinguishes a synchronous binding throw from a timeout", async () => {
    const binding = {
      run() {
        throw new Error("Illegal invocation");
      },
    };
    const result = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: { AI: binding },
    });
    expect(result.method).toBe("deterministic");
    expect(result.warnings.join(" ").toLowerCase()).toContain("failed");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain("timed out");
  });

  test("falls back on binding error and invalid output", async () => {
    const failing = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: workersAiEnv(async () => {
        throw new Error("boom SECRET=xyz");
      }),
    });
    expect(failing.method).toBe("deterministic");
    expect(failing.warnings.join(" ")).not.toContain("SECRET");

    const badJson = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: workersAiEnv(async () => ({ response: "not json" })),
    });
    expect(badJson.method).toBe("deterministic");

    const ungrounded = await analyzeDocument({
      filename: "x.txt",
      text: TEXT,
      pages: 1,
      project: PROJECT,
      deterministic: DETERMINISTIC,
      env: workersAiEnv(async () => ({
        response: JSON.stringify({
          documentType: "energy_checklist",
          extractedFields: { projectAddress: { value: "Nowhere", evidence: "never in doc" } },
        }),
      })),
    });
    expect(ungrounded.method).toBe("deterministic");
  });
});

test('accepts validated structured binding response objects from a JSON-schema-capable model', async () => {
  const data = { documentType: 'elevations', extractedFields: { projectAddress: { value: '123 Main Street, Halifax', evidence: 'Project Address: 123 Main Street, Halifax' } }, warnings: [], uncertainties: [] };
  const text = 'Project Address: 123 Main Street, Halifax\nNorth south east west elevation views.';
  const result = await analyzeDocument({
    filename: 'elevations.txt', text, pages: 1, project: PROJECT, deterministic: DETERMINISTIC,
    env: { AI: { run: async (model) => {
      if (model !== '@cf/meta/llama-3.3-70b-instruct-fp8-fast') throw new Error('Selected model does not support JSON Schema');
      return { response: data, choices: [{ message: { content: JSON.stringify(data) } }] };
    } } },
  });
  expect(result.method).toBe('model');
  expect(result.documentType).toBe('elevations');
  expect(result.fields.projectAddress.value).toBe('123 Main Street, Halifax');
});

test('preserves the Workers AI method receiver', async () => {
  const text = 'Project Address: 123 Main Street, Halifax\nNorth south east west elevation views.';
  const binding = {
    marker: 'binding-context',
    async run() {
      if (this.marker !== 'binding-context') throw new Error('Illegal invocation');
      return { response: { documentType: 'elevations', extractedFields: { projectAddress: { value: '123 Main Street, Halifax', evidence: 'Project Address: 123 Main Street, Halifax' } }, warnings: [], uncertainties: [] } };
    },
  };
  const result = await analyzeDocument({ filename: 'elevations.txt', text, pages: 1, project: PROJECT, deterministic: DETERMINISTIC, env: { AI: binding } });
  expect(result.method).toBe('model');
});

test('canonicalizes grounded model field aliases for the evidence engine', async () => {
 const text='Project address: 41 Synthetic Wharf\nProject name: Workshop\nOwner: Fictional Owner';
 const result=await analyzeDocument({filename:'description.txt',text,pages:1,project:PROJECT,deterministic:DETERMINISTIC,env:{AI:{run:async()=>({response:{documentType:'project_description',extractedFields:{project_address:{value:'41 Synthetic Wharf',evidence:'Project address: 41 Synthetic Wharf'},project_name:{value:'Workshop',evidence:'Project name: Workshop'},owner:{value:'Fictional Owner',evidence:'Owner: Fictional Owner'}},warnings:[],uncertainties:[]}})}}});
 expect(result.method).toBe('model');expect(result.fields.projectAddress?.value).toBe('41 Synthetic Wharf');expect(result.fields.projectName?.value).toBe('Workshop');expect(result.fields.owner?.value).toBe('Fictional Owner');expect(result.fields.client).toBeUndefined();
});

test('normalizes labelled model keys while keeping identity roles distinct', async () => {
  const text = 'Project Address: 88 Synthetic Street\nClient: Fictional Client\nOwner Name: Fictional Owner\nApplicant: Fictional Applicant';
  const fields = {
    'Project Address': { value: '88 Synthetic Street', evidence: 'Project Address: 88 Synthetic Street' },
    Client: { value: 'Fictional Client', evidence: 'Client: Fictional Client' },
    'Owner-Name': { value: 'Fictional Owner', evidence: 'Owner Name: Fictional Owner' },
    Applicant: { value: 'Fictional Applicant', evidence: 'Applicant: Fictional Applicant' },
  };
  const result = await analyzeDocument({ filename: 'synthetic.txt', text, pages: 1, project: PROJECT, deterministic: DETERMINISTIC, env: { AI: { run: async () => ({ response: { documentType: 'project_description', extractedFields: fields } }) } } });
  expect(result.method).toBe('model');
  expect(result.fields.projectAddress?.value).toBe('88 Synthetic Street');
  expect(result.fields.client?.value).toBe('Fictional Client');
  expect(result.fields.owner?.value).toBe('Fictional Owner');
  expect(result.fields.applicant?.value).toBe('Fictional Applicant');
});
