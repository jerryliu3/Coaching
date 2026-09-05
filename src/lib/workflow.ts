import type { RevisionKind, RevisionTree, WorkflowStep } from "./types";

export function revisionKind(revisionNumber: number): RevisionKind {
  if (revisionNumber <= 1) return "discovery";
  if (revisionNumber === 2) return "editing";
  return "polishing";
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
  const jobs = experience?.entries ?? [];
  if (jobs.length === 0) {
    steps.push({ id: "experience/0", kind: "experience", label: "Experience 1", entryIndex: 0 });
  } else {
    jobs.forEach((entry, index) => {
      steps.push({
        id: `experience/${index}`,
        kind: "experience",
        label: entry.org_name || `Experience ${index + 1}`,
        entryIndex: index,
        entryId: entry.id,
      });
    });
  }

  const projects = tree.sections.find((s) => s.kind === "project");
  const projectEntries = projects?.entries ?? [];
  if (projectEntries.length === 0) {
    steps.push({ id: "project/0", kind: "project", label: "Project 1", entryIndex: 0 });
  } else {
    projectEntries.forEach((entry, index) => {
      steps.push({
        id: `project/${index}`,
        kind: "project",
        label: entry.org_name || `Project ${index + 1}`,
        entryIndex: index,
        entryId: entry.id,
      });
    });
  }

  steps.push({ id: "education", kind: "education", label: "Education" });
  steps.push({ id: "skills", kind: "skills", label: "Skills" });

  const extras = tree.sections.find((s) => s.kind === "extracurricular");
  if (extras && extras.entries.length > 0) {
    steps.push({ id: "extracurricular", kind: "extracurricular", label: "Extracurricular" });
  }
  const patents = tree.sections.find((s) => s.kind === "patents");
  if (patents && patents.entries.length > 0) {
    steps.push({ id: "patents", kind: "patents", label: "Patents" });
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
