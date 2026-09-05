import { describe, expect, it } from "vitest";
import { analyzeBullet, cannedComments, focusCopy } from "./bullet-flags";

describe("analyzeBullet", () => {
  it("flags first person, metrics, and tools", () => {
    const flags = analyzeBullet("I increased latency 40% using Redis");
    expect(flags.has_first_person).toBe(true);
    expect(flags.has_metric).toBe(true);
    expect(flags.has_tools).toBe(true);
  });

  it("treats impact-first bullets as xyz", () => {
    expect(analyzeBullet("Reduced load time 40% by implementing Redis using Python").xyz_pattern).toBe("xyz");
  });

  it("treats built/developed bullets with a metric as yxz", () => {
    expect(analyzeBullet("Built a cache that increased throughput 20%").xyz_pattern).toBe("yxz");
  });

  it("marks justification language", () => {
    expect(analyzeBullet("Implemented Redis for increased scalability").has_justification).toBe(true);
  });

  it("returns unknown pattern for empty text", () => {
    expect(analyzeBullet("").xyz_pattern).toBe("unknown");
    expect(analyzeBullet("").starts_with_verb).toBe(false);
  });
});

describe("reviewer copy", () => {
  it("exposes the canned comment list used by the AI prompt", () => {
    expect(cannedComments().length).toBeGreaterThan(5);
    expect(cannedComments().some((c) => c.includes("justification"))).toBe(true);
  });

  it("changes the editor focus by revision kind", () => {
    expect(focusCopy("discovery").title).toBe("Discovery");
    expect(focusCopy("editing").body).toMatch(/XYZ/i);
    expect(focusCopy("polishing").title).toBe("Polishing");
  });
});
