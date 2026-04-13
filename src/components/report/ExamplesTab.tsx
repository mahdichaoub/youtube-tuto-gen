"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExamplesTabProps {
  examples: {
    items: string[];
  };
}

export function ExamplesTab({ examples }: ExamplesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Real Examples</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {examples.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-muted-foreground mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
