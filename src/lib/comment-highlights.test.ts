import { describe, expect, it } from "vitest";
import { buildHighlightSegments, commentsAtOffset, segmentHighlightClass } from "./comment-highlights";

describe("comment-highlights", () => {
  it("splits text into segments with overlapping comment ids", () => {
    const segments = buildHighlightSegments(20, [
      { id: "a", anchor_start: 2, anchor_end: 10, status: "open" },
      { id: "b", anchor_start: 6, anchor_end: 14, status: "open" },
    ]);
    const overlap = segments.find((s) => s.commentIds.length === 2);
    expect(overlap).toBeTruthy();
  });

  it("keeps a pending selection visible while composing a comment", () => {
    const segments = buildHighlightSegments(20, [], { start: 3, end: 9 });
    const pending = segments.find((s) => s.pending);
    expect(pending).toBeTruthy();
    expect(segmentHighlightClass(pending!, null)).toContain("rose");
  });

  it("finds comments at a character offset", () => {
    const comments = [{ id: "a", anchor_start: 5, anchor_end: 12, status: "open" }];
    expect(commentsAtOffset(comments, 7)).toEqual(["a"]);
    expect(commentsAtOffset(comments, 2)).toEqual([]);
  });
});
