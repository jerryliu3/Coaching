"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function NextRevisionButton({ resumeId, disabled }: { resumeId: string; disabled?: boolean }) {
  const router = useRouter();
  async function start() {
    const res = await fetch(`/api/resumes/${resumeId}/revisions`, { method: "POST" });
    const json = await res.json();
    if (json.revision) {
      router.push(`/resumes/${resumeId}/rev/${json.revision.revision_number}/upload`);
      router.refresh();
    }
  }
  return (
    <Button type="button" onClick={start} disabled={disabled}>
      Start next revision
    </Button>
  );
}
