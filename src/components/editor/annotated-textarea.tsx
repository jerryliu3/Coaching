"use client";

import { useCallback, useMemo, useRef } from "react";
import { cn } from "cn";
import {
  buildHighlightSegments,
  commentsAtOffset,
  segmentHighlightClass,
  type AnchoredComment,
  type PendingRange,
} from "@/lib/comment-highlights";

const TYPOGRAPHY =
  "w-full px-3 py-3 font-sans text-sm leading-[1.625rem] whitespace-pre-wrap break-words";

function caretOffsetFromPoint(textarea: HTMLTextAreaElement, clientX: number, clientY: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos) return pos.offset;
  }

  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range) {
      const pre = range.cloneRange();
      pre.selectNodeContents(textarea);
      pre.setEnd(range.endContainer, range.endOffset);
      return pre.toString().length;
    }
  }

  return null;
}

export function AnnotatedTextarea({
  value,
  onChange,
  onBlur,
  onMouseUp,
  onKeyUp,
  comments,
  pendingRange,
  hoveredCommentId,
  onHoverComment,
  rows,
  placeholder,
  disabled,
  textareaRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onMouseUp?: () => void;
  onKeyUp?: () => void;
  comments: AnchoredComment[];
  pendingRange?: PendingRange | null;
  hoveredCommentId: string | null;
  onHoverComment: (id: string | null) => void;
  rows: number;
  placeholder?: string;
  disabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}) {
  const mirrorRef = useRef<HTMLPreElement>(null);

  const segments = useMemo(
    () => buildHighlightSegments(value.length, comments, pendingRange),
    [comments, pendingRange, value.length],
  );

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (textarea && mirror) mirror.scrollTop = textarea.scrollTop;
  }, [textareaRef]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const offset = caretOffsetFromPoint(textarea, e.clientX, e.clientY);
      if (offset == null) return;
      const ids = commentsAtOffset(comments, offset);
      onHoverComment(ids[0] ?? null);
    },
    [comments, onHoverComment, textareaRef],
  );

  return (
    <div className="relative min-h-[8rem] flex-1">
      <pre
        ref={mirrorRef}
        aria-hidden
        className={cn(TYPOGRAPHY, "pointer-events-none absolute inset-0 m-0 overflow-hidden border-0 bg-transparent text-foreground")}
      >
        {segments.map((segment, index) => {
          const slice = value.slice(segment.start, segment.end);
          const highlight = segmentHighlightClass(segment, hoveredCommentId);
          if (!highlight) return <span key={index}>{slice}</span>;
          return (
            <mark key={index} className={cn("rounded-sm text-foreground", highlight)}>
              {slice}
            </mark>
          );
        })}
        {value.length === 0 && placeholder ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : null}
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onMouseUp={onMouseUp}
        onKeyUp={onKeyUp}
        onScroll={syncScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHoverComment(null)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck
        className={cn(
          TYPOGRAPHY,
          "relative z-10 resize-y border-0 bg-transparent text-transparent caret-foreground shadow-none selection:bg-primary/20 focus-visible:outline-none focus-visible:ring-0",
          className,
        )}
      />
    </div>
  );
}
