import { describe, expect, it } from "vitest";
import { activeReferenceSection, buildReferenceSections } from "./reference-resume";

describe("reference-resume", () => {
  it("splits text into sections and highlights the active step", () => {
    const text = `Jane Doe\njane@x.com\n\nWork Experience\nAcme Corp\n- Built APIs\n\nEducation\nUofT`;
    const sections = buildReferenceSections(text);
    expect(sections.some((s) => s.kind === "experience")).toBe(true);
    const active = activeReferenceSection(sections, { id: "experience/0", kind: "experience", label: "Job", entryIndex: 0 });
    expect(active?.kind).toBe("experience");
  });
});
