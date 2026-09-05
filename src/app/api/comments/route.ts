import { NextResponse } from "next/server";
import { addBullet, currentProfile, saveComment } from "@/lib/data";

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (body.entry_id && body.text && !body.body) {
    const bullet = await addBullet(body.entry_id, body.text);
    return NextResponse.json({ bullet });
  }
  const comment = await saveComment({ ...body, created_by: user.id });
  return NextResponse.json({ comment });
}

export async function PATCH(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const comment = await saveComment({ ...body, created_by: user.id });
  return NextResponse.json({ comment });
}
