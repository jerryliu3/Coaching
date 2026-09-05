import { describe, expect, it } from "vitest";
import { checklistFor } from "./checklists";
import type { WorkflowStep } from "./types";

const step = (kind: WorkflowStep["kind"], label?: string): WorkflowStep => ({
  id: kind,
  kind,
  label: label ?? kind,
});

describe("checklistFor", () => {
  it("adds discovery prompts on the first revision", () => {
    const items = checklistFor(step("experience", "Acme"), "discovery");
    expect(items.some((i) => i.toLowerCase().includes("open questions"))).toBe(true);
    expect(items.some((i) => i.includes("XYZ"))).toBe(true);
  });

  it("adds comment cleanup on revision two", () => {
    const items = checklistFor(step("experience"), "editing");
    expect(items.some((i) => i.toLowerCase().includes("comments"))).toBe(true);
  });

  it("covers every step kind", () => {
    const kinds: WorkflowStep["kind"][] = [
      "upload",
      "format",
      "contact",
      "experience",
      "project",
      "education",
      "skills",
      "extracurricular",
      "patents",
      "export",
    ];
    for (const kind of kinds) {
      expect(checklistFor(step(kind, kind === "upload" ? "Upload" : kind), "polishing").length).toBeGreaterThan(1);
    }
    expect(checklistFor(step("upload", "Client return"), "editing").some((i) => i.includes("returned"))).toBe(true);
  });
});
