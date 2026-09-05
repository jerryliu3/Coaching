import { NextResponse } from "next/server";
import { currentProfile, createResume, listResumes } from "@/lib/data";

export async function GET() {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resumes = await listResumes();
  return NextResponse.json({ resumes });
}

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const created = await createResume(body);
  return NextResponse.json(created);
}
