"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { focusCopy } from "@/lib/bullet-flags";
import type { RevisionTree, WorkflowStep } from "@/lib/types";
import { adjacentStep, buildSteps, resolveStep, stepPath } from "@/lib/workflow";
import { EditorSidebar, useResizableSidebar } from "./editor-sidebar";
import { StepBody } from "./step-body";

export function EditorShell({
  resumeId,
  revisionNumber,
  stepId,
  initialTree,
}: {
  resumeId: string;
  revisionNumber: number;
  stepId: string;
  initialTree: RevisionTree;
}) {
  const router = useRouter();
  const [tree, setTree] = useState(initialTree);
  const [startingRev, setStartingRev] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, onPointerDown, onPointerMove, onPointerUp } = useResizableSidebar(380, containerRef);
  const steps = useMemo(() => buildSteps(tree), [tree]);
  const step = resolveStep(steps, stepId);
  const focus = focusCopy(tree.revision.kind);
  const atLastStep = step.id === steps[steps.length - 1]?.id;

  useEffect(() => {
    fetch(`/api/revisions/${tree.revision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_step: step.id }),
    });
  }, [step.id, tree.revision.id]);

  async function reload() {
    const res = await fetch(`/api/revisions/${tree.revision.id}`);
    const json = await res.json();
    setTree(json.tree);
  }

  function go(next: WorkflowStep) {
    router.push(stepPath(resumeId, revisionNumber, next.id));
  }

  async function handleNext() {
    if (step.kind === "export") {
      if (revisionNumber >= 10) return;
      setStartingRev(true);
      const res = await fetch(`/api/resumes/${resumeId}/revisions`, { method: "POST" });
      const json = await res.json();
      if (json.revision) {
        router.push(stepPath(resumeId, json.revision.revision_number, "upload"));
        router.refresh();
      }
      setStartingRev(false);
      return;
    }
    go(adjacentStep(steps, step.id, 1));
  }

  return (
    <div data-editor-shell className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 px-5 py-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/resumes/${resumeId}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              ← Overview
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <h1 className="text-lg font-semibold tracking-tight">Revision {revisionNumber}</h1>
            <Badge variant="secondary" className="font-normal">{focus.title}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{focus.body}</p>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              s.id === step.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex h-0 min-h-0 flex-1 items-stretch gap-0 overflow-hidden" ref={containerRef}>
        <div className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-2">
          <div className="space-y-4 pb-4">
            <StepBody tree={tree} step={step} onChange={setTree} onReload={reload} />
            <div className="flex justify-between border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => go(adjacentStep(steps, step.id, -1))}>
              Previous
            </Button>
            {step.kind === "export" ? (
              <Button onClick={() => void handleNext()} disabled={startingRev || revisionNumber >= 10}>
                {startingRev ? "Starting…" : revisionNumber >= 10 ? "Max revisions" : `Start revision ${revisionNumber + 1}`}
              </Button>
            ) : (
              <Button onClick={() => go(adjacentStep(steps, step.id, 1))} disabled={atLastStep}>
                Next
              </Button>
            )}
          </div>
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="mx-1 h-full w-1.5 shrink-0 cursor-col-resize self-stretch rounded-full bg-border/80 transition-colors hover:bg-primary/40 active:bg-primary/60"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />

        <EditorSidebar resumeId={resumeId} step={step} revisionKind={tree.revision.kind} tree={tree} width={width} />
      </div>
    </div>
  );
}
