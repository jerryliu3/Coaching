import { getResume, getRevisionTree } from "@/lib/data";
import { linkedinCopy } from "@/lib/linkedin";

export default async function LinkedInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await getResume(id);
  const revisions = [...((resume.revisions ?? []) as { id: string; revision_number: number }[])].sort(
    (a, b) => b.revision_number - a.revision_number,
  );
  const latest = revisions[0];
  if (!latest) return <p>Create a revision first.</p>;
  const tree = await getRevisionTree(latest.id);
  const copy = linkedinCopy(tree);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">LinkedIn copy</h1>
      <p className="text-sm text-muted-foreground">Paste these into LinkedIn. Details should match the resume exactly.</p>
      <section className="space-y-2">
        <h2 className="font-medium">Headline</h2>
        <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{copy.headline}</pre>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">About</h2>
        <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{copy.about}</pre>
      </section>
      {copy.experiences.map((exp) => (
        <section key={exp.header} className="space-y-2">
          <h2 className="font-medium">{exp.header}</h2>
          <ul className="list-disc pl-5 text-sm">
            {exp.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      ))}
      {copy.projects.map((p) => (
        <section key={p.title} className="space-y-2">
          <h2 className="font-medium">{p.title}</h2>
          {p.url ? <p className="text-sm">{p.url}</p> : null}
          <ul className="list-disc pl-5 text-sm">
            {p.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="font-medium">Skills</h2>
        <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm">{copy.skills}</pre>
      </section>
    </div>
  );
}
