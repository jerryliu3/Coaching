import { describe, expect, it } from "vitest";
import { copyTreeForward } from "./copy-revision";
import { testComment, testEntry, testSection, testTree } from "./test-fixtures";

describe("copyTreeForward", () => {
  it("keeps lineage ids, snapshots current text, and drops resolved comments", () => {
    const tree = testTree({
      comments: [
        testComment({ body: "keep", status: "open" }),
        testComment({ id: "c2", body: "done", status: "resolved" }),
        testComment({ id: "c3", body: "gone", status: "deleted" }),
      ],
    });
    const next = copyTreeForward(tree, "r2", 2);
    expect(next.revision.kind).toBe("editing");
    expect(next.revision.current_step).toBe("upload");
    expect(next.files).toEqual([]);
    expect(next.sections[0]?.entries[0]?.bullets[0]?.lineage_id).toBe("lin-1");
    expect(next.sections[0]?.entries[0]?.bullets[0]?.original_text).toBe("Built an API using Python");
    expect(next.comments).toHaveLength(1);
    expect(next.comments[0]?.body).toBe("keep");
    expect(next.comments[0]?.revision_id).toBe("r2");
  });

  it("copies open entry comments onto the new entry", () => {
    const tree = testTree({
      sections: [
        testSection({
          entries: [
            testEntry({
              comments: [
                testComment({ status: "open", body: "ask about scale" }),
                testComment({ id: "c-done", status: "resolved", body: "done" }),
              ],
            }),
          ],
        }),
      ],
    });
    const next = copyTreeForward(tree, "r2", 2);
    expect(next.sections[0]?.entries[0]?.comments).toHaveLength(1);
    expect(next.sections[0]?.entries[0]?.comments[0]?.body).toBe("ask about scale");
    expect(next.sections[0]?.entries[0]?.comments[0]?.revision_id).toBe("r2");
    expect(next.sections[0]?.entries[0]?.comments[0]?.entry_id).toBe(
      next.sections[0]?.entries[0]?.id,
    );
  });

  it("marks revision 3+ as polishing", () => {
    expect(copyTreeForward(testTree(), "r3", 3).revision.kind).toBe("polishing");
  });
});
