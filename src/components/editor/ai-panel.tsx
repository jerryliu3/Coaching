"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AiResult = {
  issues: string[];
  open_questions: string[];
  suggested_text: string;
  reviewer_comment: string;
};

export function AiPanel({
  revisionId,
  entryId,
  onApplySuggestedText,
}: {
  revisionId: string;
  entryId: string;
  onApplySuggestedText?: (text: string) => Promise<void>;
}) {
  const [trigger, setTrigger] = useState<"review" | "apply" | "custom">("review");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  async function run() {
    setBusy(true);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_id: revisionId, entry_id: entryId, trigger, extra_prompt: extra }),
    });
    const json = await res.json();
    setResult(json.result as AiResult);
    setBusy(false);
  }

  async function applySuggestion() {
    if (!result?.suggested_text?.trim() || !onApplySuggestedText) return;
    setApplying(true);
    await onApplySuggestedText(result.suggested_text);
    setApplying(false);
  }
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI assist</p>
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as typeof trigger)}
        >
          <option value="review">High-level review</option>
          <option value="apply">Apply guidelines</option>
          <option value="custom">Custom prompt</option>
        </select>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? "Working…" : "Run AI"}
        </Button>
        {onApplySuggestedText ? (
          <Button size="sm" variant="outline" onClick={() => void applySuggestion()} disabled={applying || !result?.suggested_text?.trim()}>
            {applying ? "Applying…" : "Apply suggestion"}
          </Button>
        ) : null}
      </div>
      <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Optional extra instruction" rows={2} className="min-h-0 bg-background text-sm" />
      {result ? <pre className="max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}
