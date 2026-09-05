import type { Contact, Entry, RevisionTree, Section } from "./types";

function newId(prefix: string, n: number) {
  return `${prefix}-${n}`;
}

export function copyTreeForward(tree: RevisionTree, nextRevisionId: string, nextNumber: number): RevisionTree {
  let n = 0;
  const nextId = (prefix: string) => newId(prefix, ++n);

  const contact: Contact = { ...tree.contact, revision_id: nextRevisionId };
  const comments = tree.comments
    .filter((c) => c.status !== "resolved" && c.status !== "deleted")
    .map((c) => ({ ...c, id: nextId("c"), revision_id: nextRevisionId }));

  const sections: Section[] = tree.sections.map((section) => {
    const sectionId = nextId("s");
    const entries: Entry[] = section.entries.map((entry) => {
      const entryId = nextId("e");
      return {
        ...entry,
        id: entryId,
        section_id: sectionId,
        bullets: entry.bullets.map((b) => ({
          ...b,
          id: nextId("b"),
          entry_id: entryId,
          original_text: b.current_text,
        })),
        comments: entry.comments
          .filter((c) => c.status === "open")
          .map((c) => ({
            ...c,
            id: nextId("c"),
            revision_id: nextRevisionId,
            entry_id: entryId,
            bullet_id: null,
          })),
      };
    });
    return {
      ...section,
      id: sectionId,
      revision_id: nextRevisionId,
      entries,
    };
  });

  return {
    revision: {
      ...tree.revision,
      id: nextRevisionId,
      revision_number: nextNumber,
      kind: nextNumber === 2 ? "editing" : "polishing",
      status: "in_progress",
      current_step: "upload",
    },
    contact,
    sections,
    files: [],
    comments,
  };
}
