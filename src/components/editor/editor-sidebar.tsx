"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checklistFor } from "@/lib/checklists";
import { guidedTasksForStep } from "@/lib/guided-flow";
import { activeReferenceSection, referenceSpans, resolveHighlightRanges, type ReferenceSection } from "@/lib/reference-resume";
import type { RevisionKind, RevisionTree, StepCheck, StepCheckStatus, WorkflowStep } from "@/lib/types";

type ReferenceData = {
  text: string;
  filename: string;
  sections: ReferenceSection[];
};

type SidebarTab = "reference" | "checklist" | "guided";

export function EditorSidebar({
  resumeId,
  step,
  revisionKind,
  tree,
  width,
  onTreeReload,
}: {
  resumeId: string;
  step: WorkflowStep;
  revisionKind: RevisionKind;
  tree: RevisionTree;
  width: number;
  onTreeReload: () => Promise<void>;
}) {
  const [tab, setTab] = useState<SidebarTab>("reference");
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchResumeId, setFetchResumeId] = useState(resumeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (resumeId !== fetchResumeId) {
    setFetchResumeId(resumeId);
    setData(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
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
    [data, step],
  );

  const highlightRanges = useMemo(
    () => (data?.text && data.sections ? resolveHighlightRanges(data.text, data.sections, step, tree) : []),
    [data, step, tree],
  );

  const spans = useMemo(
    () => referenceSpans(data?.text ?? "", data?.sections ?? [], active?.id ?? null, highlightRanges),
    [active?.id, data?.sections, data?.text, highlightRanges],
  );

  const checklist = checklistFor(step, revisionKind);
  const guidedTasks = useMemo(() => guidedTasksForStep(step, tree), [step, tree]);
  const checkMap = useMemo(() => {
    const map = new Map<string, StepCheck>();
    for (const check of tree.checks ?? []) {
      if (check.step_id !== step.id) continue;
      map.set(check.task_key, check);
    }
    return map;
  }, [step.id, tree.checks]);
  const [savingTask, setSavingTask] = useState<string | null>(null);

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
        <SidebarTabButton active={tab === "guided"} onClick={() => setTab("guided")}>
          Guided flow
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
      ) : tab === "checklist" ? (
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
      ) : (
        <GuidedFlowPanel
          revisionId={tree.revision.id}
          stepId={step.id}
          tasks={guidedTasks}
          checkMap={checkMap}
          savingTask={savingTask}
          onSave={async (taskKey, status) => {
            setSavingTask(taskKey);
            await fetch(`/api/revisions/${tree.revision.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ check: { stepId: step.id, taskKey, status } }),
            });
            await onTreeReload();
            setSavingTask(null);
          }}
        />
      )}
    </aside>
  );
}

function GuidedFlowPanel({
  revisionId,
  stepId,
  tasks,
  checkMap,
  savingTask,
  onSave,
}: {
  revisionId: string;
  stepId: string;
  tasks: { key: string; prompt: string; hint?: string }[];
  checkMap: Map<string, StepCheck>;
  savingTask: string | null;
  onSave: (taskKey: string, status: StepCheckStatus) => Promise<void>;
}) {
  const completed = tasks.filter((task) => checkMap.get(task.key)?.status === "yes").length;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {completed}/{tasks.length} checks confirmed for `{stepId}`.
      </div>
      <div className="space-y-3">
        {tasks.map((task) => {
          const status = checkMap.get(task.key)?.status ?? "skip";
          const busy = savingTask === task.key;
          return (
            <div key={`${revisionId}:${task.key}`} className="rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm font-medium text-foreground">{task.prompt}</p>
              {task.hint ? <p className="mt-1 text-xs text-muted-foreground">{task.hint}</p> : null}
              <div className="mt-2 flex gap-2">
                <TaskButton active={status === "yes"} onClick={() => onSave(task.key, "yes")} disabled={busy}>
                  Yes
                </TaskButton>
                <TaskButton active={status === "needs_edit"} onClick={() => onSave(task.key, "needs_edit")} disabled={busy}>
                  No / Edit
                </TaskButton>
                <TaskButton active={status === "skip"} onClick={() => onSave(task.key, "skip")} disabled={busy}>
                  Skip
                </TaskButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
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
