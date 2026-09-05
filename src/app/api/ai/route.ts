import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cannedComments } from "@/lib/bullet-flags";
import { currentProfile, getRevisionTree, listGuidelines } from "@/lib/data";
import { systemPrompt, userPrompt } from "@/lib/prompts";
import { createServerSupabase } from "@/lib/supabase/server";

const outputSchema = z.object({
  issues: z.array(z.string()),
  open_questions: z.array(z.string()),
  suggested_text: z.string(),
  reviewer_comment: z.string(),
});

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const tree = await getRevisionTree(body.revision_id);
  const entry = tree.sections.flatMap((s) => s.entries).find((e) => e.id === body.entry_id);
  const sectionText = entry
    ? `${entry.org_name} ${entry.role_title}\n${entry.bullets.map((b) => `- ${b.current_text}`).join("\n")}`
    : JSON.stringify(tree.contact);
  const guidelines = await listGuidelines({
    industry: body.industry,
    seniority: body.seniority,
    role_type: body.target_role,
  });
  const system = systemPrompt(tree.revision.kind, entry?.kind ?? "contact");
  const prompt = userPrompt({
    trigger: body.trigger,
    extraPrompt: body.extra_prompt ?? "",
    sectionText,
    guidelines: guidelines.map((g) => g.body),
  });

  if (!process.env.AI_GATEWAY_API_KEY) {
    const fallback = {
      issues: ["AI is not configured. Add AI_GATEWAY_API_KEY to enable suggestions."],
      open_questions: [],
      suggested_text: entry?.bullets.map((b) => b.current_text).join("\n") ?? "",
      reviewer_comment: cannedComments()[0],
    };
    return NextResponse.json({ result: fallback });
  }

  const { object } = await generateObject({
    model: "google/gemini-2.5-flash",
    schema: outputSchema,
    system,
    prompt,
  });
  const supabase = await createServerSupabase();
  await supabase.from("ai_runs").insert({
    revision_id: body.revision_id,
    entry_id: body.entry_id ?? null,
    trigger: body.trigger,
    prompt,
    response: object,
    model: "google/gemini-2.5-flash",
  });
  return NextResponse.json({ result: object });
}
