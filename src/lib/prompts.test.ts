import { describe, expect, it } from "vitest";
import { systemPrompt, userPrompt } from "./prompts";

describe("systemPrompt", () => {
  it("changes focus and section advice", () => {
    expect(systemPrompt("discovery", "job")).toMatch(/open questions/i);
    expect(systemPrompt("editing", "job")).toMatch(/XYZ/);
    expect(systemPrompt("polishing", "job")).toMatch(/polishing/i);
    expect(systemPrompt("discovery", "project")).toMatch(/design justification/i);
    expect(systemPrompt("discovery", "contact")).toMatch(/formatting and wording/i);
  });
});

describe("userPrompt", () => {
  it("uses the review trigger and injects guidelines", () => {
    const text = userPrompt({
      trigger: "review",
      extraPrompt: "keep it short",
      sectionText: "Built an API",
      guidelines: ["Lead with impact"],
    });
    expect(text).toMatch(/high-level feedback/i);
    expect(text).toContain("Lead with impact");
    expect(text).toContain("Built an API");
    expect(text).toContain("keep it short");
  });

  it("uses custom text as the instruction", () => {
    const text = userPrompt({
      trigger: "custom",
      extraPrompt: "Rewrite in past tense",
      sectionText: "x",
      guidelines: [],
    });
    expect(text).toContain("Rewrite in past tense");
    expect(text).not.toMatch(/Additional instruction/);
  });

  it("asks for concrete rewrites on apply", () => {
    expect(
      userPrompt({ trigger: "apply", extraPrompt: "", sectionText: "x", guidelines: [] }),
    ).toMatch(/rewritten bullets/i);
  });
});
