"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checklistFor } from "@/lib/checklists";
import { activeReferenceSection, referenceSpans, resolveHighlightRanges, type ReferenceSection } from "@/lib/reference-resume";
import type { RevisionKind, RevisionTree, WorkflowStep } from "@/lib/types";

type ReferenceData = {
  text: string;
  filename: string;
  sections: ReferenceSection[];
};

type SidebarTab = "reference" | "checklist";

export function EditorSidebar({
  resumeId,
  step,
  revisionKind,
  tree,
  width,
}: {
  resumeId: string;
  step: WorkflowStep;
  revisionKind: RevisionKind;
  tree: RevisionTree;
  width: number;
}) {
  const [tab, setTab] = useState<SidebarTab>("reference");
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const highlightRanges = useMemo(
    () => (data?.text && data.sections ? resolveHighlightRanges(data.text, data.sections, step, tree) : []),
    [data?.sections, data?.text, step, tree],
  );

  const spans = useMemo(
    () => referenceSpans(data?.text ?? "", data?.sections ?? [], active?.id ?? null, highlightRanges),
    [active?.id, data?.sections, data?.text, highlightRanges],
  );

  const checklist = checklistFor(step, revisionKind);

  useEffect(() => {
    if (tab !== "reference") return;
    const container = scrollRef.current;
    const el = container?.querySelector("[data-active-reference]");
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
    container.scrollTop += offset;
  }, [highlightRanges, tab]);

  return (
    <aside
      className="flex h-full max-h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      style={{ width }}
    >
      <div className="flex shrink-0 border-b border-border/60">
        <SidebarTabButton active={tab === "reference"} onClick={() => setTab("reference")}>
          Original reference
        </SidebarTabButton>
        <SidebarTabButton active={tab === "checklist"} onClick={() => setTab("checklist")}>
          Keep in mind
        </SidebarTabButton>
      </div>

      {tab === "reference" ? (
        <>
          <div className="shrink-0 border-b border-border/60 px-4 py-2">
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : data?.filename || "Upload a resume to see the source"}
            </p>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4">
              {!data?.text ? (
                <p className="text-sm text-muted-foreground">
                  The uploaded DOCX/PDF appears here as one document. The section you are editing is highlighted.
                </p>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                  {spans.map((span, i) =>
                    span.active ? (
                      <mark
                        key={i}
                        data-active-reference
                        className="rounded-sm bg-primary/15 px-0.5 text-foreground ring-1 ring-primary/25"
                      >
                        {span.text}
                      </mark>
                    ) : (
                      <span key={i}>{span.text}</span>
                    ),
                  )}
                </pre>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ul className="space-y-3 p-4 text-sm leading-relaxed text-muted-foreground">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function SidebarTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-primary bg-primary/5 text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function useResizableSidebar(initialWidth = 380, containerRef?: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const rect = containerRef?.current?.getBoundingClientRect();
      const next = rect ? rect.right - e.clientX : initialWidth;
      setWidth(Math.min(640, Math.max(260, next)));
    },
    [containerRef, initialWidth],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { width, onPointerDown, onPointerMove, onPointerUp };
}
