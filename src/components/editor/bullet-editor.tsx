"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Bullet, Comment } from "@/lib/types";
import { bulletsToText, textToBulletLines } from "@/lib/bullet-text";

function lineFlags(bullet?: Bullet) {
  if (!bullet) return [];
  const flags: { key: string; label: string; tone: "ok" | "warn" | "muted" }[] = [];
  if (bullet.has_metric) flags.push({ key: "metric", label: "Has metric", tone: "ok" });
  else flags.push({ key: "metric", label: "Add a number or %", tone: "warn" });
  if (bullet.has_tools) flags.push({ key: "tools", label: "Names tools", tone: "ok" });
  if (bullet.has_first_person) flags.push({ key: "fp", label: "First person — rewrite", tone: "warn" });
  if (bullet.xyz_pattern === "xyz") flags.push({ key: "xyz", label: "XYZ pattern", tone: "ok" });
  else if (bullet.xyz_pattern === "yxz") flags.push({ key: "yxz", label: "YXZ pattern", tone: "ok" });
  else flags.push({ key: "xyz", label: "Weak structure", tone: "muted" });
  return flags;
}

export function BulletEditor({
  entryId,
  revisionId,
  bullets,
  comments,
  onReload,
}: {
  entryId: string;
  revisionId: string;
  bullets: Bullet[];
  comments: Comment[];
  onReload: () => Promise<void>;
}) {
  const [text, setText] = useState(() => bulletsToText(bullets));
  const [selection, setSelection] = useState<{ start: number; end: number; snippet: string } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(bulletsToText(bullets));
  }, [bullets]);

  const lines = useMemo(() => text.split("\n"), [text]);
  const entryComments = comments.filter((c) => c.entry_id === entryId && c.status !== "deleted");

  const save = useCallback(async () => {
    setBusy(true);
    await fetch(`/api/entries/${entryId}/bullets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, revision_id: revisionId }),
    });
    await onReload();
    setBusy(false);
  }, [entryId, onReload, revisionId, text]);

  function captureSelection() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end <= start) {
      setSelection(null);
      return;
    }
    setSelection({ start, end, snippet: text.slice(start, end) });
  }

  async function addSelectionComment() {
    if (!selection || !commentDraft.trim()) return;
    const lineBullets = textToBulletLines(text);
    const bulletIndex = text.slice(0, selection.start).split("\n").length - 1;
    const bulletId = bullets[bulletIndex]?.id ?? bullets[0]?.id ?? null;
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision_id: revisionId,
        entry_id: entryId,
        bullet_id: bulletId,
        anchor_start: selection.start,
        anchor_end: selection.end,
        body: commentDraft.trim(),
      }),
    });
    setCommentDraft("");
    setSelection(null);
    await onReload();
  }

  async function updateComment(id: string, patch: { body?: string; status?: string }) {
    await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, revision_id: revisionId, ...patch }),
    });
    await onReload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Bullets</p>
        <p className="text-xs text-muted-foreground">One line per bullet · highlight text to comment</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="flex">
          <div className="flex w-11 shrink-0 flex-col border-r border-border/60 bg-muted/20 py-3">
            {lines.map((line, i) => {
              const flags = lineFlags(bullets[i]);
              const primary = flags.find((f) => f.tone === "warn") ?? flags[0];
              return (
                <div
                  key={i}
                  className="flex h-[1.625rem] items-center justify-center"
                  title={flags.map((f) => f.label).join(" · ")}
                >
                  <span
                    className={`size-2 rounded-full ${
                      primary?.tone === "ok"
                        ? "bg-emerald-500"
                        : primary?.tone === "warn"
                          ? "bg-amber-500"
                          : "bg-muted-foreground/40"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void save()}
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            rows={Math.max(4, lines.length)}
            className="min-h-[8rem] resize-y border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="- Built an API using Python&#10;- Reduced latency by 30%"
            disabled={busy}
          />
        </div>
      </div>

      {selection ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm">
          <p className="mb-2 text-xs text-muted-foreground">
            Comment on: <span className="font-medium text-foreground">&ldquo;{selection.snippet}&rdquo;</span>
          </p>
          <div className="flex gap-2">
            <Textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={2}
              className="min-h-0 flex-1 text-sm"
              placeholder="What should change here?"
            />
            <div className="flex flex-col gap-1">
              <Button size="sm" onClick={() => void addSelectionComment()} disabled={!commentDraft.trim()}>
                Add comment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelection(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {entryComments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comments</p>
          {entryComments.map((comment) => {
            const quoted =
              comment.anchor_start != null && comment.anchor_end != null
                ? text.slice(comment.anchor_start, comment.anchor_end)
                : "";
            return (
              <div key={comment.id} className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                {quoted ? (
                  <p className="mb-1 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                    &ldquo;{quoted}&rdquo;
                  </p>
                ) : null}
                <Textarea
                  defaultValue={comment.body}
                  rows={2}
                  className="mb-2 min-h-0 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  onBlur={(e) => void updateComment(comment.id, { body: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      void updateComment(comment.id, {
                        status: comment.status === "resolved" ? "open" : "resolved",
                      })
                    }
                  >
                    {comment.status === "resolved" ? "Reopen" : "Resolve"}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => void updateComment(comment.id, { status: "deleted" })}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
