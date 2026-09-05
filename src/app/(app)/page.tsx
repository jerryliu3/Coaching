import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listResumes } from "@/lib/data";
import { stepPath } from "@/lib/workflow";

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <p className="text-sm text-muted-foreground">
        Add Supabase keys to `.env.local` to load resumes. The UI and workflow are ready once the database is connected.
      </p>
    );
  }
  const resumes = await listResumes();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumes</h1>
        <p className="text-sm text-muted-foreground">Open a project, jump to a revision, or start a new one.</p>
      </div>
      <div className="grid gap-4">
        {resumes.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              No resumes yet. Create one to start the workflow.
            </CardContent>
          </Card>
        ) : (
          resumes.map((resume) => {
            const candidate = Array.isArray(resume.candidates) ? resume.candidates[0] : resume.candidates;
            const revisions = (resume.revisions ?? []) as { id: string; revision_number: number; status: string; current_step: string }[];
            const latest = [...revisions].sort((a, b) => b.revision_number - a.revision_number)[0];
            return (
              <Card key={resume.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{candidate?.name ?? resume.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{resume.title}</p>
                  </div>
                  <Badge variant="secondary">{resume.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                  <span>Rev {resume.current_revision_number}</span>
                  {latest ? <span>Step {latest.current_step}</span> : null}
                  <Link className="underline" href={`/resumes/${resume.id}`}>
                    Overview
                  </Link>
                  {latest ? (
                    <Link className="underline" href={stepPath(resume.id, latest.revision_number, latest.current_step)}>
                      Resume editing
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
