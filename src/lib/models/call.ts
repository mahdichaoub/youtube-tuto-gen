import { generateText } from "ai";
import { eq, gte, and, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportCostLog } from "@/lib/schema";
import { getCostRate } from "./registry";
import type { LanguageModel } from "./registry";

export type AgentName = "analyst" | "teacher" | "action" | "researcher";

export interface GenerateConfig {
  timeoutMs: number;
  dailyCostLimitUsd: number;
  userId: string;
  reportId: string;
  agentName: AgentName;
}

function debugLog(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    process.stdout.write(`${message}\n`);
  }
}

// ─── Cost helpers ─────────────────────────────────────────────────────────────

async function getTodayCostUsd(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const result = await db
    .select({ total: sum(reportCostLog.estimatedUsd) })
    .from(reportCostLog)
    .where(
      and(
        eq(reportCostLog.userId, userId),
        gte(reportCostLog.createdAt, startOfDay)
      )
    );

  return parseFloat(result[0]?.total ?? "0");
}

async function insertCostLog(
  userId: string,
  reportId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const rate = getCostRate(model);
  const estimatedUsd = (
    inputTokens * rate.input +
    outputTokens * rate.output
  ).toFixed(6);

  await db.insert(reportCostLog).values({
    userId,
    reportId,
    provider,
    model,
    inputTokens,
    outputTokens,
    estimatedUsd,
  });
}

// ─── Error classification ─────────────────────────────────────────────────────

function isProviderError(err: unknown): boolean {
  if (!(err instanceof Error)) return true; // Unknown — treat as retryable
  const name = err.name.toLowerCase();
  const msg = err.message.toLowerCase();
  return (
    name.includes("abort") ||
    name.includes("api") ||
    name.includes("ratelimit") ||
    name.includes("authentication") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("unauthorized") ||
    msg.includes("quota")
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calls the primary model and falls back to the secondary on provider errors.
 * Inserts a cost-log row on every successful call.
 * Throws { code: "model_failed" } or { code: "all_models_failed" } on total failure.
 */
export async function generateWithFallback(
  primary: LanguageModel,
  fallback: LanguageModel | null,
  config: GenerateConfig,
  prompt: { system: string; user: string },
  maxTokens = 4096
): Promise<{ text: string; usedFallback: boolean }> {
  const { timeoutMs, dailyCostLimitUsd, userId, reportId, agentName } = config;

  // Step 1 — daily cost gate
  debugLog(`[call:${agentName}] checking daily cost for userId=${userId}`);
  let todayCost: number;
  try {
    todayCost = await getTodayCostUsd(userId);
  } catch (err) {
    console.error(`[call:${agentName}] getTodayCostUsd FAILED:`, err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err));
    throw err;
  }
  debugLog(`[call:${agentName}] todayCost=${todayCost} limit=${dailyCostLimitUsd}`);

  if (todayCost >= dailyCostLimitUsd) {
    if (fallback) {
      return runModel(fallback, prompt, maxTokens, userId, reportId, true);
    }
    throw { code: "model_failed", reason: "daily_limit_reached", agentName };
  }

  // Step 2 — try primary with per-step timeout
  debugLog(`[call:${agentName}] calling primary model`);
  try {
    const result = await runModel(primary, prompt, maxTokens, userId, reportId, false, timeoutMs);
    debugLog(`[call:${agentName}] primary model succeeded`);
    return result;
  } catch (err) {
    console.error(`[call:${agentName}] primary model FAILED:`, err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err));
    if (!isProviderError(err)) throw err;
    if (!fallback) {
      throw { code: "model_failed", reason: "primary_failed", agentName };
    }
  }

  // Step 3 — try fallback (no per-step timeout override)
  debugLog(`[call:${agentName}] calling fallback model`);
  try {
    return await runModel(fallback!, prompt, maxTokens, userId, reportId, true);
  } catch (err) {
    console.error(`[call:${agentName}] fallback model FAILED:`, err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err));
    throw { code: "all_models_failed", agentName };
  }
}

async function runModel(
  model: LanguageModel,
  prompt: { system: string; user: string },
  maxTokens: number,
  userId: string,
  reportId: string,
  usedFallback: boolean,
  timeoutMs?: number
): Promise<{ text: string; usedFallback: boolean }> {
  const abortSignal = timeoutMs
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxOutputTokens: maxTokens,
    ...(abortSignal ? { abortSignal } : {}),
  });

  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;
  const modelId =
    typeof (model as { modelId?: string }).modelId === "string"
      ? (model as { modelId: string }).modelId
      : "unknown";
  const providerId =
    typeof (model as { provider?: string }).provider === "string"
      ? (model as { provider: string }).provider
      : "unknown";

  await insertCostLog(
    userId,
    reportId,
    providerId,
    modelId,
    inputTokens,
    outputTokens
  );

  return { text: result.text, usedFallback };
}
