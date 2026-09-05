import type { RevisionTree, WorkflowStep } from "./types";
import { contactMatchStrings, entryMatchStrings } from "./reference-snapshot";

export type ReferenceSection = {
  id: string;
  label: string;
  kind: WorkflowStep["kind"] | "header" | "other";
  entryIndex?: number;
  start: number;
  end: number;
};

export type ReferenceSpan = {
  text: string;
  active: boolean;
};

export type HighlightRange = {
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

function isSectionHeading(trimmed: string) {
  return HEADING_PATTERNS.some((h) => h.pattern.test(trimmed)) && trimmed.length < 80;
}

export function buildReferenceSections(text: string): ReferenceSection[] {
  const lines = text.split("\n");
  const sections: ReferenceSection[] = [];
  let offset = 0;
  let current: ReferenceSection | null = null;

  for (const line of lines) {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset = lineEnd + 1;

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isSectionHeading(trimmed)) {
      const heading = HEADING_PATTERNS.find((h) => h.pattern.test(trimmed))!;
      if (current) {
        current.end = lineStart;
        sections.push(current);
      }
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

  const experienceIdx = sections.findIndex((s) => s.kind === "experience");
  if (experienceIdx >= 0) {
    const jobs = splitExperienceJobs(text, sections[experienceIdx]);
    if (jobs.length > 1) {
      sections.splice(experienceIdx, 1, ...jobs);
    } else if (jobs.length === 1) {
      sections[experienceIdx] = jobs[0];
    } else {
      sections[experienceIdx].entryIndex = 0;
    }
  }

  const projectIdx = sections.findIndex((s) => s.kind === "project");
  if (projectIdx >= 0) {
    const projects = splitExperienceJobs(text, sections[projectIdx]);
    if (projects.length > 1) {
      sections.splice(projectIdx, 1, ...projects.map((p, i) => ({ ...p, kind: "project" as const, id: `proj-${i}`, entryIndex: i })));
    } else if (projects.length === 1) {
      sections[projectIdx] = { ...projects[0], kind: "project", id: sections[projectIdx].id, entryIndex: 0 };
    }
  }

  return sections;
}

function looksLikeJobHeader(line: string) {
  const trimmed = line.trim();
  if (!trimmed || /^[-•*]/.test(trimmed)) return false;
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(trimmed)) {
    return false;
  }
  if (/\b(19|20)\d{2}\b/.test(trimmed) && /present|–|-/.test(trimmed)) return false;
  return true;
}

function splitExperienceJobs(fullText: string, section: ReferenceSection): ReferenceSection[] {
  const body = fullText.slice(section.start, section.end);
  const lines = body.split("\n");
  const jobs: ReferenceSection[] = [];
  let lineOffset = section.start;
  let chunkStart = section.start;
  let chunkEnd = section.start;
  let chunk: string[] = [];

  const flush = () => {
    const joined = chunk.join("\n").trim();
    const withoutHeading = joined.replace(/^(work experience|projects?)\s*/i, "").trim();
    if (!withoutHeading) {
      chunk = [];
      chunkStart = lineOffset;
      chunkEnd = lineOffset;
      return;
    }
    jobs.push({
      id: `exp-${jobs.length}`,
      label: withoutHeading.split("\n").find((l) => l.trim())?.trim() || `Role ${jobs.length + 1}`,
      kind: section.kind,
      entryIndex: jobs.length,
      start: chunkStart,
      end: chunkEnd,
    });
    chunk = [];
    chunkStart = lineOffset;
    chunkEnd = lineOffset;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineStart = lineOffset;
    const lineEnd = lineOffset + line.length;
    lineOffset = lineEnd + 1;

    if (!line.trim()) {
      let next = index + 1;
      while (next < lines.length && !lines[next].trim()) next++;
      const nextLine = lines[next]?.trim() ?? "";
      if (chunk.length > 0 && nextLine && looksLikeJobHeader(nextLine)) {
        flush();
      }
      continue;
    }

    if (!chunk.length) chunkStart = lineStart;
    chunk.push(line);
    chunkEnd = lineEnd;
  }

  if (chunk.length) flush();
  return jobs;
}

function sectionKindBounds(sections: ReferenceSection[], kind: ReferenceSection["kind"]) {
  const matches = sections.filter((s) => s.kind === kind);
  if (!matches.length) return null;
  return {
    start: Math.min(...matches.map((s) => s.start)),
    end: Math.max(...matches.map((s) => s.end)),
  };
}

function findStringRange(text: string, needle: string, start: number, end: number): HighlightRange | null {
  const trimmed = needle.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const variants = [trimmed];
  if (!/^[-•*]/.test(trimmed)) {
    variants.push(`- ${trimmed}`, `• ${trimmed}`, `* ${trimmed}`);
  }

  for (const variant of variants) {
    const idx = text.indexOf(variant, start);
    if (idx >= 0 && idx + variant.length <= end) {
      return { start: idx, end: idx + variant.length };
    }
  }

  const segment = text.slice(start, end);
  const offset = segment.indexOf(trimmed);
  if (offset >= 0) {
    return { start: start + offset, end: start + offset + trimmed.length };
  }

  return null;
}

export function findEntryStringRanges(
  text: string,
  strings: string[],
  bounds: { start: number; end: number },
): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const needle of strings) {
    const range = findStringRange(text, needle, bounds.start, bounds.end);
    if (range) ranges.push(range);
  }
  return ranges;
}

