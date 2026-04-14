/**
 * Standalone pipeline test — no auth, no DB, no HTTP.
 * Tests the AI SDK → OpenRouter → Kimi K2 path directly.
 *
 * Run: npx tsx scripts/test-pipeline.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const MOONSHOT_KEY = process.env.MOONSHOT_API_KEY ?? "";

if (!MOONSHOT_KEY) {
  console.error("❌ MOONSHOT_API_KEY is not set in .env.local");
  process.exit(1);
}

// Use .chat() to force Chat Completions API (spec v2) — avoids Responses API (spec v3)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const model = createOpenAI({
  baseURL: "https://api.moonshot.ai/v1",
  apiKey: MOONSHOT_KEY,
}).chat("kimi-k2.5") as any;

// ── Test 1: Analyst prompt ────────────────────────────────────────────────────

const ANALYST_SYSTEM = `You are a learning analyst. Extract a structured analysis from a transcript excerpt.

Return ONLY valid JSON with these exact fields:
{
  "video_id": "string",
  "core_concept": "string",
  "key_highlights": ["string", ...],
  "mental_models": ["string", ...],
  "examples_used": ["string", ...],
  "warnings_and_mistakes": ["string", ...],
  "key_terms": ["string", ...],
  "estimated_difficulty": "beginner" | "intermediate" | "advanced",
  "topic_category": "string"
}

Rules: key_highlights must have 5-7 items. Return ONLY JSON.`;

const ANALYST_USER = `Video ID: test-001
Title: Introduction to React Hooks
Language: en

Transcript:
React Hooks were introduced in React 16.8. They let you use state and other React features in function components.
The useState hook returns a state variable and a setter function. When you call the setter, React re-renders the component.
The useEffect hook runs after every render by default. You can control when it runs by passing a dependency array.
Common mistakes: forgetting the dependency array causes infinite loops. Putting async functions directly in useEffect is wrong.
The key mental model is: hooks are just JavaScript functions that tap into React's internals.
Examples: a counter component using useState, a data fetcher using useEffect with cleanup.
Key terms: hooks, state, effect, dependency array, re-render, side effects.`;

async function runTest() {
  console.log("🔄 Testing AI SDK → OpenRouter → Kimi K2...\n");
  console.log("Provider: moonshot (direct)");
  console.log("Model: kimi-k2.5\n");

  const start = Date.now();

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: ANALYST_SYSTEM },
        { role: "user", content: ANALYST_USER },
      ],
      maxOutputTokens: 4096,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ Response received in ${elapsed}s`);
    console.log(`   Tokens: ${result.usage?.inputTokens} in / ${result.usage?.outputTokens} out\n`);

    // Parse and validate
    let parsed: Record<string, unknown>;
    try {
      const cleaned = result.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("❌ JSON parse failed. Raw output:");
      console.error(result.text.slice(0, 500));
      process.exit(1);
    }

    const highlights = parsed.key_highlights as unknown[];
    if (!Array.isArray(highlights) || highlights.length < 5 || highlights.length > 7) {
      console.error(`❌ Contract violation: key_highlights has ${Array.isArray(highlights) ? highlights.length : "non-array"} items (expected 5-7)`);
      process.exit(1);
    }

    const difficulty = parsed.estimated_difficulty;
    if (!["beginner", "intermediate", "advanced"].includes(difficulty as string)) {
      console.error(`❌ Contract violation: estimated_difficulty = "${difficulty}"`);
      process.exit(1);
    }

    console.log("📋 Analyst output (contract validated):");
    console.log(`   core_concept:          ${parsed.core_concept}`);
    console.log(`   topic_category:        ${parsed.topic_category}`);
    console.log(`   estimated_difficulty:  ${parsed.estimated_difficulty}`);
    console.log(`   key_highlights (${highlights.length}):    ✅`);
    highlights.forEach((h, i) => console.log(`     ${i + 1}. ${h}`));
    console.log();
    console.log("✅ All contract checks passed. Kimi K2 via OpenRouter is working.");

  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`❌ Failed after ${elapsed}s:`);
    console.error(err);
    process.exit(1);
  }
}

runTest();
