import { describe, expect, test } from "bun:test";
import worker from "../../server/index.ts";

const PROJECT = {
  address: "123 Main Street, Halifax",
  description: "Lobby renovation",
  proposedArea: null,
  storeys: null,
  externalWalls: null,
  onHrmRoad: null,
  rightOfWayWork: null,
};

function postAnalyze(file: File | null, project: unknown): Request {
  const form = new FormData();
  if (file) form.set("file", file);
  if (project !== undefined) form.set("project", typeof project === "string" ? project : JSON.stringify(project));
  return new Request("http://localhost/api/analyze", { method: "POST", body: form });
}

describe("GET /api/health", () => {
  test("returns exact shape in deterministic mode", async () => {
    const res = await worker.fetch(new Request("http://localhost/api/health"), {});
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ status: "ok", mode: "deterministic", maxFileBytes: 5242880 });
  });

  test("reports model mode when configured", async () => {
    const res = await worker.fetch(new Request("http://localhost/api/health"), {
      MODEL_API_KEY: "k",
      MODEL_BASE_URL: "https://example.test",
      MODEL_NAME: "m",
    });
    const body = (await res.json()) as { mode: string };
    expect(body.mode).toBe("model");
  });
});

describe("POST /api/analyze", () => {
  test("analyzes a text upload and preserves original text", async () => {
    const file = new File(["Project Address: 123 Main Street, Halifax\nEnergy letter body."], "energy.txt", {
      type: "text/plain",
    });
    const res = await worker.fetch(postAnalyze(file, PROJECT), {});
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      documentType: string;
      text: string;
      pages: number;
      fields: Record<string, { value: string; method: string }>;
      method: string;
    };
    expect(body.text).toContain("Project Address: 123 Main Street, Halifax");
    expect(body.pages).toBe(1);
    expect(body.fields["projectAddress"]?.value).toBe("123 Main Street, Halifax");
    expect(body.fields["projectAddress"]?.method).toBe("explicit_label");
    expect(body.method).toBe("deterministic");
  });

  test("rejects missing address with 400", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const res = await worker.fetch(postAnalyze(file, { description: "no address" }), {});
    expect(res.status).toBe(400);
  });

  test("rejects malformed project json with 400", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const res = await worker.fetch(postAnalyze(file, "{not json"), {});
    expect(res.status).toBe(400);
  });

  test("rejects unsupported extension with 415", async () => {
    const file = new File(["hello"], "photo.png", { type: "image/png" });
    const res = await worker.fetch(postAnalyze(file, PROJECT), {});
    expect(res.status).toBe(415);
  });

  test("rejects oversize upload with 413", async () => {
    const big = new Uint8Array(5_242_881);
    const file = new File([big], "big.txt", { type: "text/plain" });
    const res = await worker.fetch(postAnalyze(file, PROJECT), {});
    expect(res.status).toBe(413);
  });

  test("rejects empty text with 422", async () => {
    const file = new File(["   "], "empty.txt", { type: "text/plain" });
    const res = await worker.fetch(postAnalyze(file, PROJECT), {});
    expect(res.status).toBe(422);
  });

  test("normalizes missing optional project fields to null", async () => {
    const file = new File(["Project Address: 1 Test Rd"], "notes.txt", { type: "text/plain" });
    const res = await worker.fetch(postAnalyze(file, { address: "1 Test Rd" }), {});
    expect(res.status).toBe(200);
  });

  test("blocks cross-origin posts with 403", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const form = new FormData();
    form.set("file", file);
    form.set("project", JSON.stringify(PROJECT));
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: form,
      headers: { origin: "https://evil.example" },
    });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(403);
  });

  test("passes non-api traffic to ASSETS", async () => {
    const res = await worker.fetch(new Request("http://localhost/"), {
      ASSETS: { fetch: async () => new Response("app", { status: 200 }) },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("app");
  });
});
