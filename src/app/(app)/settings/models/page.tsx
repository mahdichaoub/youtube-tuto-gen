"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODEL_REGISTRY, PROVIDERS } from "@/lib/models/registry";
import type { Provider } from "@/lib/models/registry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelSettings {
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  dailyCostLimitUsd: number;
  timeoutMs: number;
  savedProviders: string[];
}

type TestStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok" }
  | { state: "error"; message: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";

type KeyStatus =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; maskedKey: string }
  | { state: "error"; message: string };

type DeleteStatus = "idle" | "deleting" | "deleted" | "error";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  groq: "Groq",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  moonshot: "Moonshot (Kimi)",
};

function providerLabel(p: string) {
  return PROVIDER_LABELS[p] ?? p;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// ─── Model selector ───────────────────────────────────────────────────────────

function ModelSelector({
  idPrefix,
  provider,
  model,
  onProviderChange,
  onModelChange,
}: {
  idPrefix: string;
  provider: string;
  model: string;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
}) {
  const models = MODEL_REGISTRY[provider as Provider] ?? [];
  const isOpenRouter = provider === "openrouter";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-provider`}>Provider</Label>
        <select
          id={`${idPrefix}-provider`}
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className={selectClass}
        >
          {Object.values(PROVIDERS).map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-model`}>Model</Label>
        {isOpenRouter ? (
          <Input
            id={`${idPrefix}-model`}
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="e.g. meta-llama/llama-3-8b-instruct"
          />
        ) : (
          <select
            id={`${idPrefix}-model`}
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className={selectClass}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── API key row ──────────────────────────────────────────────────────────────

function ApiKeyRow({
  provider,
  isSaved,
  keyStatus,
  deleteStatus,
  testStatus,
  onSaveKey,
  onDeleteKey,
  onTest,
}: {
  provider: string;
  isSaved: boolean;
  keyStatus: KeyStatus;
  deleteStatus: DeleteStatus;
  testStatus: TestStatus;
  onSaveKey: (provider: string, apiKey: string) => void;
  onDeleteKey: (provider: string) => void;
  onTest: (provider: string, apiKey: string) => void;
}) {
  const [keyInput, setKeyInput] = useState("");

  const placeholder =
    keyStatus.state === "saved"
      ? keyStatus.maskedKey
      : isSaved
      ? "Key saved — type to replace"
      : "sk-…";

  return (
    <div className="space-y-2">
      <Label htmlFor={`key-${provider}`}>
        {providerLabel(provider)} API Key
      </Label>
      <div className="flex gap-2">
        <Input
          id={`key-${provider}`}
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
          autoComplete="off"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!keyInput.trim() || keyStatus.state === "saving"}
          onClick={() => {
            onSaveKey(provider, keyInput);
            setKeyInput("");
          }}
        >
          {keyStatus.state === "saving" ? "Saving…" : "Save key"}
        </Button>
        {isSaved && (
          <Button
            size="sm"
            variant="ghost"
            disabled={deleteStatus === "deleting"}
            onClick={() => onDeleteKey(provider)}
            className="text-destructive hover:text-destructive"
          >
            {deleteStatus === "deleting" ? "…" : "Delete"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          disabled={testStatus.state === "loading" || (!keyInput.trim() && !isSaved)}
          onClick={() => onTest(provider, keyInput)}
          className="h-7 px-2 text-xs"
        >
          {testStatus.state === "loading" ? "Testing…" : "Test connection"}
        </Button>
        {testStatus.state === "ok" && (
          <span className="text-xs text-green-600">✓ Connected</span>
        )}
        {testStatus.state === "error" && (
          <span className="text-xs text-destructive">{testStatus.message}</span>
        )}
        {keyStatus.state === "saved" && (
          <span className="text-xs text-green-600">✓ Key saved</span>
        )}
        {keyStatus.state === "error" && (
          <span className="text-xs text-destructive">{keyStatus.message}</span>
        )}
        {deleteStatus === "deleted" && (
          <span className="text-xs text-muted-foreground">Key removed</span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ModelSettingsPage() {
  const [loading, setLoading] = useState(true);

  // Form state
  const [primaryProvider, setPrimaryProvider] = useState("anthropic");
  const [primaryModel, setPrimaryModel] = useState("claude-sonnet-4-6");
  const [fallbackProvider, setFallbackProvider] = useState("");
  const [fallbackModel, setFallbackModel] = useState("");
  const [timeoutSec, setTimeoutSec] = useState("120");
  const [dailyLimit, setDailyLimit] = useState("5.00");

  // Status tracking
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [keyStatuses, setKeyStatuses] = useState<Record<string, KeyStatus>>({});
  const [deleteStatuses, setDeleteStatuses] = useState<Record<string, DeleteStatus>>({});
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const [savedProviders, setSavedProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings/models")
      .then((r) => r.json())
      .then((data: ModelSettings) => {
        setPrimaryProvider(data.primaryProvider);
        setPrimaryModel(data.primaryModel);
        setFallbackProvider(data.fallbackProvider ?? "");
        setFallbackModel(data.fallbackModel ?? "");
        setTimeoutSec(String(Math.round(data.timeoutMs / 1000)));
        setDailyLimit(data.dailyCostLimitUsd.toFixed(2));
        setSavedProviders(data.savedProviders);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePrimaryProviderChange = useCallback((p: string) => {
    setPrimaryProvider(p);
    const models = MODEL_REGISTRY[p as Provider] ?? [];
    setPrimaryModel(models[0] ?? "");
  }, []);

  const handleFallbackProviderChange = useCallback((p: string) => {
    setFallbackProvider(p);
    const models = MODEL_REGISTRY[p as Provider] ?? [];
    setFallbackModel(models[0] ?? "");
  }, []);

  const handleSaveKey = useCallback(async (provider: string, apiKey: string) => {
    setKeyStatuses((prev) => ({ ...prev, [provider]: { state: "saving" } }));
    try {
      const res = await fetch("/api/settings/models/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { message?: string }).message ?? "Failed");
      setKeyStatuses((prev) => ({
        ...prev,
        [provider]: { state: "saved", maskedKey: (data as { maskedKey: string }).maskedKey },
      }));
      setSavedProviders((prev) => (prev.includes(provider) ? prev : [...prev, provider]));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save key";
      setKeyStatuses((prev) => ({ ...prev, [provider]: { state: "error", message: msg } }));
    }
  }, []);

  const handleDeleteKey = useCallback(
    async (provider: string) => {
      setDeleteStatuses((prev) => ({ ...prev, [provider]: "deleting" }));
      try {
        const res = await fetch("/api/settings/models/keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        if (!res.ok) throw new Error("Failed to delete");
        setSavedProviders((prev) => prev.filter((p) => p !== provider));
        setKeyStatuses((prev) => ({ ...prev, [provider]: { state: "idle" } }));
        setDeleteStatuses((prev) => ({ ...prev, [provider]: "deleted" }));
        if (provider === primaryProvider) {
          setPrimaryProvider("anthropic");
          setPrimaryModel("claude-sonnet-4-6");
        }
        if (provider === fallbackProvider) {
          setFallbackProvider("");
          setFallbackModel("");
        }
      } catch {
        setDeleteStatuses((prev) => ({ ...prev, [provider]: "error" }));
      }
    },
    [primaryProvider, fallbackProvider]
  );

  const handleTest = useCallback(
    async (provider: string, apiKeyInput: string) => {
      const modelForProvider =
        provider === primaryProvider ? primaryModel : fallbackModel;
      if (!modelForProvider) return;
      setTestStatuses((prev) => ({ ...prev, [provider]: { state: "loading" } }));
      try {
        const res = await fetch("/api/settings/models/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            model: modelForProvider,
            apiKey: apiKeyInput || "__use_saved__",
          }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (data.ok) {
          setTestStatuses((prev) => ({ ...prev, [provider]: { state: "ok" } }));
        } else {
          setTestStatuses((prev) => ({
            ...prev,
            [provider]: { state: "error", message: data.error ?? "Connection failed" },
          }));
        }
      } catch {
        setTestStatuses((prev) => ({
          ...prev,
          [provider]: { state: "error", message: "Connection failed" },
        }));
      }
    },
    [primaryProvider, primaryModel, fallbackModel]
  );

  const handleSaveSettings = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const timeoutMs = Math.max(5000, (parseInt(timeoutSec, 10) || 120) * 1000);
      const dailyCostLimitUsd = parseFloat(dailyLimit) || 5.0;
      const res = await fetch("/api/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryProvider,
          primaryModel,
          fallbackProvider: fallbackProvider || null,
          fallbackModel: fallbackModel || null,
          dailyCostLimitUsd,
          timeoutMs,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Failed");
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [primaryProvider, primaryModel, fallbackProvider, fallbackModel, timeoutSec, dailyLimit]);

  const primaryKeyMissing =
    primaryProvider !== "anthropic" && !savedProviders.includes(primaryProvider);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="px-5 py-6">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="mt-4 h-10 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">AI Model Settings</h1>
        <p className="text-sm text-muted-foreground">
          Choose which AI model powers your reports. New users get Claude Sonnet by default — no setup needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Primary Model ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm font-semibold">Primary Model</p>
            <p className="text-xs text-muted-foreground">Used for all report generation steps.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelSelector
              idPrefix="primary"
              provider={primaryProvider}
              model={primaryModel}
              onProviderChange={handlePrimaryProviderChange}
              onModelChange={setPrimaryModel}
            />
            <ApiKeyRow
              provider={primaryProvider}
              isSaved={savedProviders.includes(primaryProvider)}
              keyStatus={keyStatuses[primaryProvider] ?? { state: "idle" }}
              deleteStatus={deleteStatuses[primaryProvider] ?? "idle"}
              testStatus={testStatuses[primaryProvider] ?? { state: "idle" }}
              onSaveKey={handleSaveKey}
              onDeleteKey={handleDeleteKey}
              onTest={handleTest}
            />
            {primaryProvider === "anthropic" && !savedProviders.includes("anthropic") && (
              <p className="text-xs text-muted-foreground">
                No key needed — using the shared Anthropic key.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Fallback Model ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm font-semibold">
              Fallback Model{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Used automatically if the primary model fails or exceeds your daily limit.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enable-fallback"
                checked={!!fallbackProvider}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setFallbackProvider("");
                    setFallbackModel("");
                  } else {
                    setFallbackProvider("openai");
                    setFallbackModel("gpt-4o-mini");
                  }
                }}
                className="h-4 w-4"
              />
              <Label htmlFor="enable-fallback" className="cursor-pointer font-normal">
                Enable a fallback model
              </Label>
            </div>

            {fallbackProvider && (
              <>
                <ModelSelector
                  idPrefix="fallback"
                  provider={fallbackProvider}
                  model={fallbackModel}
                  onProviderChange={handleFallbackProviderChange}
                  onModelChange={setFallbackModel}
                />
                <ApiKeyRow
                  provider={fallbackProvider}
                  isSaved={savedProviders.includes(fallbackProvider)}
                  keyStatus={keyStatuses[fallbackProvider] ?? { state: "idle" }}
                  deleteStatus={deleteStatuses[fallbackProvider] ?? "idle"}
                  testStatus={testStatuses[fallbackProvider] ?? { state: "idle" }}
                  onSaveKey={handleSaveKey}
                  onDeleteKey={handleDeleteKey}
                  onTest={handleTest}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Fallback Triggers ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm font-semibold">Fallback Triggers</p>
            <p className="text-xs text-muted-foreground">
              API errors always trigger the fallback. Configure thresholds below.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="timeout">Timeout per step (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                min={5}
                max={600}
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Default: 120s</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daily-limit">Daily spending limit (USD)</Label>
              <Input
                id="daily-limit"
                type="number"
                min={0}
                max={1000}
                step={0.5}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Default: $5.00</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Save ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveSettings}
            disabled={saveStatus === "saving" || primaryKeyMissing}
            title={
              primaryKeyMissing
                ? `Add a ${providerLabel(primaryProvider)} API key first`
                : undefined
            }
          >
            {saveStatus === "saving" ? "Saving…" : "Save Settings"}
          </Button>
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600">Settings saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-destructive">Failed to save. Please try again.</span>
          )}
          {primaryKeyMissing && (
            <span className="text-xs text-muted-foreground">
              Add a {providerLabel(primaryProvider)} API key to enable saving
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
