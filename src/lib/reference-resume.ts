import type { WorkflowStep } from "./types";

export type ReferenceSection = {
  id: string;
  label: string;
  kind: WorkflowStep["kind"] | "header" | "other";
  entryIndex?: number;
  start: number;
  end: number;
};

const HEADING_PATTERNS: { kind: ReferenceSection["kind"]; pattern: RegExp }[] = [
  { kind: "contact", pattern: /^(contact|personal information)\b/i },
  { kind: "education", pattern: /^(education|academic)\b/i },
  { kind: "experience", pattern: /^(work experience|experience|employment|professional experience|internships?)\b/i },
  { kind: "project", pattern: /^(projects?|selected projects?)\b/i },
  { kind: "skills", pattern: /^(skills|technical skills|competencies)\b/i },
  { kind: "extracurricular", pattern: /^(extracurricular|activities|leadership)\b/i },
  { kind: "patents", pattern: /^(patents?|publications?)\b/i },
];

export function buildReferenceSections(text: string): ReferenceSection[] {
  const lines = text.split("\n");
  const sections: ReferenceSection[] = [];
  let offset = 0;
  let current: ReferenceSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset = lineEnd + 1;

    const trimmed = line.trim();
    if (!trimmed) continue;

    const heading = HEADING_PATTERNS.find((h) => h.pattern.test(trimmed));
    if (heading && trimmed.length < 80) {
      if (current) sections.push(current);
      current = {
        id: `sec-${sections.length}`,
        label: trimmed,
        kind: heading.kind,
        start: lineStart,
        end: lineEnd,
      };
      continue;
    }

    if (!current) {
      current = {
        id: "header",
        label: "Header",
        kind: "header",
        start: 0,
        end: lineEnd,
      };
    } else {
      current.end = lineEnd;
    }
  }

  if (current) sections.push(current);

  // Split experience blocks by blank lines / company-like headers for entryIndex
  const experience = sections.find((s) => s.kind === "experience");
  if (experience) {
    const block = text.slice(experience.start, experience.end);
    const chunks = block.split(/\n\s*\n/).filter((c) => c.trim());
    if (chunks.length > 1) {
      const idx = sections.indexOf(experience);
      sections.splice(
        idx,
        1,
        ...chunks.map((chunk, entryIndex) => ({
          id: `exp-${entryIndex}`,
          label: chunk.split("\n")[0]?.trim() || `Role ${entryIndex + 1}`,
          kind: "experience" as const,
          entryIndex,
          start: experience.start + block.indexOf(chunk),
          end: experience.start + block.indexOf(chunk) + chunk.length,
        })),
      );
    } else {
      experience.entryIndex = 0;
    }
  }

  const projects = sections.find((s) => s.kind === "project");
  if (projects && projects.entryIndex === undefined) projects.entryIndex = 0;

  return sections;
}

export function activeReferenceSection(sections: ReferenceSection[], step: WorkflowStep): ReferenceSection | null {
  if (step.kind === "upload" || step.kind === "format" || step.kind === "export") return null;
  if (step.kind === "contact") return sections.find((s) => s.kind === "header" || s.kind === "contact") ?? null;
  if (step.kind === "experience" || step.kind === "project") {
    return (
      sections.find((s) => s.kind === step.kind && s.entryIndex === (step.entryIndex ?? 0)) ??
      sections.find((s) => s.kind === step.kind) ??
      null
    );
  }
  return sections.find((s) => s.kind === step.kind) ?? null;
}
