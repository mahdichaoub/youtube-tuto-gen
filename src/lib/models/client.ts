import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { userModelConfig, userApiKeys } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { LanguageModel } from "./registry";
import { DEFAULT_PRIMARY } from "./registry";

// ─── Encryption helpers ───────────────────────────────────────────────────────

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext API key using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all hex-encoded).
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a stored API key.
 * Expects the "iv:authTag:ciphertext" format produced by encryptApiKey.
 */
export function decryptApiKey(stored: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted key format");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ─── Model builder ────────────────────────────────────────────────────────────

function buildModel(provider: string, modelId: string, apiKey: string): LanguageModel {
  // Adapters at @ai-sdk/* v3 return LanguageModelV3 while ai@5 types use LanguageModelV2.
  // The runtime interface is compatible — cast via unknown to satisfy TypeScript.
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId) as unknown as LanguageModel;
    case "openai":
      return createOpenAI({ apiKey })(modelId) as unknown as LanguageModel;
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId) as unknown as LanguageModel;
    case "groq":
      return createGroq({ apiKey })(modelId) as unknown as LanguageModel;
    case "mistral":
      return createMistral({ apiKey })(modelId) as unknown as LanguageModel;
    case "openrouter":
      return createOpenRouter({ apiKey })(modelId) as unknown as LanguageModel;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function getDecryptedKey(
  userId: string,
  provider: string
): Promise<string | null> {
  const rows = await db
    .select({ keyHash: userApiKeys.keyHash })
    .from(userApiKeys)
    .where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider))
    )
    .limit(1);

  if (!rows[0]) return null;
  try {
    return decryptApiKey(rows[0].keyHash);
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ResolvedModelConfig {
  primary: LanguageModel;
  fallback: LanguageModel | null;
  timeoutMs: number;
  dailyCostLimitUsd: number;
}

/**
 * Loads the user's model configuration from the database.
 * Falls back to claude-sonnet-4-6 via server ANTHROPIC_API_KEY
 * if the user has no saved config.
 */
export async function loadUserModelConfig(
  userId: string
): Promise<ResolvedModelConfig> {
  const config = await db
    .select()
    .from(userModelConfig)
    .where(eq(userModelConfig.userId, userId))
    .limit(1);

  // Default: use server ANTHROPIC_API_KEY, no fallback
  if (!config[0]) {
    const serverKey = process.env.ANTHROPIC_API_KEY ?? "";
    const primary = buildModel(
      DEFAULT_PRIMARY.provider,
      DEFAULT_PRIMARY.model,
      serverKey
    );
    return { primary, fallback: null, timeoutMs: 30000, dailyCostLimitUsd: 5.0 };
  }

  const cfg = config[0];

  // Build primary model
  const primaryKey = await getDecryptedKey(userId, cfg.primaryProvider);
  const primary = buildModel(
    cfg.primaryProvider,
    cfg.primaryModel,
    primaryKey ?? ""
  );

  // Build fallback model (optional)
  let fallback: LanguageModel | null = null;
  if (cfg.fallbackProvider && cfg.fallbackModel) {
    const fallbackKey = await getDecryptedKey(userId, cfg.fallbackProvider);
    if (fallbackKey) {
      fallback = buildModel(cfg.fallbackProvider, cfg.fallbackModel, fallbackKey);
    }
  }

  return {
    primary,
    fallback,
    timeoutMs: cfg.timeoutMs,
    dailyCostLimitUsd: parseFloat(cfg.dailyCostLimitUsd ?? "5.0"),
  };
}
