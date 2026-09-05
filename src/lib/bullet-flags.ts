import type { RevisionKind, XyzPattern } from "./types";

const FIRST_PERSON = /\b(i|me|my|we|our|us)\b/i;
const METRIC = /\d|%|percent|increase|decrease|reduced|grew|saved/i;
const TOOLS =
  /\b(python|java|react|node|aws|docker|sql|redis|postgres|kubernetes|typescript|javascript|golang|rust|c\+\+|spark|hadoop|graphql|mongodb|kafka)\b/i;
const JUSTIFICATION = /\bfor\b|\bto (improve|increase|reduce|enable|support|scale)\b/i;
const PRESENT = /\b(ing|manage|lead|build|develop|own)\b/i;

export function analyzeBullet(text: string): {
  starts_with_verb: boolean;
  tense: "past" | "present" | "unknown";
  has_first_person: boolean;
  has_metric: boolean;
  has_tools: boolean;
  has_justification: boolean;
  xyz_pattern: XyzPattern;
} {
  const trimmed = text.trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  const starts_with_verb = /^[A-Z][a-z]+ed$|^[A-Z][a-z]+(?:ed|d)$/.test(first) || /^[A-Z][a-z]+/.test(first);
  const tense = /ed$/.test(first.toLowerCase()) ? "past" : PRESENT.test(first) ? "present" : "unknown";
  const has_first_person = FIRST_PERSON.test(trimmed);
  const has_metric = METRIC.test(trimmed);
  const has_tools = TOOLS.test(trimmed);
  const has_justification = JUSTIFICATION.test(trimmed);

  let xyz_pattern: XyzPattern = "unknown";
  if (has_metric && /by |using |with /.test(trimmed)) xyz_pattern = "xyz";
  else if (/^(Built|Developed|Implemented|Created)/.test(trimmed) && has_metric) xyz_pattern = "yxz";
  else if (trimmed.length > 0) xyz_pattern = "other";

  return {
    starts_with_verb: starts_with_verb && !FIRST_PERSON.test(first),
    tense,
    has_first_person,
    has_metric,
    has_tools,
    has_justification,
    xyz_pattern,
  };
}

export function cannedComments() {
  return [
    "Restructured this sentence to highlight your impact more",
    "Moved the result to the beginning of the sentence to make this point sound more significant",
    "Rephrased this part of this sentence to be more clear and concise",
    "Fixed the grammar and improved the wording to describe what you did better",
    "Improved the wording to be more technical",
    "Added in justification to emphasize your work",
    "Moved the impact to the beginning of the sentence to highlight it immediately and ensure it gets read",
    "Restructured this part to describe your work better and make it sound more impressive",
    "Changed the wording here to add more emphasis",
    "Added further justification here to emphasize your design choices and knowledge",
    "Added details here to describe what you did better. Feel free to change it with more specific details or correct me if I’m wrong",
  ];
}

export function focusCopy(kind: RevisionKind) {
  if (kind === "discovery") {
    return {
      title: "Discovery",
      body: "Ask open questions, flag missing impact, and add context bullets. You can still edit the text.",
    };
  }
  if (kind === "editing") {
    return {
      title: "Editing",
      body: "Apply wording and XYZ structure. Resolve comments the client answered and drop ones that no longer apply.",
    };
  }
  return {
    title: "Polishing",
    body: "Tighten phrasing, keep comments consistent, and finish leftover style fixes.",
  };
}
