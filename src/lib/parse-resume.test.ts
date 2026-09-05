import { describe, expect, it } from "vitest";
import { parseResumeText } from "./parse-resume";

const sample = `Jane Doe
jane@x.com | 555-0100 | linkedin.com/in/jane | github.com/jane
Summary
Aspiring software engineer.
Work Experience
Acme Jan 2022 - Present
Software Engineer, Toronto
- Built an API using Python
Internships
Globex May 2021 - Aug 2021
Intern
- Wrote tests
Projects
Secrets App Jan 2021 - Jun 2021
https://github.com/jane/secrets
- Created a web app
Education
MIT Sep 2018 - Jun 2022
Bachelor of Science in Computer Science
- Relevant Courses: Algorithms, OS
Technical Skills
Languages: Python, TypeScript
Activities
Robotics Club
- Led outreach
Publications
US Patent 123 Jan 2020 - Jan 2020
Filed a patent`;

describe("parseResumeText", () => {
  it("extracts contact, jobs, projects, school, and skills", () => {
    const parsed = parseResumeText(sample);
    expect(parsed.contact.email).toBe("jane@x.com");
    expect(parsed.contact.github).toContain("github.com/jane");
    expect(parsed.jobs[0]?.org_name).toMatch(/Acme/);
    expect(parsed.jobs[0]?.is_current).toBe(true);
    expect(parsed.jobs[0]?.bullets[0]).toMatch(/Built/);
    expect(parsed.projects[0]?.org_name).toMatch(/Secrets/);
    expect(parsed.schools[0]?.org_name).toMatch(/MIT/);
    expect(parsed.skillGroups[0]?.org_name).toBe("Languages");
    expect(parsed.skillGroups[0]?.bullets).toContain("Python");
  });

  it("captures summary, extras, and patents when those headers exist", () => {
    const parsed = parseResumeText(sample);
    expect(parsed.summary).toMatch(/Aspiring/);
    expect(parsed.extras[0]?.org_name).toMatch(/Robotics/);
    expect(parsed.patents.length).toBeGreaterThan(0);
  });

  it("treats internships as work experience", () => {
    const parsed = parseResumeText(sample);
    expect(parsed.jobs.some((j) => /Globex/.test(j.org_name))).toBe(true);
  });

  it("returns empty collections for blank input", () => {
    const parsed = parseResumeText("");
    expect(parsed.jobs).toEqual([]);
    expect(parsed.contact.email).toBe("");
  });
});
