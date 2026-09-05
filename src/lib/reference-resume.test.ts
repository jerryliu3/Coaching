import { describe, expect, it } from "vitest";
import {
  activeReferenceSection,
  buildReferenceSections,
  referenceSpans,
  resolveHighlightRanges,
} from "./reference-resume";
import { entryMatchStrings } from "./reference-snapshot";
import type { Entry, RevisionTree } from "./types";

describe("reference-resume", () => {
  it("splits text into sections and highlights the active step", () => {
    const text = `Jane Doe\njane@x.com\n\nWork Experience\nAcme Corp\n- Built APIs\n\nEducation\nUofT`;
    const sections = buildReferenceSections(text);
    expect(sections.some((s) => s.kind === "experience")).toBe(true);
    const active = activeReferenceSection(sections, { id: "experience/0", kind: "experience", label: "Job", entryIndex: 0 });
    expect(active?.kind).toBe("experience");
  });

  it("renders the document once without repeating section headings", () => {
    const text = `Jane Doe\njane@x.com\n\nSKILLS\nPython\n\nWORK EXPERIENCE\nAcme\n- Built it`;
    const sections = buildReferenceSections(text);
    const spans = referenceSpans(text, sections, sections.find((s) => s.kind === "skills")?.id ?? null);
    const rendered = spans.map((s) => s.text).join("");
    expect(rendered).toBe(text);
    expect(rendered.match(/SKILLS/g)?.length).toBe(1);
  });

  it("highlights only populated entry strings for a job", () => {
    const text = `Header\n\nWORK EXPERIENCE\nAvoca AI\nFebruary 2026 - Present\nSoftware Engineer\n- Built triage\n\nGoogle LLC\nAugust 2021\n- Ads work`;
    const sections = buildReferenceSections(text);
    const entry = {
      id: "1",
      org_name: "Avoca AI",
      role_title: "Software Engineer",
      location: "",
      start_date: "February 2026",
      end_date: "Present",
      meta: {
        reference: {
          org_name: "Avoca AI",
          role_title: "Software Engineer",
          start_date: "February 2026",
          end_date: "Present",
          bullets: ["Built triage"],
        },
      },
      bullets: [{ original_text: "Built triage", current_text: "Built triage" }],
    } as Entry;
    const tree = {
      revision: { id: "r1", revision_number: 1, kind: "discovery" },
      contact: {},
      files: [],
      comments: [],
      sections: [
        {
          kind: "experience",
          entries: [entry, { id: "2", org_name: "Google LLC", role_title: "", bullets: [] }],
        },
      ],
    } as unknown as RevisionTree;

    const ranges = resolveHighlightRanges(
      text,
      sections,
      { id: "experience/0", kind: "experience", label: "Avoca AI", entryIndex: 0 },
      tree,
    );
    expect(ranges.length).toBeGreaterThan(0);

    const activeText = referenceSpans(text, sections, null, ranges)
      .filter((span) => span.active)
      .map((span) => span.text)
      .join("");

    expect(activeText).toContain("Avoca AI");
    expect(activeText).toContain("Software Engineer");
    expect(activeText).toContain("Built triage");
    expect(activeText).not.toContain("Google LLC");
    expect(activeText).not.toContain("Ads work");
  });

  it("collects match strings from entry fields and bullets", () => {
    const strings = entryMatchStrings({
      id: "1",
      org_name: "Changed Org",
      role_title: "Changed Role",
      location: "NYC",
      start_date: "2026",
      end_date: "Present",
      meta: {
        reference: {
          org_name: "Avoca AI",
          role_title: "Engineer",
          bullets: ["- Built triage"],
        },
      },
      bullets: [{ original_text: "- Built triage", current_text: "Totally different text" }],
    } as Entry);
    expect(strings).toContain("Avoca AI");
    expect(strings).toContain("Built triage");
    expect(strings).not.toContain("Changed Org");
    expect(strings).not.toContain("Totally different text");
  });

  it("keeps reference highlights fixed after editor changes", () => {
    const text = `Header\n\nWORK EXPERIENCE\nAvoca AI\nFebruary 2026 - Present\nSoftware Engineer\n- Built triage`;
    const sections = buildReferenceSections(text);
    const entry = {
      id: "1",
      org_name: "Renamed Company",
      role_title: "Renamed Role",
      location: "",
      start_date: "February 2026",
      end_date: "Present",
      meta: {
        reference: {
          org_name: "Avoca AI",
          role_title: "Software Engineer",
          start_date: "February 2026",
          end_date: "Present",
          bullets: ["Built triage"],
        },
      },
      bullets: [{ original_text: "Built triage", current_text: "Shipped something else entirely" }],
    } as Entry;
    const tree = {
      revision: { id: "r1", revision_number: 1, kind: "discovery" },
      contact: {},
      files: [],
      comments: [],
      sections: [{ kind: "experience", entries: [entry] }],
    } as unknown as RevisionTree;

    const ranges = resolveHighlightRanges(
      text,
      sections,
      { id: "experience/0", kind: "experience", label: "Avoca AI", entryIndex: 0 },
      tree,
    );

    const activeText = referenceSpans(text, sections, null, ranges)
      .filter((span) => span.active)
      .map((span) => span.text)
      .join("");

    expect(activeText).toContain("Avoca AI");
    expect(activeText).toContain("Software Engineer");
    expect(activeText).toContain("Built triage");
    expect(activeText).not.toContain("Renamed");
    expect(activeText).not.toContain("Shipped something else");
  });
});
