export type UserRole = "owner" | "contractor";
export type ResumeStatus = "active" | "paused" | "done";
export type RevisionStatus = "in_progress" | "sent" | "returned" | "complete";
export type RevisionKind = "discovery" | "editing" | "polishing";
export type SectionKind =
  | "contact"
  | "summary"
  | "education"
  | "experience"
  | "project"
  | "skills"
  | "extracurricular"
  | "patents";
export type EntryKind =
  | "job"
  | "project"
  | "school"
  | "skill_group"
  | "extra"
  | "patent";
export type FileKind = "original_upload" | "client_return" | "export";
export type CommentStatus = "open" | "resolved" | "deleted";
export type XyzPattern = "xyz" | "yxz" | "other" | "unknown";
export type AiTrigger = "review" | "apply" | "custom";

export type Contact = {
  revision_id: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  location_city: string;
  location_region: string;
};

export type Bullet = {
  id: string;
  entry_id: string;
  position: number;
  lineage_id: string;
  original_text: string;
  current_text: string;
  starts_with_verb: boolean;
  tense: "past" | "present" | "unknown";
  has_first_person: boolean;
  has_metric: boolean;
  has_tools: boolean;
  has_justification: boolean;
  xyz_pattern: XyzPattern;
  technologies: string[];
};

export type Comment = {
  id: string;
  revision_id: string;
  bullet_id: string | null;
  entry_id: string | null;
  section_id: string | null;
  anchor_start: number | null;
  anchor_end: number | null;
  body: string;
  status: CommentStatus;
  created_by: string | null;
};

export type Entry = {
  id: string;
  section_id: string;
  kind: EntryKind;
  position: number;
  org_name: string;
  role_title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  url: string;
  gpa: string;
  courses: string;
  bullets: Bullet[];
  comments: Comment[];
};

export type Section = {
  id: string;
  revision_id: string;
  kind: SectionKind;
  position: number;
  heading: string;
  entries: Entry[];
};

export type Revision = {
  id: string;
  resume_id: string;
  revision_number: number;
  kind: RevisionKind;
  status: RevisionStatus;
  current_step: string;
};

export type ResumeFile = {
  id: string;
  revision_id: string;
  kind: FileKind;
  storage_path: string;
  mime_type: string;
  filename: string;
};

export type RevisionTree = {
  revision: Revision;
  contact: Contact;
  sections: Section[];
  files: ResumeFile[];
  comments: Comment[];
};

export type WorkflowStep = {
  id: string;
  kind:
    | "upload"
    | "format"
    | "contact"
    | "experience"
    | "project"
    | "education"
    | "skills"
    | "extracurricular"
    | "patents"
    | "export";
  label: string;
  entryIndex?: number;
  entryId?: string;
};

export type ParsedResume = {
  contact: Omit<Contact, "revision_id">;
  summary: string;
  jobs: ParsedEntry[];
  projects: ParsedEntry[];
  schools: ParsedEntry[];
  skillGroups: ParsedEntry[];
  extras: ParsedEntry[];
  patents: ParsedEntry[];
};

export type ParsedEntry = {
  org_name: string;
  role_title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  url: string;
  gpa: string;
  courses: string;
  bullets: string[];
};
