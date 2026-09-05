import { describe, expect, it } from "vitest";
import { contactMatchStrings, entryMatchStrings } from "./reference-snapshot";
import type { Contact, Entry } from "./types";

describe("reference-snapshot", () => {
  it("uses imported contact fields instead of live edits", () => {
    const strings = contactMatchStrings({
      revision_id: "r1",
      full_name: "Edited Name",
      email: "edited@x.com",
      phone: "",
      linkedin: "",
      github: "",
      location_city: "",
      location_region: "",
      imported_fields: {
        full_name: "Jane Doe",
        email: "jane@x.com",
      },
    } as Contact);
    expect(strings).toContain("Jane Doe");
    expect(strings).toContain("jane@x.com");
    expect(strings).not.toContain("Edited Name");
    expect(strings).not.toContain("edited@x.com");
  });

  it("falls back to original bullet text when no entry snapshot exists", () => {
    const strings = entryMatchStrings({
      id: "1",
      org_name: "Live Org",
      role_title: "",
      bullets: [{ original_text: "Original bullet", current_text: "Edited bullet" }],
    } as Entry);
    expect(strings).toContain("Original bullet");
    expect(strings).not.toContain("Edited bullet");
    expect(strings).not.toContain("Live Org");
  });
});
