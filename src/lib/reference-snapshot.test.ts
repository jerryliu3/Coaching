import { describe, expect, it } from "vitest";
import {
  buildContactReferenceSnapshot,
  buildEntryReferenceSnapshot,
  contactMatchStrings,
  entryMatchStrings,
} from "./reference-snapshot";
import type { Contact, Entry } from "./types";

describe("reference-snapshot", () => {
  it("builds immutable entry and contact snapshots", () => {
    expect(
      buildEntryReferenceSnapshot({
        org_name: "Acme",
        role_title: "Engineer",
        location: "NYC",
        start_date: "2024",
        end_date: "2025",
        is_current: false,
        url: "",
        gpa: "",
        courses: "",
        bullets: ["- Built APIs", ""],
      }),
    ).toEqual({
      org_name: "Acme",
      role_title: "Engineer",
      location: "NYC",
      start_date: "2024",
      end_date: "2025",
      url: "",
      gpa: "",
      courses: "",
      bullets: ["- Built APIs"],
    });

    expect(
      buildContactReferenceSnapshot({
        full_name: "Jane Doe",
        email: "jane@x.com",
        phone: "",
        linkedin: "",
        github: "",
        location_city: "Toronto",
        location_region: "ON",
      }),
    ).toEqual({
      full_name: "Jane Doe",
      email: "jane@x.com",
      phone: "",
      linkedin: "",
      github: "",
      location_city: "Toronto",
      location_region: "ON",
    });
  });

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
