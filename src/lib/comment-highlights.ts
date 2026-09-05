export type AnchoredComment = {
  id: string;
  anchor_start: number | null;
  anchor_end: number | null;
  status?: string;
};

export type HighlightSegment = {
  start: number;
  end: number;
  commentIds: string[];
  pending?: boolean;
};

export type PendingRange = {
  start: number;
  end: number;
};

export function buildHighlightSegments(
  textLength: number,
  comments: AnchoredComment[],
  pendingRange?: PendingRange | null,
): HighlightSegment[] {
  const anchored = comments.filter(
    (c) =>
      c.status !== "deleted" &&
      c.anchor_start != null &&
      c.anchor_end != null &&
      c.anchor_end > c.anchor_start,
  );

  const hasPending = !!(pendingRange && pendingRange.end > pendingRange.start);
  if (!anchored.length && !hasPending) return [{ start: 0, end: textLength, commentIds: [] }];

  const points = new Set<number>([0, textLength]);
  for (const comment of anchored) {
    points.add(Math.max(0, comment.anchor_start!));
    points.add(Math.min(textLength, comment.anchor_end!));
  }
  if (hasPending) {
    points.add(Math.max(0, pendingRange!.start));
    points.add(Math.min(textLength, pendingRange!.end));
  }

  const sorted = [...points].sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const commentIds = anchored
      .filter((c) => c.anchor_start! <= start && c.anchor_end! >= end)
      .map((c) => c.id);
    const pending = !!(hasPending && pendingRange!.start <= start && pendingRange!.end >= end);
    segments.push({ start, end, commentIds, pending });
  }
  return segments;
}

export function commentsAtOffset(comments: AnchoredComment[], offset: number): string[] {
  return comments
    .filter(
      (c) =>
        c.status !== "deleted" &&
        c.anchor_start != null &&
        c.anchor_end != null &&
        offset >= c.anchor_start &&
        offset < c.anchor_end,
    )
    .map((c) => c.id);
}

export function segmentHighlightClass(segment: Pick<HighlightSegment, "commentIds" | "pending">, hoveredId: string | null) {
  const hasComment = segment.commentIds.length > 0;
  const hasPending = !!segment.pending;
  if (!hasComment && !hasPending) return "";

  const hovered = hoveredId != null && segment.commentIds.includes(hoveredId);

  if (hasPending) return "bg-rose-200/55 ring-1 ring-rose-300/50 dark:bg-rose-500/25 dark:ring-rose-400/40";
  if (hovered) return "bg-primary/25 ring-1 ring-primary/50";
  if (segment.commentIds.length > 1) return "bg-amber-400/75 dark:bg-amber-500/45";
  return "bg-amber-200/60 dark:bg-amber-500/30";
}
