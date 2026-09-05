import { NextResponse } from "next/server";
import { currentProfile, syncEntryBullets } from "@/lib/data";
import { textToBulletLines } from "@/lib/bullet-text";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const lines = textToBulletLines(String(body.text ?? ""));
  await syncEntryBullets(id, lines, user.id, String(body.revision_id));
  return NextResponse.json({ ok: true });
}
