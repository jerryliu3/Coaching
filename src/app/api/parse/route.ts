import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { applyParsedResume, currentProfile, upsertFileRecord } from "@/lib/data";
import { parseResumeText } from "@/lib/parse-resume";
import { extractPdfText } from "@/lib/pdf-text";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const revisionId = String(form.get("revision_id") ?? "");
  const kind = String(form.get("kind") ?? "original_upload");
  if (!(file instanceof File) || !revisionId) {
    return NextResponse.json({ error: "file and revision_id required" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = await createServerSupabase();
  const path = `${revisionId}/${kind}/${file.name}`;
  const { error: upErr } = await supabase.storage.from("resume-files").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  let text = "";
  if (file.name.toLowerCase().endsWith(".docx") || file.type.includes("word")) {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (file.name.toLowerCase().endsWith(".pdf")) {
    text = await extractPdfText(buffer);
  } else {
    text = buffer.toString("utf8");
  }

  await upsertFileRecord({
    revision_id: revisionId,
    kind,
    storage_path: path,
    mime_type: file.type || "application/octet-stream",
    filename: file.name,
    extracted_text: text,
  });

  const parsed = parseResumeText(text);
  await applyParsedResume(revisionId, parsed);
  return NextResponse.json({ parsed, path });
}
