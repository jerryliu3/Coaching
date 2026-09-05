import type { ParsedEntry, ParsedResume } from "./types";

const HEADERS: { re: RegExp; key: keyof Pick<ParsedResume, "jobs" | "projects" | "schools" | "skillGroups" | "extras" | "patents"> | "summary" }[] = [
  { re: /^(work\s+)?experience|internships$/i, key: "jobs" },
  { re: /^projects?$/i, key: "projects" },
  { re: /^education$/i, key: "schools" },
  { re: /^(technical\s+)?skills$/i, key: "skillGroups" },
  { re: /^(extracurricular|involvement|activities)$/i, key: "extras" },
  { re: /^(patents?|publications?)$/i, key: "patents" },
  { re: /^(summary|profile|objective)$/i, key: "summary" },
];

function emptyEntry(): ParsedEntry {
  return {
    org_name: "",
    role_title: "",
    location: "",
    start_date: null,
    end_date: null,
    is_current: false,
    url: "",
    gpa: "",
    courses: "",
    bullets: [],
  };
}

function parseDates(line: string) {
  const m = line.match(
    /([A-Z][a-z]{2,8}\.?\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2,8}\.?\s+\d{4}|Present|Current)/i,
  );
  if (!m) return { start_date: null as string | null, end_date: null as string | null, is_current: false };
  const is_current = /present|current/i.test(m[2]);
  return { start_date: m[1], end_date: is_current ? null : m[2], is_current };
}

function parseContact(block: string): ParsedResume["contact"] {
  const email = block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = block.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? "";
  const linkedin = block.match(/linkedin\.com\/in\/\S+/i)?.[0] ?? "";
  const github = block.match(/github\.com\/\S+/i)?.[0] ?? "";
  const firstLine = block.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return {
    full_name: firstLine.replace(email, "").replace(phone, "").split("|")[0].trim(),
    email,
    phone,
    linkedin,
    github,
    location_city: "",
    location_region: "",
  };
}

export function parseResumeText(text: string): ParsedResume {
  const lines = text.replace(/\r/g, "").split("\n");
  const parsed: ParsedResume = {
    contact: parseContact(text.slice(0, 800)),
    summary: "",
    jobs: [],
    projects: [],
    schools: [],
    skillGroups: [],
    extras: [],
    patents: [],
  };

  let current: (typeof HEADERS)[number]["key"] | "contact" = "contact";
  let entry = emptyEntry();

  const flush = () => {
    if (current === "contact" || current === "summary") return;
    const hasContent = entry.org_name || entry.bullets.length || entry.role_title;
    if (!hasContent) return;
    parsed[current].push(entry);
    entry = emptyEntry();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const header = HEADERS.find((h) => h.re.test(line.replace(/:$/, "")));
    if (header) {
      flush();
      current = header.key;
      continue;
    }
    if (current === "contact") continue;
    if (current === "summary") {
      parsed.summary = [parsed.summary, line].filter(Boolean).join(" ");
      continue;
    }
    if (current === "skillGroups") {
      const [cat, rest] = line.split(/:\s*/);
      parsed.skillGroups.push({
        ...emptyEntry(),
        org_name: cat ?? "Skills",
        bullets: rest ? rest.split(/,\s*/) : [line],
      });
      continue;
    }
    if (/^[•\-*]/.test(line) || /^Relevant Courses/i.test(line)) {
      const bullet = line.replace(/^[•\-*]\s*/, "");
      if (/^Relevant Courses/i.test(bullet)) entry.courses = bullet.replace(/^Relevant Courses:\s*/i, "");
      else entry.bullets.push(bullet);
      continue;
    }
    if (entry.org_name && (entry.role_title || entry.bullets.length) && !/^[•\-*]/.test(line) && parseDates(line).start_date) {
      flush();
    }
    if (!entry.org_name) {
      const dates = parseDates(line);
      entry.org_name = line.replace(/\s+[A-Z][a-z]{2}.*/, "").split("|")[0].trim() || line;
      entry.start_date = dates.start_date;
      entry.end_date = dates.end_date;
      entry.is_current = dates.is_current;
      const url = line.match(/https?:\/\/\S+/)?.[0];
      if (url) entry.url = url;
      continue;
    }
    if (!entry.role_title) {
      entry.role_title = line;
      const loc = line.match(/,\s*[A-Z][A-Za-z]+(?:\s*[A-Z][A-Za-z]+)?$/);
      if (loc) entry.location = loc[0].replace(/^,\s*/, "");
      continue;
    }
    entry.bullets.push(line);
  }
  flush();
  return parsed;
}
