"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/sse-labels";
import { useGeneration } from "@/components/GenerationBanner";

interface StepState {
  status: "idle" | "running" | "complete";
}

export default function ProcessPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { setActiveReportId } = useGeneration();

  const [steps, setSteps] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(STAGE_ORDER.map((s) => [s, { status: "idle" }]))
  );
  const [warning, setWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const completedCount = STAGE_ORDER.filter(
    (s) => steps[s]?.status === "complete"
  ).length;
  const progressPct = Math.round((completedCount / STAGE_ORDER.length) * 100);
  const currentStage = STAGE_ORDER.find((s) => steps[s]?.status === "running");

  useEffect(() => {
    const es = new EventSource(`/api/analyze/${id}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if ("stage" in event) {
          setSteps((prev) => ({
            ...prev,
            [event.stage]: { status: event.status as "running" | "complete" },
          }));
        } else if (event.type === "warning") {
          setWarning(event.message);
          setTimeout(() => setWarning(null), 5000);
        } else if (event.type === "done") {
          setSteps((prev) => ({ ...prev, complete: { status: "complete" } }));
          setIsDone(true);
          setActiveReportId(null);
          es.close();
          setTimeout(() => router.push(`/report/${event.report_id}`), 900);
        } else if (event.type === "error") {
          setErrorMsg(event.message);
          setActiveReportId(null);
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setErrorMsg("Connection lost. Please try again.");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [id, router, setActiveReportId]);

  if (errorMsg) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-14 h-14 rounded-full border border-destructive/40 bg-destructive/10 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-destructive">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v5M12 15.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center max-w-sm">
          <p className="text-foreground font-medium mb-1">Something went wrong</p>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
        </div>
        <Link
          href="/home"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[280px] pointer-events-none transition-all duration-1000"
        style={{
          background: isDone
            ? "radial-gradient(ellipse at 50% 0%, oklch(0.65 0.22 140 / 12%) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 0%, oklch(0.78 0.18 75 / 8%) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[320px] animate-fade-up">
        {/* Status header */}
        <div className="text-center mb-10">
          {isDone ? (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 animate-step-complete">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-serif italic text-xl text-foreground">Report ready</p>
              <p className="text-muted-foreground text-xs mt-1.5">Navigating to your report…</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5 animate-step-pulse">
                <span className="font-serif italic text-primary text-xl font-bold">LA</span>
              </div>
              <p className="font-serif italic text-xl text-foreground">
                {currentStage ? STAGE_LABELS[currentStage] : "Initializing…"}
              </p>
              <p className="text-muted-foreground text-xs mt-1.5">
                This usually takes under 90 seconds
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-px w-full bg-border/40 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: isDone ? "oklch(0.65 0.22 140)" : "oklch(0.78 0.18 75)",
            }}
          />
        </div>

        {/* Steps list */}
        <div className="space-y-0.5">
          {STAGE_ORDER.map((stage, idx) => {
            const step = steps[stage] ?? { status: "idle" as const };
            const isLast = idx === STAGE_ORDER.length - 1;

            return (
              <div key={stage} className="relative">
                {/* Connector */}
                {!isLast && (
                  <div
                    className="absolute left-[17px] top-[36px] w-px h-2 transition-colors duration-500"
                    style={{
                      background:
                        step.status === "complete"
                          ? "oklch(0.78 0.18 75 / 35%)"
                          : "oklch(0.22 0.008 265)",
                    }}
                  />
                )}

                <div
                  className={`flex items-center gap-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                    step.status === "running"
                      ? "bg-primary/8 border border-primary/20"
                      : ""
                  }`}
                >
                  {/* State dot */}
                  <div
                    className={`w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-400 ${
                      step.status === "complete"
                        ? "bg-primary"
                        : step.status === "running"
                          ? "border border-primary/60 bg-primary/10 animate-step-pulse"
                          : "border border-border/40"
                    }`}
                  >
                    {step.status === "complete" ? (
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="animate-step-complete text-primary-foreground">
                        <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : step.status === "running" ? (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-border/50" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`flex-1 text-sm transition-all duration-300 ${
                      step.status === "complete"
                        ? "text-muted-foreground line-through decoration-muted-foreground/30"
                        : step.status === "running"
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </span>

                  {/* Bouncing bars for active step */}
                  {step.status === "running" && (
                    <div className="flex items-end gap-0.5 h-3.5 flex-shrink-0">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-primary rounded-full animate-bounce"
                          style={{
                            height: `${6 + i * 3}px`,
                            animationDelay: `${i * 110}ms`,
                            animationDuration: "0.75s",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning */}
        {warning && (
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 text-xs text-primary/80 animate-fade-in">
            {warning}
          </div>
        )}
      </div>
    </div>
  );
}
