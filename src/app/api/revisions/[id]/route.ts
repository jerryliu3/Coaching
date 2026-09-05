import { NextResponse } from "next/server";
import { currentProfile, getRevisionTree, saveContact, saveEntry, saveStepCheck, setCurrentStep, setRevisionStatus } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tree = await getRevisionTree(id);
  return NextResponse.json({ tree });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await currentProfile();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  if (body.current_step) await setCurrentStep(id, body.current_step);
  if (body.status) await setRevisionStatus(id, body.status);
  if (body.contact) await saveContact(id, body.contact);
  if (body.entryId && body.entry) await saveEntry(body.entryId, body.entry);
  if (body.check && body.check.taskKey && body.check.status) {
    await saveStepCheck({
      revisionId: id,
      stepId: String(body.check.stepId ?? body.current_step ?? ""),
      taskKey: String(body.check.taskKey),
      status: body.check.status,
      note: String(body.check.note ?? ""),
      updatedBy: user.id,
    });
  }
  const tree = await getRevisionTree(id);
  return NextResponse.json({ tree });
}
