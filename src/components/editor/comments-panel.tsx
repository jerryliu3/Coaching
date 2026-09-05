"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Comment } from "@/lib/types";

export function CommentsPanel({
  revisionId,
  bulletId,
  comments,
  onReload,
}: {
  revisionId: string;
  bulletId: string;
  comments: Comment[];
  onReload: () => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const visible = comments.filter((c) => c.status !== "deleted");
  async function add() {
    if (!body.trim()) return;
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_id: revisionId, bullet_id: bulletId, body }),
    });
    setBody("");
    await onReload();
  }
  async function update(id: string, patch: { body?: string; status?: string }) {
    await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, revision_id: revisionId, ...patch }),
    });
    await onReload();
  }
  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2">
      {visible.map((comment) => (
        <div key={comment.id} className="space-y-1 text-sm">
          <Textarea defaultValue={comment.body} onBlur={(e) => update(comment.id, { body: e.target.value })} />
          <div className="flex gap-2">
            <Button size="xs" variant="ghost" onClick={() => update(comment.id, { status: comment.status === "resolved" ? "open" : "resolved" })}>
              {comment.status === "resolved" ? "Reopen" : "Resolve"}
            </Button>
            <Button size="xs" variant="ghost" onClick={() => update(comment.id, { status: "deleted" })}>
              Delete
            </Button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Comment on this bullet" />
        <Button size="sm" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
