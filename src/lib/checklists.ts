import type { RevisionKind, WorkflowStep } from "./types";

export function checklistFor(step: WorkflowStep, kind: RevisionKind): string[] {
  const extra =
    kind === "discovery"
      ? ["Write down open questions for the client.", "Add a context bullet if the role is unclear."]
      : kind === "editing"
        ? ["Remove comments that the client already answered.", "Make the wording edits you asked for last round."]
        : ["Polish leftover phrasing.", "Confirm comments still match the current text."];

  const byKind: Record<WorkflowStep["kind"], string[]> = {
    upload:
      step.label === "Upload"
        ? ["Upload the original DOCX or PDF.", "Confirm the parsed sections look right before editing."]
        : ["Upload the client’s returned file.", "Skim their comment replies before editing."],
    format: [
      "Turn on the mental equivalent of Track Changes: every edit should be explainable.",
      "Section order: in school or <1 year post-grad → Education, Work Experience, Projects, Skills.",
      "More than 1 year out → Education then Experience, or Experience then Education.",
      "Sort roles by end date, then start date.",
      "Dates: 3-letter month and year (Jan 2022 - Jun 2023), consistent dash with spaces.",
      "Same bullet style everywhere. Enlarge section headers if they match body text.",
    ],
    contact: [
      "Need name, email, phone. Add LinkedIn and GitHub if missing.",
      "Separate items with | if they are running together.",
      "Location is city/state or city/country only — never a street address.",
    ],
    experience: [
      "Two-line header: company + dates, then title + location. Bold company (and dates if useful).",
      "Rename the section to Work Experience if they used Experience or Internships.",
      "Each bullet is one sentence, 1–2 lines, starts with a verb, third person, past tense unless current role.",
      "Technical bullets: Result → How → Tools (XYZ). Jobs should lead with impact and numbers.",
      "Move collaboration / team mentions to the end of the sentence.",
      "If they named a tool with no why, add a short justification and note that the client can correct it.",
    ],
    project: [
      "Title + dates on one line. Capitalize real project names.",
      "Hyperlink GitHub next to the title as (GitHub) when a link exists.",
      "Projects rarely have metrics — focus on design justification and tools.",
      "Same bullet rules as experience: one sentence, strong verb, no first person.",
    ],
    education: [
      "School top-left, dates top-right, degree/GPA bottom-left, location bottom-right.",
      "Spell out degrees (Master of Science in Computer Science). PhD can stay PhD.",
      "Expected dates: Sep 2022 - Jun 2024 (Expected). Present is also fine.",
      "Relevant Courses if they have been in the program ≥1 year. GPA digits must match (4.0/4.0).",
      "Location: City, State in the target country; City, Country otherwise.",
    ],
    skills: [
      "Bold category, colon, then comma-separated skills.",
      "Keep categories tight and consistent with the rest of the resume.",
    ],
    extracurricular: [
      "After Work Experience and Projects.",
      "With a role (President) format like a job; otherwise like a project.",
    ],
    patents: ["After Work Experience/Projects.", "One line with the details and a date."],
    export: ["Download DOCX or PDF.", "Send to the client, then start the next revision when they reply."],
  };

  return [...byKind[step.kind], ...extra];
}
