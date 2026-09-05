import { NextResponse } from "next/server";
import { copyRevision, currentProfile, getResume } from "@/lib/data";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resume = await getResume(id);
  const revisions = (resume.revisions ?? []) as { id: string; revision_number: number }[];
  const latest = [...revisions].sort((a, b) => b.revision_number - a.revision_number)[0];
  if (!latest) return NextResponse.json({ error: "No revision" }, { status: 400 });
  const revision = await copyRevision(id, latest.id);
  return NextResponse.json({ revision });
}
