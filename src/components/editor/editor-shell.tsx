"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checklistFor } from "@/lib/checklists";
import { focusCopy } from "@/lib/bullet-flags";
import type { RevisionTree, WorkflowStep } from "@/lib/types";
import { adjacentStep, buildSteps, resolveStep, stepPath } from "@/lib/workflow";
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
  const steps = useMemo(() => buildSteps(tree), [tree]);
  const step = resolveStep(steps, stepId);
  const focus = focusCopy(tree.revision.kind);

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

  return (
    <div className="flex min-h-[70vh] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/resumes/${resumeId}`} className="text-sm underline">
            Overview
          </Link>
          <h1 className="text-xl font-semibold">Revision {revisionNumber}</h1>
          <Badge>{focus.title}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{focus.body}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${s.id === step.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <StepBody tree={tree} step={step} onChange={setTree} onReload={reload} />
        <aside className="space-y-3 rounded-xl border p-4">
          <h2 className="font-medium">Keep in mind</h2>
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            {checklistFor(step, tree.revision.kind).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => go(adjacentStep(steps, step.id, -1))}>
          Previous
        </Button>
        <Button onClick={() => go(adjacentStep(steps, step.id, 1))}>Next</Button>
      </div>
    </div>
  );
}
