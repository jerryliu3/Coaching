"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type Guideline = { id?: string; body: string; industry?: string; seniority?: string };

export function AnalysisForm({ initialGuidelines }: { initialGuidelines: Guideline[] }) {
  const [notes, setNotes] = useState("");
  const [guidelines, setGuidelines] = useState<Guideline[]>(initialGuidelines);
  const [summary, setSummary] = useState("");

  async function run() {
    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const json = await res.json();
    setSummary(json.summary ?? "");
    const listed = await fetch("/api/analysis");
    const listedJson = await listed.json();
    setGuidelines(listedJson.guidelines ?? json.guidelines ?? []);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Paste before/after notes or comment history. Guidelines are stored as a read-only knowledge base and automatically included in AI prompts.
        </p>
      </div>
      <Textarea rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Revision notes, comments, and what changed" />
      <Button onClick={run}>Extract guidelines</Button>
      {summary ? <p className="text-sm">{summary}</p> : null}
      <div className="space-y-2">
        {guidelines.map((g, i) => (
          <div key={g.id ?? `${g.body}-${i}`} className="rounded-lg border p-3 text-sm">
            {g.body}
          </div>
        ))}
      </div>
    </div>
  );
}
