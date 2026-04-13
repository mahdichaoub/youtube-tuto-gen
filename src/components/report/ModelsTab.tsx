"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ModelsTabProps {
  models: {
    items: Array<{ name: string; description: string }>;
  };
}

export function ModelsTab({ models }: ModelsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mental Models</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {models.items.map((model, i) => (
            <div key={i}>
              <p className="font-semibold text-sm mb-1">{model.name}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {model.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
