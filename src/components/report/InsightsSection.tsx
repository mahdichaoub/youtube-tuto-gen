"use client";

import { useState } from "react";

const ACCENT_COLORS = [
  "border-l-violet-500",
  "border-l-purple-500",
  "border-l-pink-500",
];

interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
  deep_dive?: string;
  how_to_apply?: string[];
}

interface InsightsSectionProps {
  insights: KeyInsight[];
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!insights || insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        ⚡ 3 Insights That Change How You Build
      </p>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const isOpen = openIndex === i;
          const hasExpansion = insight.deep_dive || (insight.how_to_apply && insight.how_to_apply.length > 0);

          return (
            <div
              key={i}
              className={`rounded-lg bg-background border-l-4 ${ACCENT_COLORS[i % 3]} p-4 space-y-1.5`}
            >
              <p className="text-sm font-semibold leading-snug">{insight.claim}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/70 font-medium">Example: </span>
                {insight.example}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground/70 font-medium">Avoids: </span>
                {insight.mistake}
              </p>

              {hasExpansion && (
                <>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="text-xs font-medium text-primary hover:underline mt-1 flex items-center gap-1"
                  >
                    {isOpen ? "Hide" : "How to apply"}{" "}
                    <span className={`transition-transform inline-block ${isOpen ? "rotate-90" : ""}`}>›</span>
                  </button>

                  {isOpen && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {insight.deep_dive && (
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          {insight.deep_dive}
                        </p>
                      )}
                      {insight.how_to_apply && insight.how_to_apply.length > 0 && (
                        <ol className="space-y-1">
                          {insight.how_to_apply.map((step, j) => (
                            <li key={j} className="flex gap-2 text-xs text-foreground/80">
                              <span className="font-semibold text-primary flex-shrink-0">
                                {j + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
