"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnnotatedTextarea } from "@/components/editor/annotated-textarea";
import { bulletLineFlags, primaryBulletFlag } from "@/lib/bullet-line-flags";
import type { Bullet, Comment } from "@/lib/types";
import { bulletsToText } from "@/lib/bullet-text";
import { cn } from "cn";

function BulletFlagGutter({ flags }: { flags: ReturnType<typeof bulletLineFlags> }) {
  const primary = primaryBulletFlag(flags);
  return (
    <div className="group relative flex h-[1.625rem] items-center justify-center">
      <span
        className={cn(
          "size-2 rounded-full transition-transform group-hover:scale-125",
          primary?.tone === "ok"
            ? "bg-emerald-500"
            : primary?.tone === "warn"
              ? "bg-amber-500"
              : "bg-muted-foreground/40",
        )}
      />
      <div
        className="pointer-events-none absolute left-full z-20 ml-1 hidden min-w-[11rem] rounded-lg border border-border/80 bg-card p-2 shadow-md group-hover:block"
        role="tooltip"
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Line checks</p>
        <ul className="space-y-1">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center gap-2 text-xs text-foreground">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  flag.tone === "ok" ? "bg-emerald-500" : flag.tone === "warn" ? "bg-amber-500" : "bg-muted-foreground/50",
                )}
              />
              {flag.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
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
  const bulletsFingerprint = useMemo(
    () => bullets.map((bullet) => `${bullet.id}:${bullet.current_text}`).join("\n"),
    [bullets],
  );
  const [text, setText] = useState(() => bulletsToText(bullets));
  const [syncedFingerprint, setSyncedFingerprint] = useState(bulletsFingerprint);
  if (bulletsFingerprint !== syncedFingerprint) {
    setSyncedFingerprint(bulletsFingerprint);
    setText(bulletsToText(bullets));
  }

  const [selection, setSelection] = useState<{ start: number; end: number; snippet: string } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);

  const cancelPendingComment = useCallback(() => {
    setSelection(null);
    setCommentDraft("");
  }, []);

  useEffect(() => {
    if (!selection || commentDraft.trim()) return;

    function isAllowedTarget(target: EventTarget | null) {
      if (!(target instanceof Node)) return false;
      return commentInputRef.current?.contains(target) ?? false;
    }

    function maybeDismiss(event: Event) {
      if (isAllowedTarget(event.target)) return;
      if (textareaRef.current?.contains(event.target as Node)) return;
      cancelPendingComment();
    }

    document.addEventListener("pointerdown", maybeDismiss);
    document.addEventListener("focusin", maybeDismiss);
    return () => {
      document.removeEventListener("pointerdown", maybeDismiss);
      document.removeEventListener("focusin", maybeDismiss);
    };
  }, [cancelPendingComment, commentDraft, selection]);

  function handleTextareaSelection() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end > start) {
      setSelection({ start, end, snippet: text.slice(start, end) });
      return;
    }
    if (selection && !commentDraft.trim()) {
      cancelPendingComment();
    }
  }

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

  async function addSelectionComment() {
    if (!selection || !commentDraft.trim()) return;
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
        <p className="text-xs text-muted-foreground">One line per bullet · hover dots for checks · highlight text to comment</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="flex">
          <div className="flex w-11 shrink-0 flex-col border-r border-border/60 bg-muted/20 py-3">
            {lines.map((_, i) => (
              <BulletFlagGutter key={i} flags={bulletLineFlags(bullets[i])} />
            ))}
          </div>
          <AnnotatedTextarea
            textareaRef={textareaRef}
            value={text}
            onChange={setText}
            onBlur={() => void save()}
            onMouseUp={handleTextareaSelection}
            onKeyUp={handleTextareaSelection}
            rows={Math.max(4, lines.length)}
            placeholder="- Built an API using Python&#10;- Reduced latency by 30%"
            disabled={busy}
            comments={entryComments}
            pendingRange={selection ? { start: selection.start, end: selection.end } : null}
            hoveredCommentId={hoveredCommentId}
            onHoverComment={setHoveredCommentId}
          />
        </div>
      </div>

      {selection ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 shadow-sm">
          <p className="mb-2 text-xs text-muted-foreground">
            Comment on: <span className="font-medium text-foreground">&ldquo;{selection.snippet}&rdquo;</span>
          </p>
          <div className="flex gap-2">
            <div ref={commentInputRef} className="min-h-0 flex-1">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={2}
                className="min-h-0 w-full text-sm"
                placeholder="What should change here?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" onClick={() => void addSelectionComment()} disabled={!commentDraft.trim()}>
                Add comment
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPendingComment}>
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
            const isHovered = hoveredCommentId === comment.id;
            return (
              <div
                key={comment.id}
                className={cn(
                  "rounded-lg border p-3 text-sm transition-colors",
                  isHovered
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/70 bg-muted/30",
                )}
                onMouseEnter={() => setHoveredCommentId(comment.id)}
                onMouseLeave={() => setHoveredCommentId(null)}
              >
                {quoted ? (
                  <p
                    className={cn(
                      "mb-1 border-l-2 pl-2 text-xs italic text-muted-foreground",
                      isHovered ? "border-primary bg-primary/10 text-foreground" : "border-amber-400/60",
                    )}
                  >
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
