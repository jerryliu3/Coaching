import { describe, expect, it } from "vitest";
import { adjacentStep, buildSteps, revisionKind } from "./workflow";
import type { RevisionTree } from "./types";

const tree: RevisionTree = {
  revision: {
    id: "r1",
    resume_id: "resume",
    revision_number: 1,
    kind: "discovery",
    status: "in_progress",
    current_step: "upload",
  },
  contact: {
    revision_id: "r1",
    full_name: "Ada",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    location_city: "",
    location_region: "",
  },
  sections: [
    {
      id: "s1",
      revision_id: "r1",
      kind: "experience",
      position: 0,
      heading: "Work Experience",
      entries: [
        {
          id: "e1",
          section_id: "s1",
          kind: "job",
          position: 0,
          org_name: "Acme",
          role_title: "SWE",
          location: "",
          start_date: null,
          end_date: null,
          is_current: false,
          url: "",
          gpa: "",
          courses: "",
          bullets: [],
          comments: [],
        },
        {
          id: "e2",
          section_id: "s1",
          kind: "job",
          position: 1,
          org_name: "Globex",
          role_title: "Intern",
          location: "",
          start_date: null,
          end_date: null,
          is_current: false,
          url: "",
          gpa: "",
          courses: "",
          bullets: [],
          comments: [],
        },
      ],
    },
  ],
  files: [],
  comments: [],
};

describe("workflow", () => {
  it("maps revision numbers to kinds", () => {
    expect(revisionKind(1)).toBe("discovery");
    expect(revisionKind(2)).toBe("editing");
    expect(revisionKind(4)).toBe("polishing");
  });

  it("builds one step per job and includes export", () => {
    const steps = buildSteps(tree);
    expect(steps.map((s) => s.id)).toContain("experience/0");
    expect(steps.map((s) => s.id)).toContain("experience/1");
    expect(steps.at(-1)?.id).toBe("export");
    expect(adjacentStep(steps, "experience/0", 1).id).toBe("experience/1");
  });
});
