import { notFound } from "next/navigation";
import { EditorShell } from "@/components/editor/editor-shell";
import { getResume, getRevisionTree } from "@/lib/data";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string; n: string; step?: string[] }>;
}) {
  const { id, n, step } = await params;
  const resume = await getResume(id).catch(() => null);
  if (!resume) notFound();
  const revisions = (resume.revisions ?? []) as { id: string; revision_number: number }[];
  const revision = revisions.find((r) => String(r.revision_number) === n);
  if (!revision) notFound();
  const tree = await getRevisionTree(revision.id);
  const stepId = (step ?? ["upload"]).join("/");
  return <EditorShell resumeId={id} revisionNumber={Number(n)} stepId={stepId} initialTree={tree} />;
}
