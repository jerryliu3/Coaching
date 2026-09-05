"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AssignForm({
  resumeId,
  profiles,
}: {
  resumeId: string;
  profiles: { id: string; display_name: string; role: string }[];
}) {
  const [userId, setUserId] = useState(profiles[0]?.id ?? "");
  const [saved, setSaved] = useState(false);
  async function save() {
    await fetch(`/api/resumes/${resumeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: userId }),
    });
    setSaved(true);
  }
  return (
    <div className="flex items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor="assignee">Assign contractor</Label>
        <select
          id="assignee"
          className="h-8 rounded-lg border bg-background px-2 text-sm"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name || p.id} ({p.role})
            </option>
          ))}
        </select>
      </div>
      <Button type="button" variant="outline" onClick={save}>
        {saved ? "Assigned" : "Save assignment"}
      </Button>
    </div>
  );
}
