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
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Resumes</h1>
        <p className="mt-1 text-muted-foreground">Open a project, jump to a revision, or start a new one.</p>
      </div>
      <div className="grid gap-4">
        {resumes.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              No resumes yet.{" "}
              <Link href="/resumes/new" className="font-medium text-primary underline-offset-4 hover:underline">
                Create one
              </Link>{" "}
              to start the workflow.
            </CardContent>
          </Card>
        ) : (
          resumes.map((resume) => {
            const candidate = Array.isArray(resume.candidates) ? resume.candidates[0] : resume.candidates;
            const revisions = (resume.revisions ?? []) as { id: string; revision_number: number; status: string; current_step: string }[];
            const latest = [...revisions].sort((a, b) => b.revision_number - a.revision_number)[0];
            return (
              <Card key={resume.id} className="shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xl">{candidate?.name ?? resume.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{resume.title}</p>
                  </div>
                  <Badge variant="secondary">{resume.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs">Rev {resume.current_revision_number}</span>
                  {latest ? <span className="text-muted-foreground">Step: {latest.current_step}</span> : null}
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/resumes/${resume.id}`}>
                    Overview
                  </Link>
                  {latest ? (
                    <Link className="font-medium underline-offset-4 hover:underline" href={stepPath(resume.id, latest.revision_number, latest.current_step)}>
                      Continue editing
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
