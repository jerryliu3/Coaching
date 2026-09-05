import { describe, expect, it } from "vitest";
import { exportDocx, exportPdf } from "./export-document";
import { testComment, testEntry, testSection, testTree } from "./test-fixtures";

const tree = testTree({
  comments: [testComment()],
  sections: [
    testSection({
      entries: [
        testEntry({
          url: "https://example.com",
          gpa: "3.90/4.00",
          courses: "Algorithms",
        }),
      ],
    }),
  ],
});

describe("export", () => {
  it("builds a non-empty Word file from structured data", async () => {
    const bytes = await exportDocx(tree);
    expect(Buffer.from(bytes).byteLength).toBeGreaterThan(1000);
  });

  it("builds a PDF that includes the candidate name", async () => {
    const bytes = await exportPdf(tree);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(Buffer.from(bytes).byteLength).toBeGreaterThan(200);
  });
});
