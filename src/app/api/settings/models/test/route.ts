import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { auth } from "@/lib/auth";
import { PROVIDERS } from "@/lib/models/registry";
import type { LanguageModel } from "@/lib/models/registry";

function buildTestModel(provider: string, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId) as unknown as LanguageModel;
    case "openai":
      return createOpenAI({ apiKey }).chat(modelId) as unknown as LanguageModel;
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId) as unknown as LanguageModel;
    case "groq":
      return createGroq({ apiKey })(modelId) as unknown as LanguageModel;
    case "mistral":
      return createMistral({ apiKey })(modelId) as unknown as LanguageModel;
    case "openrouter":
      return createOpenRouter({ apiKey })(modelId) as unknown as LanguageModel;
    case "moonshot":
      return createOpenAI({
        baseURL: "https://api.moonshot.ai/v1",
        apiKey,
      }).chat(modelId) as unknown as LanguageModel;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." });
  }

  const provider = typeof body.provider === "string" ? body.provider : null;
  const model = typeof body.model === "string" ? body.model.trim() : null;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : null;

  if (!provider || !Object.values(PROVIDERS).includes(provider as never)) {
    return NextResponse.json({ ok: false, error: "Invalid provider." });
  }
  if (!model) {
    return NextResponse.json({ ok: false, error: "Model is required." });
  }
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "API key is required." });
  }

  try {
    const testModel = buildTestModel(provider, model, apiKey);
    const result = await generateText({
      model: testModel,
      messages: [{ role: "user", content: 'Reply with exactly: ok' }],
      maxOutputTokens: 10,
      abortSignal: AbortSignal.timeout(15000),
    });

    const text = result.text.trim().toLowerCase();
    if (text.includes("ok")) {
      return NextResponse.json({ ok: true });
    }
    // Model responded but not with expected output — still counts as connected
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    const userMessage = message.includes("401") || message.includes("authentication") || message.includes("API key")
      ? "Invalid API key. Please check and try again."
      : message.includes("timeout") || message.includes("abort")
      ? "Connection timed out. Please try again."
      : message.includes("model") || message.includes("404")
      ? "Model not found. Please check the model name."
      : "Connection failed. Please verify your API key and model.";

    return NextResponse.json({ ok: false, error: userMessage });
  }
}
