interface BigIdeaSectionProps {
  coreConcept: string;
  explanation: string;
  bigIdeaPrompt?: string;
  analogy?: string;
  commonMistake?: string;
}

export function BigIdeaSection({
  coreConcept,
  explanation,
  bigIdeaPrompt,
  analogy,
  commonMistake,
}: BigIdeaSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        💡 The Big Idea
      </p>
      <p className="text-base font-semibold leading-snug">{coreConcept}</p>

      {bigIdeaPrompt && (
        <p className="text-sm text-muted-foreground italic">{bigIdeaPrompt}</p>
      )}

      {explanation && (
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {explanation}
        </div>
      )}

      {analogy && (
        <div className="rounded-lg bg-muted/60 border border-border px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The Analogy
          </p>
          <p className="text-sm leading-relaxed text-foreground/80 italic">{analogy}</p>
        </div>
      )}

      {commonMistake && (
        <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Where People Go Wrong
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{commonMistake}</p>
        </div>
      )}
    </div>
  );
}
