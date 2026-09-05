import { describe, expect, it } from "vitest";
import { adjacentStep, buildSteps, resolveStep, revisionKind, stepPath } from "./workflow";
import { testEntry, testSection, testTree } from "./test-fixtures";

describe("revisionKind", () => {
  it("maps the three editing modes", () => {
    expect(revisionKind(0)).toBe("discovery");
    expect(revisionKind(1)).toBe("discovery");
    expect(revisionKind(2)).toBe("editing");
    expect(revisionKind(3)).toBe("polishing");
    expect(revisionKind(10)).toBe("polishing");
  });
});

describe("buildSteps", () => {
  it("labels upload vs client return by revision number", () => {
    expect(buildSteps(testTree()).find((s) => s.id === "upload")?.label).toBe("Upload");
    expect(buildSteps(testTree({ revision: { ...testTree().revision, revision_number: 2 } })).find((s) => s.id === "upload")?.label).toBe(
      "Client return",
    );
  });

  it("creates a placeholder experience when none exist", () => {
    const steps = buildSteps(testTree({ sections: [] }));
    expect(steps.map((s) => s.id)).toContain("experience/0");
    expect(steps.map((s) => s.id)).toContain("project/0");
    expect(steps.at(-1)?.id).toBe("export");
  });

  it("names steps from org names and includes optional sections", () => {
    const tree = testTree({
      sections: [
        testSection({
          entries: [
            testEntry({ id: "j1", org_name: "Acme" }),
            testEntry({ id: "j2", org_name: "Globex", position: 1 }),
          ],
        }),
        testSection({
          id: "s2",
          kind: "project",
          heading: "Projects",
          entries: [testEntry({ id: "p1", kind: "project", org_name: "Secrets" })],
        }),
        testSection({
          id: "s3",
          kind: "extracurricular",
          heading: "Clubs",
          entries: [testEntry({ id: "x1", kind: "extra", org_name: "Club" })],
        }),
        testSection({
          id: "s4",
          kind: "patents",
          heading: "Patents",
          entries: [testEntry({ id: "pat1", kind: "patent", org_name: "US123" })],
        }),
      ],
    });
    const ids = buildSteps(tree).map((s) => s.id);
    expect(ids).toEqual([
      "upload",
      "format",
      "contact",
      "experience/0",
      "experience/1",
      "project/0",
      "education/0",
      "skills",
      "extracurricular/0",
      "patents/0",
      "export",
    ]);
    expect(buildSteps(tree).find((s) => s.id === "experience/1")?.label).toBe("Globex");
  });

  it("keeps skills as a single step even with multiple entries", () => {
    const tree = testTree({
      sections: [
        testSection({
          id: "skills",
          kind: "skills",
          heading: "Skills",
          entries: [
            testEntry({ id: "sk1", kind: "skill_group", org_name: "Languages" }),
            testEntry({ id: "sk2", kind: "skill_group", org_name: "Tools", position: 1 }),
          ],
        }),
      ],
    });
    const skillSteps = buildSteps(tree).filter((s) => s.kind === "skills");
    expect(skillSteps).toHaveLength(1);
    expect(skillSteps[0]?.id).toBe("skills");
  });
});

describe("step navigation", () => {
  const steps = buildSteps(testTree());

  it("moves prev/next and clamps at the ends", () => {
    expect(adjacentStep(steps, "upload", -1).id).toBe("upload");
    expect(adjacentStep(steps, "export", 1).id).toBe("export");
    expect(adjacentStep(steps, "missing", 1).id).toBe("upload");
    expect(adjacentStep(steps, "contact", 1).kind).toBe("experience");
  });

  it("resolves ids and builds editor urls", () => {
    expect(resolveStep(steps, "contact").kind).toBe("contact");
    expect(resolveStep(steps, "nope").id).toBe("upload");
    expect(stepPath("abc", 2, "experience/0")).toBe("/resumes/abc/rev/2/experience/0");
  });
});
