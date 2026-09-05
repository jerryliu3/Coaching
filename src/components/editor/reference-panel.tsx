"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { activeReferenceSection, type ReferenceSection } from "@/lib/reference-resume";
import type { WorkflowStep } from "@/lib/types";

type ReferenceData = {
  text: string;
  filename: string;
  sections: ReferenceSection[];
};

export function ReferencePanel({
  resumeId,
  step,
}: {
  resumeId: string;
  step: WorkflowStep;
}) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/resumes/${resumeId}/reference`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const active = useMemo(
    () => (data?.sections ? activeReferenceSection(data.sections, step) : null),
    [data?.sections, step],
  );

  const blocks = useMemo(() => {
    if (!data?.text) return [] as { id: string; label: string; content: string; active: boolean }[];
    if (!data.sections.length) {
      return [{ id: "all", label: "Resume", content: data.text, active: true }];
    }
    return data.sections.map((s) => ({
      id: s.id,
      label: s.label,
      content: data.text.slice(s.start, s.end),
      active: active?.id === s.id,
    }));
  }, [active?.id, data]);

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">Original reference</p>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : data?.filename || "Upload a resume to see the source"}
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        {!data?.text ? (
          <p className="text-sm text-muted-foreground">
            The uploaded DOCX/PDF appears here. Sections highlight as you move through the editor.
          </p>
        ) : (
          <div className="space-y-3 font-mono text-[11px] leading-relaxed">
            {blocks.map((block) => (
              <div
                key={block.id}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  block.active
                    ? "border-primary/50 bg-primary/8 ring-1 ring-primary/20"
                    : "border-transparent bg-muted/20 opacity-70"
                }`}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {block.label}
                </p>
                <pre className="whitespace-pre-wrap font-sans text-xs text-foreground">{block.content.trim()}</pre>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
