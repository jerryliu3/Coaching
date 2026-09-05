import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentProfile, getResume, listProfiles } from "@/lib/data";
import { stepPath } from "@/lib/workflow";
import { AssignForm } from "./assign-form";
import { NextRevisionButton } from "./next-revision-button";
import { RevisionStatusControl } from "./revision-status-control";
import { ResumeMetaForm } from "./resume-meta-form";

export default async function ResumeOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let resume;
  try {
    resume = await getResume(id);
  } catch {
    notFound();
  }
  const candidate = resume.candidates;
  const revisions = [...((resume.revisions ?? []) as { id: string; revision_number: number; status: string; current_step: string; kind: string }[])].sort(
    (a, b) => a.revision_number - b.revision_number,
  );
  const { profile } = await currentProfile();
  const isOwner = profile?.role === "owner";
  const profiles = isOwner ? await listProfiles() : [];
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{candidate?.name ?? resume.title}</h1>
          <p className="text-sm text-muted-foreground">{candidate?.target_role || "No target role set"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/resumes/${id}/linkedin`}>LinkedIn</Link>
          </Button>
          <NextRevisionButton resumeId={id} disabled={revisions.length >= 10} />
        </div>
      </div>
      {isOwner ? <ResumeMetaForm resumeId={id} initialTitle={resume.title} initialStatus={resume.status} /> : null}
      {isOwner ? <AssignForm resumeId={id} profiles={profiles} /> : null}
      <div className="space-y-2">
        {revisions.map((rev) => (
          <div key={rev.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">Revision {rev.revision_number}</span>
              <Badge variant="secondary">{rev.kind}</Badge>
              {isOwner ? (
                <RevisionStatusControl revisionId={rev.id} initialStatus={rev.status as "in_progress" | "sent" | "returned" | "complete"} />
              ) : (
                <span className="text-sm text-muted-foreground">{rev.status}</span>
              )}
            </div>
            <Link className="text-sm underline" href={stepPath(id, rev.revision_number, rev.current_step)}>
              Open {rev.current_step}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
