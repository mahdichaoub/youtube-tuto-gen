const ACCENT_COLORS = [
  "border-l-violet-500",
  "border-l-purple-500",
  "border-l-pink-500",
];

interface KeyInsight {
  claim: string;
  example: string;
  mistake: string;
}

interface InsightsSectionProps {
  insights: KeyInsight[];
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        ⚡ 3 Insights That Change How You Build
      </p>
      <div className="space-y-3">
        {insights.map((insight, i) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
