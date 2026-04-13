"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HighlightsTabProps {
  highlights: {
    items: string[];
  };
}

export function HighlightsTab({ highlights }: HighlightsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Highlights</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 list-none">
          {highlights.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
