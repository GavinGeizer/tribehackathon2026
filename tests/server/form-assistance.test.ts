import { describe, expect, test } from "bun:test";
import { suggestFormFields } from "../../server/form-assistance.ts";

const FIELDS = [
  { name: "Site Address", label: "Site address", type: "text", options: [] },
  { name: "Project DescriptionRow1", label: "Project description row 1", type: "text", options: [] },
  { name: "Work Type", label: "Type of work", type: "select", options: ["renovation", "new construction"] },
  { name: "Heritage Review", label: "Heritage review needed", type: "checkbox", options: [] },
  { name: "Applicant Signature", label: "Applicant signature", type: "text", options: [] },
];

const FACTS = [
  { id: "addr", label: "Site Address", value: "123 Main Street, Truro, NS", quote: "Site Address: 123 Main Street, Truro, NS", source: "upload.txt" },
  { id: "scope", label: "Project Description", value: "Interior fit-up", quote: "Scope: Interior fit-up", source: "upload.txt" },
  { id: "work", label: "Work type", value: "renovation", quote: "Work Type: renovation", source: "upload.txt" },
  { id: "herit", label: "Heritage", value: "no", quote: "Heritage: no", source: "upload.txt" },
];

function bindingEnv(run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>) {
  return { AI: { run } };
}

const asPayload = (suggestions: unknown) => ({ response: JSON.stringify({ suggestions, warnings: [] }) });

