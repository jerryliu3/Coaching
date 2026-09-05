import { NextResponse } from "next/server";
import { currentProfile, saveBullet } from "@/lib/data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  await saveBullet(id, body.current_text, user.id, body.revision_id);
  return NextResponse.json({ ok: true });
}
