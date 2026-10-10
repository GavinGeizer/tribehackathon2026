# AI runtime research — Workers AI binding contract (primary sources only)

Worker: AI runtime (`server/ai.ts` + `tests/server/ai.test.ts`).
Source SHA verified: `3065ffe8a65e15ee210359287ada86bec5ccce90` (`git rev-parse HEAD`).
Date: 2026-10-10, Halifax. No provider connection claimed without request
verification; no secrets touched.

## 1. Official model + JSON Mode support (verified 2026-10-10)

- JSON Mode docs (`developers.cloudflare.com/workers-ai/features/json-mode/`):
  `response_format: { type: "json_schema", json_schema: <valid JSON Schema> }`.
  Supported list includes `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
  Docs warn the model may fail with `JSON Mode couldn't be met` — must be handled
  (app already falls back on any invalid output).
- Model page (`.../models/llama-3.3-70b-instruct-fp8-fast/`): context 24k tokens,
  pricing $0.293/M input + $2.253/M output tokens. No free/unlimited claim.
- Earlier `@cf/meta/llama-3.1-8b-instruct-fp8` is NOT on the JSON Mode list:
  do not reintroduce (matches prior live rejection of JSON Schema).

## 2. Binding call contract (verified in workerd runtime types, cf 1.0.0-beta.14 tree)

- `Ai_Cf_Meta_Llama_3_3_70B_Instruct_Fp8_Fast_Messages` accepts `messages[]`
  (role string + string content), `max_tokens`, `temperature`,
  `response_format?: { type?: "json_object" | "json_schema"; json_schema?: unknown }`.
  The app's `{ messages, max_tokens, temperature: 0, response_format:
  { type: "json_schema", json_schema } }` shape is contract-correct.
- Output union includes `{ response: string; ... }`; the app already handles
  string `response`, object `response` (JSON.stringify), and OpenAI-style
  `choices[0].message.content`.
- The raw sync-input schema (`sync-input.json`) lists only `prompt` as required,
  but the official workers-wrangler tutorial calls chat models with `messages`
  (no `prompt`), and the model-specific Messages interface documents it — so the
  app's `messages` input is not the bug.

## 3. Local dev remote-binding path (verified in @cloudflare/config + vite-plugin)

- `bindings.ai({ dev: { remote: true } })` maps to `{ binding, remote: true }`
  for the entry-worker AI binding (`@cloudflare/config` dist).
- The vite plugin picks remote bindings via `pickRemoteBindings` (`"remote" in
  binding && binding.remote`) and starts a remote proxy session; plugin-level
  `remoteBindings` defaults true, force-local via `CLOUDFLARE_VITE_FORCE_LOCAL`.
- Remote AI always hits the account (usage charges even in local dev, per the
  workers-wrangler tutorial) — so an immediate local fallback with no latency
  points at the proxy/auth layer rejecting before inference, not at the schema.

## 4. Actual bug fixed in this slice (with failing regressions)

`runWorkersAi` conflated every `ai.run()` rejection into one warning,
"The Workers AI request timed out or failed". An immediate binding rejection
(config/auth/proxy fault) was therefore indistinguishable from a genuine 12 s
inference timeout — the exact symptom seen locally ("falls back immediately").
Fix: a `timedOut` flag set only by the 12 s timer; immediate rejections
(including synchronous `throw`, which `Promise.race` converts to rejection)
now report "The Workers AI request failed; …" while true expiries keep
"…timed out; …". Two new regression tests pin both paths.

## 5. What was NOT changed, and why

- Prompt content, schema (4 required keys: documentType/extractedFields +
  optional warnings/uncertainties), 12 s timeout, 20k-char cap, 1500-token cap,
  temperature 0, strict zod + manual grounding checks, deterministic fallback,
  warning/uncertainty preservation: all already contract-correct; no failing
  regression justified touching them.
- OpenAI-compatible path wording ("timed out or failed") left as-is: one
  shared fetch+parse mechanism, outside this bug.
- No new provider/secret dependency. No raw document or secret logging
  (catch body only maps to fixed strings; `void err` documents intent).

## 6. Requirements for genuine app model verification (lead-owned)

1. Lead provides the public dev/prod URL (snapshot here has no `cf` CLI auth).
2. `GET /api/health` must report `mode: "model"` (binding present).
3. POST two DIFFERENT `/api/analyze` documents; each must return
   `method: "model"` with input-dependent `documentType`/fields, verbatim
   quotes from its own text, unknowns visible, no invented requirements.
4. With the new diagnostic, a "failed" warning = binding/config fault (check
   remote proxy session + auth), a "timed out" warning = slow inference.
5. Do not claim provider connection from mock/unit tests alone.
