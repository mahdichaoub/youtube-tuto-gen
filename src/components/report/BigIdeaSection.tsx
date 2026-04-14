interface BigIdeaSectionProps {
  coreConcept: string;
  explanation: string;
  bigIdeaPrompt?: string | undefined;
}

export function BigIdeaSection({ coreConcept, explanation, bigIdeaPrompt }: BigIdeaSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        💡 The Big Idea
      </p>
      <p className="text-base font-semibold leading-snug">{coreConcept}</p>
      {bigIdeaPrompt && (
        <p className="text-sm text-muted-foreground italic">{bigIdeaPrompt}</p>
      )}
      {explanation && (
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pt-1">
          {explanation}
        </div>
      )}
    </div>
  );
}
