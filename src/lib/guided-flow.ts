import type { Entry, RevisionKind, RevisionTree, WorkflowStep } from "./types";

export type GuidedTask = {
  key: string;
  prompt: string;
  hint?: string;
};

function baseTasks(kind: RevisionKind): GuidedTask[] {
  const aiHint =
    kind === "discovery"
      ? "If facts are missing, ask a client question before rewriting."
      : "Run AI when you want rewrite suggestions after manual checks.";
  return [
    { key: "facts-match", prompt: "Do the org, role, location, and dates match the source?", hint: aiHint },
    { key: "voice-format", prompt: "Is the wording third-person, concise, and one sentence per bullet?" },
  ];
}

function bulletTasks(entry: Entry): GuidedTask[] {
  const bullets = entry.bullets.slice(0, 8);
  return bullets.map((bullet, index) => ({
    key: `bullet-${index}`,
    prompt: `Bullet ${index + 1}: Is it clear, specific, and outcome-focused?`,
    hint: bullet.current_text ? `Current: ${bullet.current_text}` : "Bullet is empty.",
  }));
}

export function guidedTasksForStep(step: WorkflowStep, tree: RevisionTree): GuidedTask[] {
  if (step.kind === "upload") {
    return [
      { key: "file-correct", prompt: "Did you upload the correct source file for this revision?" },
      { key: "parse-check", prompt: "Does the parsed content look complete before moving on?" },
    ];
  }
  if (step.kind === "format") {
    return [
      { key: "section-order", prompt: "Is the section order correct for this resume?" },
      { key: "date-style", prompt: "Do all entries follow a consistent date format?" },
      { key: "header-style", prompt: "Is the contact/header format clean and consistent?" },
    ];
  }
  if (step.kind === "contact") {
    return [
      { key: "contact-complete", prompt: "Are name, email, phone, and location complete and correct?" },
      { key: "links-clean", prompt: "Are LinkedIn and GitHub links valid and clean?" },
    ];
  }
  if (step.kind === "export") {
    return [
      { key: "final-pass", prompt: "Did you run a final pass on all unresolved comments?" },
      { key: "send-ready", prompt: "Is this revision ready to send to the client?" },
    ];
  }

  const section = tree.sections.find((s) => s.kind === step.kind);
  const entry = section?.entries[step.entryIndex ?? 0];
  if (!entry) return [];

  if (step.kind === "skills") {
    return [
      { key: "skill-groups", prompt: "Are skill categories labeled clearly and consistently?" },
      { key: "skill-relevance", prompt: "Are the listed skills relevant to the target role?" },
    ];
  }

  const tasks = [...baseTasks(tree.revision.kind)];
  if (step.kind === "experience") {
    tasks.push({ key: "metrics", prompt: "Do bullets include metrics, scale, or evidence where possible?" });
    tasks.push({ key: "xyz-shape", prompt: "Do bullets follow a strong result/how/tools structure?" });
  }
  if (step.kind === "project") {
    tasks.push({ key: "technical-depth", prompt: "Do bullets explain design choices and implementation details?" });
  }
  if (step.kind === "education") {
    tasks.push({ key: "edu-basics", prompt: "Are degree, school, and expected/grad dates correct?" });
  }
  return [...tasks, ...bulletTasks(entry)];
}
