import { NextResponse } from "next/server";
import { assignResume, currentProfile, getResume, updateResume } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const resume = await getResume(id);
  return NextResponse.json({ resume });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  try {
    if (body.assigneeId) await assignResume(id, body.assigneeId);
    if (body.title || body.status) await updateResume(id, { title: body.title, status: body.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update resume" }, { status: 403 });
  }
  const resume = await getResume(id);
  return NextResponse.json({ resume });
}
