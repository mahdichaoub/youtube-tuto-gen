import { headers } from "next/headers";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { loadUserModelConfig } from "@/lib/models/client";

// Zod schema for message validation
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().max(10000, "Message text too long").optional(),
});

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(messagePartSchema).optional(),
  content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).max(100, "Too many messages"),
});

export async function POST(req: Request) {
  // Verify user is authenticated
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { messages } = parsed.data as { messages: UIMessage[] };

  // Load model from user config — falls back to Anthropic → Moonshot → OpenRouter
  // based on whichever server API keys are set. No hardcoded provider.
  let modelConfig;
  try {
    modelConfig = await loadUserModelConfig(session.user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load model config";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = streamText({
    model: modelConfig.primary,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
