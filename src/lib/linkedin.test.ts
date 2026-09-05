import { describe, expect, it } from "vitest";
import { linkedinCopy } from "./linkedin";
import { testEntry, testSection, testTree } from "./test-fixtures";

describe("linkedinCopy", () => {
  it("builds headline, about, and skills from the latest tree", () => {
    const copy = linkedinCopy(
      testTree({
        sections: [
          testSection(),
          testSection({
            id: "edu",
            kind: "education",
            heading: "Education",
            entries: [
              testEntry({
                id: "school",
                kind: "school",
                org_name: "Duke University",
                role_title: "Bachelor of Science in Computer Science",
                bullets: [],
              }),
            ],
          }),
          testSection({
            id: "skills",
            kind: "skills",
            heading: "Skills",
            entries: [
              testEntry({
                id: "sk",
                kind: "skill_group",
                org_name: "Languages",
                bullets: [],
              }),
            ],
          }),
        ],
      }),
    );
    expect(copy.headline).toContain("Software Engineer at Acme");
    expect(copy.headline).toContain("Duke University");
    expect(copy.about).toContain("jane@x.com");
    expect(copy.experiences[0]?.header).toContain("Acme");
    expect(copy.education[0]?.school).toBe("Duke University");
  });

  it("still produces a headline when job details are missing", () => {
    const copy = linkedinCopy(testTree({ sections: [] }));
    expect(copy.headline).toContain("Seeking software engineering roles");
    expect(copy.experiences).toEqual([]);
  });
});
