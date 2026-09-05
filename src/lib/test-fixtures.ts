import type { Bullet, Comment, Entry, RevisionTree, Section } from "./types";

export function testBullet(overrides: Partial<Bullet> = {}): Bullet {
  return {
    id: "b1",
    entry_id: "e1",
    position: 0,
    lineage_id: "lin-1",
    original_text: "old",
    current_text: "Built an API using Python",
    starts_with_verb: true,
    tense: "past",
    has_first_person: false,
    has_metric: false,
    has_tools: true,
    has_justification: false,
    xyz_pattern: "other",
    technologies: ["Python"],
    ...overrides,
  };
}

export function testEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    section_id: "s1",
    kind: "job",
    position: 0,
    org_name: "Acme",
    role_title: "Software Engineer",
    location: "Toronto",
    start_date: "Jan 2022",
    end_date: null,
    is_current: true,
    url: "",
    gpa: "",
    courses: "",
    bullets: [testBullet()],
    comments: [],
    ...overrides,
  };
}

export function testSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "s1",
    revision_id: "r1",
    kind: "experience",
    position: 0,
    heading: "Work Experience",
    entries: [testEntry()],
    ...overrides,
  };
}

export function testTree(overrides: Partial<RevisionTree> = {}): RevisionTree {
  return {
    revision: {
      id: "r1",
      resume_id: "resume-1",
      revision_number: 1,
      kind: "discovery",
      status: "in_progress",
      current_step: "upload",
    },
    contact: {
      revision_id: "r1",
      full_name: "Jane Doe",
      email: "jane@x.com",
      phone: "555-0100",
      linkedin: "linkedin.com/in/jane",
      github: "github.com/jane",
      location_city: "Toronto",
      location_region: "ON",
    },
    sections: [testSection()],
    files: [],
    comments: [],
    ...overrides,
  };
}

export function testComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    revision_id: "r1",
    bullet_id: "b1",
    entry_id: "e1",
    section_id: null,
    anchor_start: 0,
    anchor_end: 4,
    body: "Need a metric",
    status: "open",
    created_by: "user-1",
    ...overrides,
  };
}
