# Design: Multi-Provider Model Selection with Fallback

**Date**: 2026-04-13
**Feature**: User-configurable AI model selection with primary + fallback support
**Spec ref**: Amends `specs/002-learnagent-pipeline-build/` — replaces hardcoded `claude-sonnet-4-6`

---

## 1. Problem

The current agent pipeline hardcodes `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Users cannot
change the model, cannot bring their own API keys for other providers, and have no fallback if
the primary model fails. This limits who can use the app and makes it fragile under API errors.

---

## 2. Goal

Every user can configure:
- A **primary model** from any supported provider (Anthropic, OpenAI, Google, Groq, Mistral,
  OpenRouter)
- An optional **fallback model** from any provider
- Their own **API keys** per provider (encrypted at rest)
- **Fallback triggers**: API error, timeout (30s default), daily cost limit ($5.00 default)

The three AI agents (Analyst, Teacher, Action) remain unchanged in interface. The model they
call is injected by the Orchestrator from the user's saved config.

---

## 3. Architecture

```
User Settings Page (/settings/models)
  └── POST /api/settings/models → saves to DB (keys AES-256-GCM encrypted)

Orchestrator (src/agents/orchestrator.ts)
  └── calls loadUserModelConfig(userId)
  └── gets { primary: LanguageModel, fallback: LanguageModel | null, timeoutMs, dailyCostLimitUsd }
  └── passes config to each agent call via generateWithFallback()

generateWithFallback() (src/lib/models/call.ts)
  └── 1. Check daily cost → if over limit, skip primary
  └── 2. Call primary with AbortSignal(timeoutMs)
       ├── Success → log cost → return
       ├── Timeout / API error → try fallback
  └── 3. Call fallback (fail fast, no retry)
       ├── Success → log cost, usedFallback=true → return
       └── Failure → throw { code: "all_models_failed" }
  └── 4. No fallback configured → throw { code: "model_failed" }

Model Registry (src/lib/models/registry.ts)
  └── provider list, model list per provider, cost rates per model

AI Client Factory (src/lib/models/client.ts)
  └── loadUserModelConfig(userId)
  └── decrypts API key from DB
  └── builds LanguageModel via Vercel AI SDK provider adapters
```

**SDK**: Vercel AI SDK (`ai` package — already installed). All providers use `generateText()`
with a `LanguageModel` instance. No per-provider branching in agent code.

---

## 4. Database Schema

### `user_model_config`
```
id                uuid PK defaultRandom
userId            text UNIQUE FK→user.id ON DELETE CASCADE NOT NULL
primaryProvider   text NOT NULL
primaryModel      text NOT NULL
fallbackProvider  text nullable
fallbackModel     text nullable
dailyCostLimitUsd numeric(8,4) NOT NULL default 5.00
timeoutMs         integer NOT NULL default 30000
createdAt         timestamp defaultNow NOT NULL
updatedAt         timestamp defaultNow NOT NULL
```

### `user_api_keys`
```
id        uuid PK defaultRandom
userId    text FK→user.id ON DELETE CASCADE NOT NULL
provider  text NOT NULL
keyHash   text NOT NULL  -- AES-256-GCM encrypted, never plaintext
createdAt timestamp defaultNow NOT NULL
updatedAt timestamp defaultNow NOT NULL
UNIQUE(userId, provider)
```

### `report_cost_log`
```
id           uuid PK defaultRandom
userId       text FK→user.id ON DELETE CASCADE NOT NULL
reportId     uuid FK→reports.id ON DELETE CASCADE NOT NULL
provider     text NOT NULL
model        text NOT NULL
inputTokens  integer NOT NULL
outputTokens integer NOT NULL
estimatedUsd numeric(8,6) NOT NULL
createdAt    timestamp defaultNow NOT NULL
```

**Key constraint**: API keys are encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var
(32-byte hex). Decrypted only in-process during model client construction. Never logged,
never returned in API responses.

---

## 5. Model Registry

File: `src/lib/models/registry.ts`

### Supported providers and models

| Provider | Model IDs | Cost tier |
|---|---|---|
| `anthropic` | `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6` | cheap / mid / expensive |
| `openai` | `gpt-4o-mini`, `gpt-4o`, `o1-mini`, `o1` | cheap / mid / mid / expensive |
| `google` | `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash` | cheap / mid / cheap |
| `groq` | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` | cheap / mid / mid |
| `mistral` | `mistral-small-latest`, `mistral-medium-latest`, `mistral-large-latest` | cheap / mid / expensive |
| `openrouter` | free-text model slug (e.g. `meta-llama/llama-3.1-405b`) | unknown — use default rate |

