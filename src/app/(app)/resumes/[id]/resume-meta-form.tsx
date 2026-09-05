"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResumeMetaForm({
  resumeId,
  initialTitle,
  initialStatus,
}: {
  resumeId: string;
  initialTitle: string;
  initialStatus: "active" | "paused" | "done";
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/resumes/${resumeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <p className="mb-3 text-sm font-medium">Resume settings</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="resume-title">Title</Label>
          <Input id="resume-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="resume-status">Status</Label>
          <select
            id="resume-status"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="done">done</option>
          </select>
        </div>
        <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