export function resolveHighlightRanges(
  text: string,
  sections: ReferenceSection[],
  step: WorkflowStep,
  tree?: Pick<RevisionTree, "sections" | "contact">,
): HighlightRange[] {
  const active = activeReferenceSection(sections, step);
  if (!active || !tree) return [];

  if (step.kind === "contact") {
    const header = sections.find((s) => s.kind === "header");
    const contactSection = sections.find((s) => s.kind === "contact");
    const bounds = {
      start: header?.start ?? 0,
      end: contactSection?.end ?? active.end,
    };
    return findEntryStringRanges(text, contactMatchStrings(tree.contact), bounds);
  }

  const entryKinds = ["experience", "project", "education", "extracurricular", "patents"] as const;
  if (entryKinds.includes(step.kind as (typeof entryKinds)[number])) {
    const sectionData = tree.sections.find((s) => s.kind === step.kind);
    const entry = sectionData?.entries[step.entryIndex ?? 0];
    if (!entry) return [];

    const jobSection =
      sections.find((s) => s.kind === step.kind && s.entryIndex === (step.entryIndex ?? 0)) ??
      sections.find((s) => s.kind === step.kind);
    const kindBounds = sectionKindBounds(sections, step.kind);
    const bounds = {
      start: jobSection?.start ?? kindBounds?.start ?? active.start,
      end: jobSection?.end ?? kindBounds?.end ?? active.end,
    };

    return findEntryStringRanges(text, entryMatchStrings(entry), bounds);
  }

  if (step.kind === "skills") {
    const sectionData = tree.sections.find((s) => s.kind === "skills");
    const entries = sectionData?.entries ?? [];
    if (!entries.length) return [];

    const section = sections.find((s) => s.kind === "skills");
    const bounds = {
      start: section?.start ?? active.start,
      end: section?.end ?? active.end,
    };
    const strings = entries.flatMap((entry) => entryMatchStrings(entry));
    return findEntryStringRanges(text, strings, bounds);
  }

  return [];
}

/** Non-overlapping spans for rendering the full document once, with highlighted ranges. */
export function referenceSpans(
  text: string,
  sections: ReferenceSection[],
  activeId: string | null,
  highlightRanges?: HighlightRange[] | null,
): ReferenceSpan[] {
  if (!text) return [];

  if (highlightRanges?.length) {
    const points = new Set<number>([0, text.length]);
    for (const range of highlightRanges) {
      points.add(Math.max(0, range.start));
      points.add(Math.min(text.length, range.end));
    }

    const sorted = [...points].sort((a, b) => a - b);
    const spans: ReferenceSpan[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (end <= start) continue;
      const active = highlightRanges.some((range) => range.start <= start && range.end >= end);
      spans.push({ text: text.slice(start, end), active });
    }
    return spans.filter((s) => s.text.length > 0);
  }

  if (!sections.length) return [{ text, active: true }];

  const sorted = [...sections].sort((a, b) => a.start - b.start);
  const spans: ReferenceSpan[] = [];
  let pos = 0;

  for (const section of sorted) {
    const start = Math.max(section.start, pos);
    const end = Math.max(start, section.end);
    if (start > pos) spans.push({ text: text.slice(pos, start), active: false });
    if (end > start) spans.push({ text: text.slice(start, end), active: section.id === activeId });
    pos = end;
  }

  if (pos < text.length) spans.push({ text: text.slice(pos), active: false });
  return spans.filter((s) => s.text.length > 0);
}

export function activeReferenceSection(sections: ReferenceSection[], step: WorkflowStep): ReferenceSection | null {
  if (step.kind === "upload" || step.kind === "format" || step.kind === "export") return null;
  if (step.kind === "contact") return sections.find((s) => s.kind === "header" || s.kind === "contact") ?? null;
  if (
    step.kind === "experience" ||
    step.kind === "project" ||
    step.kind === "education" ||
    step.kind === "skills" ||
    step.kind === "extracurricular" ||
    step.kind === "patents"
  ) {
    return (
      sections.find((s) => s.kind === step.kind && s.entryIndex === (step.entryIndex ?? 0)) ??
      sections.find((s) => s.kind === step.kind) ??
      null
    );
  }
  return sections.find((s) => s.kind === step.kind) ?? null;
}
