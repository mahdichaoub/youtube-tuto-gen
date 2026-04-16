import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userModelConfig, userApiKeys } from "@/lib/schema";
import { PROVIDERS } from "@/lib/models/registry";

const DEFAULTS = {
  primaryProvider: "anthropic",
  primaryModel: "claude-sonnet-4-6",
  fallbackProvider: null as string | null,
  fallbackModel: null as string | null,
  dailyCostLimitUsd: 5.0,
  timeoutMs: 120000,
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [configRows, keyRows] = await Promise.all([
    db
      .select()
      .from(userModelConfig)
      .where(eq(userModelConfig.userId, session.user.id))
      .limit(1),
    db
      .select({ provider: userApiKeys.provider })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, session.user.id)),
  ]);

  const savedProviders = keyRows.map((r) => r.provider);

  if (!configRows[0]) {
    return NextResponse.json({ ...DEFAULTS, savedProviders });
  }

  const cfg = configRows[0];
  return NextResponse.json({
    primaryProvider: cfg.primaryProvider,
    primaryModel: cfg.primaryModel,
    fallbackProvider: cfg.fallbackProvider ?? null,
    fallbackModel: cfg.fallbackModel ?? null,
    dailyCostLimitUsd: parseFloat(cfg.dailyCostLimitUsd ?? "5.0"),
    timeoutMs: cfg.timeoutMs,
    savedProviders,
  });
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
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const primaryProvider = typeof body.primaryProvider === "string" ? body.primaryProvider : null;
  const primaryModel = typeof body.primaryModel === "string" ? body.primaryModel.trim() : null;

  if (!primaryProvider || !Object.values(PROVIDERS).includes(primaryProvider as never)) {
    return NextResponse.json({ error: "invalid_provider", message: "Invalid primary provider." }, { status: 400 });
  }
  if (!primaryModel) {
    return NextResponse.json({ error: "invalid_model", message: "Primary model is required." }, { status: 400 });
  }

  const fallbackProvider =
    typeof body.fallbackProvider === "string" && body.fallbackProvider
      ? body.fallbackProvider
      : null;
  const fallbackModel =
    typeof body.fallbackModel === "string" && body.fallbackModel.trim()
      ? body.fallbackModel.trim()
      : null;

  const rawLimit = parseFloat(String(body.dailyCostLimitUsd ?? "5.0"));
  const dailyCostLimitUsd = isNaN(rawLimit) || rawLimit < 0 ? 5.0 : Math.min(rawLimit, 1000);

  const rawTimeout = parseInt(String(body.timeoutMs ?? "120000"), 10);
  const timeoutMs = isNaN(rawTimeout) || rawTimeout < 5000 ? 120000 : Math.min(rawTimeout, 600000);

  await db
    .insert(userModelConfig)
    .values({
      userId: session.user.id,
      primaryProvider,
      primaryModel,
      fallbackProvider,
      fallbackModel,
      dailyCostLimitUsd: dailyCostLimitUsd.toFixed(4),
      timeoutMs,
    })
    .onConflictDoUpdate({
      target: userModelConfig.userId,
      set: {
        primaryProvider,
        primaryModel,
        fallbackProvider,
        fallbackModel,
        dailyCostLimitUsd: dailyCostLimitUsd.toFixed(4),
        timeoutMs,
        updatedAt: new Date(),
      },
    });

  const keyRows = await db
    .select({ provider: userApiKeys.provider })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, session.user.id));

  return NextResponse.json({
    primaryProvider,
    primaryModel,
    fallbackProvider,
    fallbackModel,
    dailyCostLimitUsd,
    timeoutMs,
    savedProviders: keyRows.map((r) => r.provider),
  });
}
