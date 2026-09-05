import { NextResponse } from "next/server";
import { currentProfile, getReferenceText } from "@/lib/data";
import { buildReferenceSections } from "@/lib/reference-resume";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ref = await getReferenceText(id);
  if (!ref) return NextResponse.json({ text: "", filename: "", sections: [] });
  const sections = buildReferenceSections(ref.text);
  return NextResponse.json({ text: ref.text, filename: ref.filename, sections });
}
