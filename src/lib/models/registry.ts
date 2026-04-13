import type { LanguageModel as AiLanguageModel } from "ai";

// Re-export the LanguageModel type used throughout the codebase.
// Using the type from `ai` package directly so it matches generateText's model param.
// Cast adapter returns (V3) to this type via `as unknown as LanguageModel` in client.ts.
export type LanguageModel = AiLanguageModel;

// ─── Provider registry ────────────────────────────────────────────────────────

export const PROVIDERS = {
  anthropic: "anthropic",
  openai: "openai",
  google: "google",
  groq: "groq",
  mistral: "mistral",
  openrouter: "openrouter",
} as const;

export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

// ─── Model registry ───────────────────────────────────────────────────────────

export const MODEL_REGISTRY: Record<Provider, string[]> = {
  anthropic: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-6"],
  openai: ["gpt-4o-mini", "gpt-4o", "o1-mini", "o1"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
  groq: [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
  ],
  mistral: [
    "mistral-small-latest",
    "mistral-medium-latest",
    "mistral-large-latest",
  ],
  // OpenRouter accepts any model slug — freeform input in the UI
  openrouter: [],
};

// ─── Cost rates (USD per token) ───────────────────────────────────────────────

export const COST_RATES: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-haiku-4-5": { input: 0.00000025, output: 0.00000125 },
  "claude-sonnet-4-6": { input: 0.000003, output: 0.000015 },
  "claude-opus-4-6": { input: 0.000015, output: 0.000075 },
  // OpenAI
  "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
  "gpt-4o": { input: 0.0000025, output: 0.00001 },
  "o1-mini": { input: 0.000003, output: 0.000012 },
  o1: { input: 0.000015, output: 0.00006 },
  // Google
  "gemini-1.5-flash": { input: 0.000000075, output: 0.0000003 },
  "gemini-1.5-pro": { input: 0.00000125, output: 0.000005 },
  "gemini-2.0-flash": { input: 0.0000001, output: 0.0000004 },
  // Groq
  "llama-3.1-8b-instant": { input: 0.00000005, output: 0.00000008 },
  "llama-3.3-70b-versatile": { input: 0.00000059, output: 0.00000079 },
  "mixtral-8x7b-32768": { input: 0.00000024, output: 0.00000024 },
  // Mistral
  "mistral-small-latest": { input: 0.000001, output: 0.000003 },
  "mistral-medium-latest": { input: 0.000002, output: 0.000006 },
  "mistral-large-latest": { input: 0.000008, output: 0.000024 },
};

/** Fallback rate for unknown models (e.g. custom OpenRouter slugs). */
export const FALLBACK_COST_RATE = { input: 0.000002, output: 0.000002 };

export function getCostRate(model: string): { input: number; output: number } {
  return COST_RATES[model] ?? FALLBACK_COST_RATE;
}

// ─── Default config ───────────────────────────────────────────────────────────

export const DEFAULT_PRIMARY = {
  provider: "anthropic" as Provider,
  model: "claude-sonnet-4-6",
};
