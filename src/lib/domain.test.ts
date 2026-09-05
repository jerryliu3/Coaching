import { describe, expect, it } from "vitest";
import { analyzeBullet } from "./bullet-flags";
import { parseResumeText } from "./parse-resume";
import { copyTreeForward } from "./copy-revision";
import { linkedinCopy } from "./linkedin";
import { checklistFor } from "./checklists";
import type { RevisionTree } from "./types";

describe("analyzeBullet", () => {
  it("flags first person and metrics", () => {
    const flags = analyzeBullet("I increased latency 40% using Redis");
    expect(flags.has_first_person).toBe(true);
    expect(flags.has_metric).toBe(true);
    expect(flags.has_tools).toBe(true);
  });

  it("treats impact-first bullets as xyz", () => {
    expect(analyzeBullet("Reduced load time 40% by implementing Redis using Python").xyz_pattern).toBe("xyz");
  });
});

describe("parseResumeText", () => {
  it("splits sections and bullets", () => {
    const parsed = parseResumeText(`Jane Doe
jane@x.com
Work Experience
Acme Jan 2022 - Present
Software Engineer, Toronto
- Built an API using Python
Projects
Secrets App Jan 2021 - Jun 2021
- Created a web app
Education
MIT Sep 2018 - Jun 2022
Bachelor of Science in Computer Science
Technical Skills
Languages: Python, TypeScript`);
    expect(parsed.contact.email).toBe("jane@x.com");
    expect(parsed.jobs[0]?.org_name).toMatch(/Acme/);
    expect(parsed.jobs[0]?.bullets[0]).toMatch(/Built/);
    expect(parsed.projects[0]?.org_name).toMatch(/Secrets/);
    expect(parsed.skillGroups[0]?.org_name).toBe("Languages");
  });
});

describe("copyTreeForward", () => {
  it("keeps lineage ids and drops resolved comments", () => {
    const tree: RevisionTree = {
      revision: {
        id: "r1",
        resume_id: "resume",
        revision_number: 1,
        kind: "discovery",
        status: "complete",
        current_step: "export",
      },
      contact: {
        revision_id: "r1",
        full_name: "Jane",
        email: "j@x.com",
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
              bullets: [
                {
                  id: "b1",
                  entry_id: "e1",
                  position: 0,
                  lineage_id: "lin-1",
                  original_text: "old",
                  current_text: "new",
                  starts_with_verb: true,
                  tense: "past",
                  has_first_person: false,
                  has_metric: false,
                  has_tools: false,
                  has_justification: false,
                  xyz_pattern: "other",
                  technologies: [],
                },
              ],
              comments: [],
            },
          ],
        },
      ],
      files: [],
      comments: [
        {
          id: "c1",
          revision_id: "r1",
          bullet_id: "b1",
          entry_id: "e1",
          section_id: null,
          anchor_start: 0,
          anchor_end: 3,
          body: "keep",
          status: "open",
          created_by: null,
        },
        {
          id: "c2",
          revision_id: "r1",
          bullet_id: "b1",
          entry_id: "e1",
          section_id: null,
          anchor_start: 0,
          anchor_end: 3,
          body: "done",
          status: "resolved",
          created_by: null,
        },
      ],
    };
    const next = copyTreeForward(tree, "r2", 2);
    expect(next.revision.kind).toBe("editing");
    expect(next.sections[0]?.entries[0]?.bullets[0]?.lineage_id).toBe("lin-1");
    expect(next.sections[0]?.entries[0]?.bullets[0]?.original_text).toBe("new");
    expect(next.comments).toHaveLength(1);
    expect(next.comments[0]?.body).toBe("keep");
  });
});

describe("linkedin and checklists", () => {
  it("builds a headline from job and education", () => {
    const copy = linkedinCopy({
      revision: {
        id: "r",
        resume_id: "x",
        revision_number: 1,
        kind: "discovery",
        status: "in_progress",
        current_step: "contact",
      },
      contact: {
        revision_id: "r",
        full_name: "Jane Doe",
        email: "j@x.com",
        phone: "",
        linkedin: "",
        github: "",
        location_city: "",
        location_region: "",
      },
      sections: [
        {
          id: "e",
          revision_id: "r",
          kind: "experience",
          position: 0,
          heading: "Work Experience",
          entries: [
            {
              id: "j",
              section_id: "e",
              kind: "job",
              position: 0,
              org_name: "Google",
              role_title: "Software Engineer",
              location: "",
              start_date: null,
              end_date: null,
              is_current: true,
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
    });
    expect(copy.headline).toContain("Software Engineer at Google");
  });

  it("includes discovery questions on experience steps", () => {
    const items = checklistFor(
      { id: "experience/0", kind: "experience", label: "Acme" },
      "discovery",
    );
    expect(items.some((i) => i.toLowerCase().includes("open questions"))).toBe(true);
  });
});
