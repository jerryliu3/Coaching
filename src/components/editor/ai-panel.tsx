"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AiPanel({ revisionId, entryId }: { revisionId: string; entryId: string }) {
  const [trigger, setTrigger] = useState<"review" | "apply" | "custom">("review");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_id: revisionId, entry_id: entryId, trigger, extra_prompt: extra }),
    });
    const json = await res.json();
    setResult(JSON.stringify(json.result, null, 2));
    setBusy(false);
  }
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex gap-2">
        <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)}>
          <option value="review">High-level review</option>
          <option value="apply">Apply guidelines</option>
          <option value="custom">Custom prompt</option>
        </select>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? "Working…" : "Run AI"}
        </Button>
      </div>
      <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Optional extra instruction" />
      {result ? <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">{result}</pre> : null}
    </div>
  );
}
