import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userApiKeys, userModelConfig } from "@/lib/schema";
import { encryptApiKey } from "@/lib/models/client";
import { PROVIDERS } from "@/lib/models/registry";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const provider = typeof body.provider === "string" ? body.provider : null;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : null;

  if (!provider || !Object.values(PROVIDERS).includes(provider as never)) {
    return NextResponse.json({ error: "invalid_provider", message: "Invalid provider." }, { status: 400 });
  }
  if (!apiKey || apiKey.length < 8) {
    return NextResponse.json({ error: "invalid_key", message: "API key is too short." }, { status: 400 });
  }

  const encrypted = encryptApiKey(apiKey);
  const maskedKey = "••••" + apiKey.slice(-4);

  await db
    .insert(userApiKeys)
    .values({
      userId: session.user.id,
      provider,
      keyHash: encrypted,
    })
    .onConflictDoUpdate({
      target: [userApiKeys.userId, userApiKeys.provider],
      set: { keyHash: encrypted, updatedAt: new Date() },
    });

  return NextResponse.json({ provider, maskedKey });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const provider = typeof body.provider === "string" ? body.provider : null;
  if (!provider) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }

  await db
    .delete(userApiKeys)
    .where(
      and(eq(userApiKeys.userId, session.user.id), eq(userApiKeys.provider, provider))
    );

  // Clear provider from model config if it was the primary or fallback
  const configRows = await db
    .select()
    .from(userModelConfig)
    .where(eq(userModelConfig.userId, session.user.id))
    .limit(1);

  if (configRows[0]) {
    const cfg = configRows[0];
    const isPrimary = cfg.primaryProvider === provider;
    const isFallback = cfg.fallbackProvider === provider;

    if (isPrimary || isFallback) {
      await db
        .update(userModelConfig)
        .set({
          ...(isPrimary ? { primaryProvider: "anthropic", primaryModel: "claude-sonnet-4-6" } : {}),
          ...(isFallback ? { fallbackProvider: null, fallbackModel: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(userModelConfig.userId, session.user.id));
    }
  }

  return NextResponse.json({ success: true });
}
