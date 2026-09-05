"use client";

import { useState } from "react";

export function RevisionStatusControl({
  revisionId,
  initialStatus,
}: {
  revisionId: string;
  initialStatus: "in_progress" | "sent" | "returned" | "complete";
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function update(next: typeof status) {
    setStatus(next);
    setSaving(true);
    await fetch(`/api/revisions/${revisionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
  }

  return (
    <select
      aria-label="Revision status"
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      value={status}
      disabled={saving}
      onChange={(e) => void update(e.target.value as typeof status)}
    >
      <option value="in_progress">in progress</option>
      <option value="sent">sent</option>
      <option value="returned">returned</option>
      <option value="complete">complete</option>
    </select>
  );
}
