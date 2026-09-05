import type { RevisionKind, RevisionTree, WorkflowStep } from "./types";

export function revisionKind(revisionNumber: number): RevisionKind {
  if (revisionNumber <= 1) return "discovery";
  if (revisionNumber === 2) return "editing";
  return "polishing";
}

function entrySteps(
  kind: WorkflowStep["kind"],
  entries: { id: string; org_name: string }[],
  fallbackLabel: string,
): WorkflowStep[] {
  if (entries.length === 0) {
    return [{ id: `${kind}/0`, kind, label: fallbackLabel, entryIndex: 0 }];
  }
  return entries.map((entry, index) => ({
    id: `${kind}/${index}`,
    kind,
    label: entry.org_name?.trim() || `${fallbackLabel} ${index + 1}`,
    entryIndex: index,
    entryId: entry.id,
  }));
}

export function buildSteps(tree: RevisionTree): WorkflowStep[] {
  const steps: WorkflowStep[] = [
    {
      id: "upload",
      kind: "upload",
      label: tree.revision.revision_number === 1 ? "Upload" : "Client return",
    },
    { id: "format", kind: "format", label: "Formatting" },
    { id: "contact", kind: "contact", label: "Contact" },
  ];

  const experience = tree.sections.find((s) => s.kind === "experience");
  steps.push(...entrySteps("experience", experience?.entries ?? [], "Experience"));

  const projects = tree.sections.find((s) => s.kind === "project");
  steps.push(...entrySteps("project", projects?.entries ?? [], "Project"));

  const education = tree.sections.find((s) => s.kind === "education");
  steps.push(...entrySteps("education", education?.entries ?? [], "Education"));

  const skills = tree.sections.find((s) => s.kind === "skills");
  const skillsLabel = skills?.entries.find((e) => e.org_name?.trim())?.org_name?.trim() || "Skills";
  steps.push({ id: "skills", kind: "skills", label: skillsLabel });

  const extras = tree.sections.find((s) => s.kind === "extracurricular");
  if (extras && extras.entries.length > 0) {
    steps.push(...entrySteps("extracurricular", extras.entries, "Extracurricular"));
  }
  const patents = tree.sections.find((s) => s.kind === "patents");
  if (patents && patents.entries.length > 0) {
    steps.push(...entrySteps("patents", patents.entries, "Patents"));
  }

  steps.push({ id: "export", kind: "export", label: "Export" });
  return steps;
}

export function adjacentStep(steps: WorkflowStep[], currentId: string, delta: number) {
  const index = steps.findIndex((s) => s.id === currentId);
  if (index < 0) return steps[0];
  return steps[Math.max(0, Math.min(steps.length - 1, index + delta))];
}

export function resolveStep(steps: WorkflowStep[], id: string) {
  return steps.find((s) => s.id === id) ?? steps[0];
}

export function stepPath(resumeId: string, revisionNumber: number, stepId: string) {
  return `/resumes/${resumeId}/rev/${revisionNumber}/${stepId}`;
}