describe("suggestFormFields validation", () => {
  test("accepts exact verbatim text mapping via binding", async () => {
    const r = await suggestFormFields({
      fields: FIELDS.slice(0, 2),
      facts: FACTS.slice(0, 2),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "addr", reason: "Exact address fact." },
      ])),
    });
    expect(r.method).toBe("model");
    expect(r.suggestions).toHaveLength(1);
    expect(r.suggestions[0]?.value).toBe("123 Main Street, Truro, NS");
  });

  test("accepts enumerated select option equal to the fact", async () => {
    const r = await suggestFormFields({
      fields: [FIELDS[2] as never] as never,
      facts: [FACTS[2] as never] as never,
      env: bindingEnv(async () => asPayload([
        { fieldName: "Work Type", value: "renovation", factId: "work", reason: "Enumerated option." },
      ])),
    });
    expect(r.method).toBe("model");
  });

  test("accepts checkbox boolean matching explicit fact", async () => {
    const r = await suggestFormFields({
      fields: [FIELDS[3] as never] as never,
      facts: [FACTS[3] as never] as never,
      env: bindingEnv(async () => asPayload([
        { fieldName: "Heritage Review", value: false, factId: "herit", reason: "Fact says no." },
      ])),
    });
    expect(r.method).toBe("model");
    expect(r.suggestions[0]?.value).toBe(false);
  });

  test("rejects invented value not equal to the fact", async () => {
    const r = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Site Address", value: "999 Invented Blvd", factId: "addr", reason: "Invented." },
      ])),
    });
    expect(r.method).toBe("deterministic");
  });

  test("rejects unknown fact id and unknown field name", async () => {
    const badFact = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "nope", reason: "Unknown id." },
      ])),
    });
    expect(badFact.method).toBe("deterministic");
    const badField = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Made Up Field", value: "123 Main Street, Truro, NS", factId: "addr", reason: "Unknown field." },
      ])),
    });
    expect(badField.method).toBe("deterministic");
  });

  test("rejects select value outside enumerated options", async () => {
    const r = await suggestFormFields({
      fields: [FIELDS[2] as never] as never,
      facts: [{ id: "w2", label: "Work type", value: "demolition", quote: "Work Type: demolition", source: "u" }],
      env: bindingEnv(async () => asPayload([
        { fieldName: "Work Type", value: "demolition", factId: "w2", reason: "Not enumerated." },
      ])),
    });
    expect(r.method).toBe("deterministic");
  });

  test("never proposes signatures even when the model tries", async () => {
    const r = await suggestFormFields({
      fields: [FIELDS[4] as never] as never,
      facts: [{ id: "s1", label: "Signature", value: "Jane Doe", quote: "Signed: Jane Doe", source: "u" }],
      env: bindingEnv(async () => asPayload([
        { fieldName: "Applicant Signature", value: "Jane Doe", factId: "s1", reason: "Signature." },
      ])),
    });
    expect(r.method).toBe("deterministic");
    expect(r.suggestions.find((s) => s.fieldName === "Applicant Signature")).toBeUndefined();
  });

  test("rejects confidence numerics and duplicate fields", async () => {
    const conf = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "addr", reason: "ok", confidence: 0.9 },
      ])),
    });
    expect(conf.method).toBe("deterministic");
    const dup = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => asPayload([
        { fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "addr", reason: "one" },
        { fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "addr", reason: "two" },
      ])),
    });
    expect(dup.method).toBe("deterministic");
  });

  test("falls back on binding error, timeout, and bad JSON without leaking", async () => {
    const err = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => {
        throw new Error("boom SECRET=xyz");
      }),
    });
    expect(err.method).toBe("deterministic");
    expect(err.warnings.join(" ")).not.toContain("SECRET");
    const slow = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => new Promise(() => {})),
    }, );
    expect(slow.method).toBe("deterministic");
    const bad = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: bindingEnv(async () => ({ response: "not json" })),
    });
    expect(bad.method).toBe("deterministic");
  }, 30000);

  test("deterministic fallback maps only known Truro address/description names", async () => {
    const r = await suggestFormFields({ fields: FIELDS.slice(0, 2), facts: FACTS.slice(0, 2), env: {} });
    expect(r.method).toBe("deterministic");
    const names = r.suggestions.map((s) => s.fieldName).sort();
    expect(names).toEqual(["Project DescriptionRow1", "Site Address"]);
    expect(r.warnings.join(" ").toLowerCase()).toContain("deterministic");
  });

  test("deterministic fallback proposes nothing for unknown fields", async () => {
    const r = await suggestFormFields({
      fields: [{ name: "Owner Name", label: "Owner name", type: "text", options: [] }],
      facts: [{ id: "o1", label: "Owner", value: "Someone", quote: "Owner: Someone", source: "u" }],
      env: {},
    });
    expect(r.suggestions).toEqual([]);
  });

  test("enforces batch limits", async () => {
    const manyFields = Array.from({ length: 101 }, (_, i) => ({ name: `Field ${i}`, label: `Label ${i}`, type: "text", options: [] }));
    await expect(suggestFormFields({ fields: manyFields, facts: [], env: {} })).rejects.toThrow(/at most 100/);
    const manyFacts = Array.from({ length: 51 }, (_, i) => ({ id: `f${i}`, label: `L${i}`, value: "v", quote: "q", source: "s" }));
    await expect(suggestFormFields({ fields: [], facts: manyFacts, env: {} })).rejects.toThrow(/at most 50/);
  });

  test("OpenAI-compatible path maps exact facts", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestions: [{ fieldName: "Site Address", value: "123 Main Street, Truro, NS", factId: "addr", reason: "Exact." }], warnings: [] }) } }] }),
        { status: 200 },
      )) as typeof fetch;
    const r = await suggestFormFields({
      fields: FIELDS.slice(0, 1),
      facts: FACTS.slice(0, 1),
      env: { MODEL_API_KEY: "k", MODEL_BASE_URL: "https://example.test", MODEL_NAME: "m" },
      fetchImpl,
    });
    expect(r.method).toBe("model");
  });
});
describe('Integrated form fact provenance and role protection',()=>{
 test('accepts source IDs from actual document/form records',async()=>{const r=await suggestFormFields({fields:[FIELDS[0]],facts:[{...FACTS[0],id:'form:prior:Site Address'}],env:bindingEnv(async()=>asPayload([{fieldName:'Site Address',value:FACTS[0].value,factId:'form:prior:Site Address',reason:'Exact saved draft entry.'}]))});expect(r.method).toBe('model');expect(r.suggestions[0].factId).toBe('form:prior:Site Address');});
 test('rejects a client identity used as owner, even if the model proposes it',async()=>{const r=await suggestFormFields({fields:[{name:'Name_2',label:'Owner name',type:'text',options:[]}],facts:[{id:'client:1',label:'client',value:'Example Client',quote:'Client: Example Client',source:'Project'}],env:bindingEnv(async()=>asPayload([{fieldName:'Name_2',value:'Example Client',factId:'client:1',reason:'Incorrect role mapping.'}]))});expect(r.method).toBe('deterministic');expect(r.suggestions).toEqual([]);});
 test('rejects an ungrounded source quote before model reuse',async()=>{const r=await suggestFormFields({fields:[FIELDS[0]],facts:[{...FACTS[0],quote:'Unrelated source'}],env:bindingEnv(async()=>asPayload([{fieldName:'Site Address',value:FACTS[0].value,factId:'addr',reason:'Unsupported.'}]))});expect(r.method).toBe('deterministic');expect(r.suggestions).toEqual([]);});
});
test('fallback reuses each reviewed original-scope segment in its matching Truro row',async()=>{const r=await suggestFormFields({fields:[1,2,3].map(i=>({name:`Project DescriptionRow${i}`,label:`Project description line ${i}`,type:'text',options:[]})),facts:[{id:'project:row1',label:'Project Description row 1',value:'First scope line',quote:'First scope line second scope line',source:'Project details'},{id:'project:row2',label:'Project Description row 2',value:'second scope line',quote:'First scope line second scope line',source:'Project details'}],env:{}});expect(r.method).toBe('deterministic');expect(r.suggestions.map(s=>[s.fieldName,s.value])).toEqual([['Project DescriptionRow1','First scope line'],['Project DescriptionRow2','second scope line']]);});