### Cost rates (USD per token)
Stored as `{ input: number, output: number }` per model. Used to compute `estimatedUsd`.
OpenRouter models not in the known-rates list use `{ input: 0.000002, output: 0.000002 }`.

---

## 6. AI Client Factory

File: `src/lib/models/client.ts`

```typescript
export async function loadUserModelConfig(userId: string): Promise<{
  primary: LanguageModel
  fallback: LanguageModel | null
  timeoutMs: number
  dailyCostLimitUsd: number
}>
```

Steps:
1. Query `user_model_config` WHERE `userId = userId` — if no row, return defaults
   (Anthropic `claude-sonnet-4-6` using `ANTHROPIC_API_KEY` env var — backwards compatible)
2. For each configured provider, query `user_api_keys` and decrypt key
3. Build `LanguageModel` using appropriate AI SDK adapter:
   - `anthropic(modelId)` from `@ai-sdk/anthropic`
   - `openai(modelId)` from `@ai-sdk/openai`
   - `google(modelId)` from `@ai-sdk/google`
   - `createGroq()(modelId)` from `@ai-sdk/groq`
   - `createMistral()(modelId)` from `@ai-sdk/mistral`
   - `createOpenRouter()(modelId)` from `@openrouter/ai-sdk-provider`
4. Return `{ primary, fallback, timeoutMs, dailyCostLimitUsd }`

**Missing key handling**: If the fallback provider has no saved API key, `fallback` is returned
as `null` — same as if no fallback were configured. The pipeline proceeds with primary only.
This prevents a misconfigured fallback from silently breaking the pipeline.

**Default fallback**: If user has no config row, `fallback` is `null`. First-time users get
Anthropic Sonnet as primary with the server's `ANTHROPIC_API_KEY` — no setup required to try
the app.

---

## 7. Resilient Caller

File: `src/lib/models/call.ts`

```typescript
export async function generateWithFallback(
  primary: LanguageModel,
  fallback: LanguageModel | null,
  config: {
    timeoutMs: number
    dailyCostLimitUsd: number
    userId: string
    reportId: string
    agentName: string  // "analyst" | "teacher" | "action" — for cost log
  },
  prompt: { system: string; user: string },
  maxTokens: number = 4096
): Promise<{ text: string; usedFallback: boolean }>
```

### Fallback trigger logic

```
1. COST CHECK
   Sum report_cost_log WHERE userId=X AND createdAt >= start of today
   If sum >= dailyCostLimitUsd AND fallback exists → use fallback directly
   If sum >= dailyCostLimitUsd AND no fallback → throw model_failed

2. PRIMARY CALL
   generateText({ model: primary, messages, maxTokens, abortSignal: AbortSignal.timeout(timeoutMs) })
   On success → logCost() → return { text, usedFallback: false }
   On AbortError (timeout) → go to step 3
   On APICallError / RateLimitError / AuthenticationError → go to step 3

3. FALLBACK CALL (if fallback exists)
   generateText({ model: fallback, messages, maxTokens })
   On success → logCost() → return { text, usedFallback: true }
   On any error → throw { code: "all_models_failed", message: "..." }

4. NO FALLBACK
   throw { code: "model_failed", message: "..." }
```

### Cost logging
After every successful call: insert into `report_cost_log` with token counts from
`generateText()` response and estimated USD from registry rates.

---

## 8. Orchestrator Changes

`src/agents/orchestrator.ts`:

1. Call `loadUserModelConfig(userId)` at pipeline start (once per report)
2. Pass `{ primary, fallback, timeoutMs, dailyCostLimitUsd, userId, reportId }` to each
   `runAnalyst()`, `runTeacher()`, `runAction()` call
