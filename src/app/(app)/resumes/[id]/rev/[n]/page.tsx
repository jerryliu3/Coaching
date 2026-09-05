import { redirect } from "next/navigation";
import { getResume } from "@/lib/data";

export default async function RevisionIndex({ params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const resume = await getResume(id);
  const revisions = (resume.revisions ?? []) as { revision_number: number; current_step: string }[];
  const revision = revisions.find((r) => String(r.revision_number) === n);
  redirect(`/resumes/${id}/rev/${n}/${revision?.current_step || "upload"}`);
}
