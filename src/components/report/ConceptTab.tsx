"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConceptTabProps {
  concept: {
    core_concept: string;
    explanation: string;
  };
}

export function ConceptTab({ concept }: ConceptTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{concept.core_concept}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {concept.explanation}
        </p>
      </CardContent>
    </Card>
  );
}
