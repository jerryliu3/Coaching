import type { RevisionTree } from "./types";

function degreeLine(tree: RevisionTree) {
  const school = tree.sections.find((s) => s.kind === "education")?.entries[0];
  if (!school) return "";
  return `${school.role_title} from ${school.org_name}`.trim();
}

function currentJob(tree: RevisionTree) {
  const jobs = tree.sections.find((s) => s.kind === "experience")?.entries ?? [];
  return jobs.find((j) => j.is_current) ?? jobs[0];
}

export function linkedinCopy(tree: RevisionTree) {
  const name = tree.contact.full_name || "Candidate";
  const job = currentJob(tree);
  const degree = degreeLine(tree);
  const skills = (tree.sections.find((s) => s.kind === "skills")?.entries ?? [])
    .map((e) => `${e.org_name}: ${e.bullets.join(", ")}`)
    .join("\n");

  const headlineParts = [
    job ? `${job.role_title} at ${job.org_name}` : "",
    degree,
    "Seeking software engineering roles",
  ].filter(Boolean);

  const about = [
    `I am ${name}${job ? `, currently ${job.role_title} at ${job.org_name}` : ""}${degree ? `, with ${degree}` : ""}.`,
    "I have experience building reliable software and care about clear impact in the work I do.",
    job?.is_current ? "" : "I am currently seeking my next software engineering role.",
    "",
    skills,
    "",
    `Feel free to contact me at: ${tree.contact.email || "email"}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const experiences = (tree.sections.find((s) => s.kind === "experience")?.entries ?? []).map((e) => ({
    header: `${e.role_title} · ${e.org_name}`,
    bullets: e.bullets.map((b) => b.current_text),
    skills: e.bullets.flatMap((b) => b.technologies).slice(0, 8),
  }));

  const projects = (tree.sections.find((s) => s.kind === "project")?.entries ?? []).map((e) => ({
    title: e.org_name,
    url: e.url,
    bullets: e.bullets.map((b) => b.current_text),
  }));

  return {
    headline: headlineParts.join(" | "),
    about,
    experiences,
    education: (tree.sections.find((s) => s.kind === "education")?.entries ?? []).map((e) => ({
      school: e.org_name,
      degree: e.role_title,
      gpa: e.gpa,
      courses: e.courses,
    })),
    projects,
    skills,
  };
}
