"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewResumeForm({
  canAssign,
  profiles,
}: {
  canAssign: boolean;
  profiles: { id: string; display_name: string; role: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(profiles[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const payload: Record<string, string> = { name, email, title };
    if (canAssign && assigneeId) payload.assigneeId = assigneeId;
    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not create");
      setBusy(false);
      return;
    }
    router.push(`/resumes/${json.resume.id}/rev/1/upload`);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">New resume</h1>
      <div className="grid gap-2">
        <Label htmlFor="name">Candidate name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="title">Internal title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jane Doe — May 2026" />
      </div>
      {canAssign ? (
        <div className="grid gap-2">
          <Label htmlFor="assignee">Assign to</Label>
          <select
            id="assignee"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name || p.id} ({p.role})
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Creating…" : "Start editing"}
      </Button>
    </form>
  );
}
