import type { Contact, Entry, ParsedEntry } from "./types";

export type EntryReferenceSnapshot = {
  org_name?: string;
  role_title?: string;
  location?: string;
  start_date?: string | null;
  end_date?: string | null;
  url?: string;
  gpa?: string;
  courses?: string;
  bullets: string[];
};

export type ContactReferenceSnapshot = {
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  location_city?: string;
  location_region?: string;
};

type EntryWithMeta = Entry & { meta?: { reference?: EntryReferenceSnapshot } };

export function buildEntryReferenceSnapshot(item: ParsedEntry): EntryReferenceSnapshot {
  return {
    org_name: item.org_name,
    role_title: item.role_title,
    location: item.location,
    start_date: item.start_date,
    end_date: item.end_date,
    url: item.url,
    gpa: item.gpa,
    courses: item.courses,
    bullets: item.bullets.map((text) => text.trim()).filter(Boolean),
  };
}

export function buildContactReferenceSnapshot(contact: Omit<Contact, "revision_id" | "imported_fields">): ContactReferenceSnapshot {
  return {
    full_name: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    linkedin: contact.linkedin,
    github: contact.github,
    location_city: contact.location_city,
    location_region: contact.location_region,
  };
}

function pushString(strings: string[], value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length >= 2) strings.push(trimmed);
}

export function entryMatchStrings(entry: Entry): string[] {
  const snapshot = (entry as EntryWithMeta).meta?.reference;
  const strings: string[] = [];

  if (snapshot) {
    pushString(strings, snapshot.org_name);
    pushString(strings, snapshot.role_title);
    pushString(strings, snapshot.location);
    pushString(strings, snapshot.url);
    pushString(strings, snapshot.gpa);
    pushString(strings, snapshot.courses);
    pushString(strings, snapshot.start_date);
    pushString(strings, snapshot.end_date);
    if (snapshot.start_date?.trim() && snapshot.end_date?.trim()) {
      pushString(strings, `${snapshot.start_date.trim()} - ${snapshot.end_date.trim()}`);
      pushString(strings, `${snapshot.start_date.trim()} – ${snapshot.end_date.trim()}`);
    }
    for (const bullet of snapshot.bullets) {
      pushString(strings, bullet);
      const stripped = bullet.replace(/^[-•*]\s*/, "").trim();
      if (stripped) pushString(strings, stripped);
    }
    return [...new Set(strings)].sort((a, b) => b.length - a.length);
  }

  for (const bullet of entry.bullets) {
    const text = bullet.original_text ?? bullet.current_text ?? "";
    pushString(strings, text);
    const stripped = text.replace(/^[-•*]\s*/, "").trim();
    if (stripped) pushString(strings, stripped);
  }

  return [...new Set(strings)].sort((a, b) => b.length - a.length);
}

function hasSnapshotValues(values: Record<string, unknown>): boolean {
  return Object.values(values).some((value) => typeof value === "string" && value.trim().length > 0);
}

export function contactMatchStrings(contact: Contact): string[] {
  const snapshot = contact.imported_fields;
  const strings: string[] = [];
  const source = snapshot && hasSnapshotValues(snapshot) ? snapshot : contact;

  pushString(strings, source.full_name);
  pushString(strings, source.email);
  pushString(strings, source.phone);
  pushString(strings, source.linkedin);
  pushString(strings, source.github);
  pushString(strings, source.location_city);
  pushString(strings, source.location_region);
  if (source.location_city?.trim() && source.location_region?.trim()) {
    pushString(strings, `${source.location_city.trim()}, ${source.location_region.trim()}`);
  }

  return [...new Set(strings)].sort((a, b) => b.length - a.length);
}
