import { NextResponse } from "next/server";
import { currentProfile, getRevisionTree, upsertFileRecord } from "@/lib/data";
import { exportDocx, exportPdf } from "@/lib/export-document";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { revision_id, format } = await request.json();
  const tree = await getRevisionTree(revision_id);
  const name = (tree.contact.full_name || "resume").replace(/\s+/g, "-");
  if (format === "pdf") {
    const bytes = await exportPdf(tree);
    const supabase = await createServerSupabase();
    const path = `${revision_id}/export/${name}.pdf`;
    await supabase.storage.from("resume-files").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    await upsertFileRecord({
      revision_id,
      kind: "export",
      storage_path: path,
      mime_type: "application/pdf",
      filename: `${name}.pdf`,
    });
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.pdf"`,
      },
    });
  }
  const bytes = await exportDocx(tree);
  const supabase = await createServerSupabase();
  const path = `${revision_id}/export/${name}.docx`;
  await supabase.storage.from("resume-files").upload(path, bytes, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
  await upsertFileRecord({
    revision_id,
    kind: "export",
    storage_path: path,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: `${name}.docx`,
  });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}.docx"`,
    },
  });
}
