import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProfile, insertGuidelines, listGuidelines } from "@/lib/data";

const schema = z.object({
  guidelines: z.array(
    z.object({
      body: z.string(),
      industry: z.string().optional(),
      seniority: z.string().optional(),
      role_type: z.string().optional(),
    }),
  ),
  summary: z.string(),
});

export async function GET() {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guidelines = await listGuidelines({});
  return NextResponse.json({ guidelines });
}

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const notes = String(body.notes ?? "");
  if (!process.env.AI_GATEWAY_API_KEY) {
    const rows = notes
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((line: string) => ({ body: line, industry: body.industry ?? "", seniority: body.seniority ?? "" }));
    if (rows.length) await insertGuidelines(rows);
    return NextResponse.json({ summary: "Stored notes as guidelines (AI key not configured).", guidelines: rows });
  }
  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    schema,
    system:
      "You extract reusable resume-editing guidelines from before/after notes and comments. Write short, concrete rules with examples.",
    prompt: notes,
  });
  await insertGuidelines(
    object.guidelines.map((g) => ({
      body: g.body,
      industry: g.industry ?? body.industry ?? "",
      seniority: g.seniority ?? body.seniority ?? "",
      role_type: g.role_type ?? body.role_type ?? "",
    })),
  );
  return NextResponse.json(object);
}