3. If any call returns `usedFallback: true`, emit new SSE warning event:
   `{ type: "warning", message: "Switched to your backup model for this step" }`
   — non-blocking, does not stop pipeline

### Agent signature change
Each AI agent function gains a `modelConfig` parameter:
```typescript
runAnalyst(fetcherOutput, modelConfig)
runTeacher(fetcherOutput, analystOutput, modelConfig)
runAction(teacherMd, analystOutput, projectContext, modelConfig)
```
Internally each agent replaces the direct Anthropic SDK call with `generateWithFallback()`.

---

## 9. API Endpoints

### `GET /api/settings/models`
Returns current user's model config (keys masked — last 4 chars only).

### `POST /api/settings/models`
Body: `{ primaryProvider, primaryModel, fallbackProvider?, fallbackModel?, dailyCostLimitUsd?, timeoutMs? }`
Upserts `user_model_config`. Returns updated config.

### `POST /api/settings/models/keys`
Body: `{ provider, apiKey }`
Encrypts and upserts into `user_api_keys`. Returns `{ provider, maskedKey }`.

### `DELETE /api/settings/models/keys`
Body: `{ provider }`
Deletes key for that provider. If provider is current primary or fallback, clears that config too.

### `POST /api/settings/models/test`
Body: `{ provider, model, apiKey }`
Sends a minimal `generateText()` ping ("Reply with: ok"). Returns `{ ok: true }` or
`{ ok: false, error: string }`. Does NOT save the key — test only.

---

## 10. Settings UI

Route: `src/app/(app)/settings/models/page.tsx`

### Sections
1. **Primary Model** — provider dropdown → model dropdown → API key field → Save/Delete buttons
2. **Fallback Model** — same structure, optional
3. **Fallback Triggers** — three checkboxes (always all checked, values editable):
   - API error (always on, not toggleable)
   - Timeout: `[30]` seconds
   - Daily cost limit: `$[5.00]`
4. **Test Connection** button — pings selected provider/model/key, shows ✓ or error inline
5. **Save Settings** button — commits config to DB

### UX rules
- Provider dropdown changes → model dropdown repopulates for that provider
- OpenRouter provider → model field becomes free-text input instead of dropdown
- API key field shows `••••••••[last4]` if key already saved; user must retype to update
- Delete key button shows confirmation before calling DELETE endpoint
- Test Connection uses the key currently in the field (unsaved is fine — test doesn't save)
- If primary key is missing for selected provider → Save Settings is disabled with tooltip
- Fallback section is entirely optional — can be left blank

---

## 11. New Environment Variable

```bash
ENCRYPTION_KEY=<64-char hex string>  # 32 bytes = AES-256 key
# Generate with: openssl rand -hex 32
```

Must be added to `.env.local` and Vercel environment variables.

---

## 12. Files to Create / Modify

| File | Action |
|---|---|
| `src/lib/schema.ts` | Add `user_model_config`, `user_api_keys`, `report_cost_log` tables |
| `src/lib/models/registry.ts` | New — provider list, model list, cost rates |
| `src/lib/models/client.ts` | New — `loadUserModelConfig()` factory |
| `src/lib/models/call.ts` | New — `generateWithFallback()` with 3 triggers |
| `src/agents/analyst.ts` | Accept `modelConfig` param, use `generateWithFallback()` |
| `src/agents/teacher.ts` | Same |
| `src/agents/action.ts` | Same |
| `src/agents/orchestrator.ts` | Load config once, pass to agents, emit warning on fallback |
| `src/app/api/settings/models/route.ts` | New — GET + POST config |
| `src/app/api/settings/models/keys/route.ts` | New — POST + DELETE keys |
| `src/app/api/settings/models/test/route.ts` | New — POST test ping |
| `src/app/(app)/settings/models/page.tsx` | New — settings UI |
| `env.example` | Add `ENCRYPTION_KEY` |
| `package.json` | Add `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/mistral` if not present |

---

## 13. Backwards Compatibility

Users with no `user_model_config` row get the existing behaviour: Anthropic `claude-sonnet-4-6`
using the server's `ANTHROPIC_API_KEY`. Zero breaking changes for existing reports or users.
