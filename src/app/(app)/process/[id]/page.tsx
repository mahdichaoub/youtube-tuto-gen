"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const esRef = useRef<EventSource | null>(null);

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
          setActiveReportId(null);
          es.close();
          setTimeout(() => router.push(`/report/${event.report_id}`), 600);
        } else if (event.type === "error") {
          setErrorMsg(event.message);
          setActiveReportId(null);
          es.close();
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setErrorMsg("Lost connection. Please try again.");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [id, router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive text-center max-w-sm">{errorMsg}</p>
        <Button asChild variant="outline">
          <Link href="/home">Try again</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-2">
        <h1 className="text-xl font-semibold mb-6 text-center">Processing your video...</h1>

        {warning && (
          <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 mb-4 text-center">
            {warning}
          </div>
        )}

        {STAGE_ORDER.map((stage) => {
          const step = steps[stage] ?? { status: "idle" as const };
          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-6 flex-shrink-0 flex items-center justify-center">
                {step.status === "complete" ? (
                  <span className="text-green-500">✓</span>
                ) : step.status === "running" ? (
                  <span className="animate-spin text-primary">⟳</span>
                ) : (
                  <span className="text-muted-foreground/30">○</span>
                )}
              </div>
              <span
                className={
                  step.status === "complete"
                    ? "text-sm text-green-600 font-medium"
                    : step.status === "running"
                      ? "text-sm font-medium"
                      : "text-sm text-muted-foreground"
                }
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
