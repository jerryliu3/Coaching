import { NextResponse } from "next/server";
import { assignResume, currentProfile, getResume } from "@/lib/data";

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
  if (body.assigneeId) await assignResume(id, body.assigneeId);
  const resume = await getResume(id);
  return NextResponse.json({ resume });
}
