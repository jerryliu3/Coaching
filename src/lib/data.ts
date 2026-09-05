import { randomUUID } from "crypto";
import { analyzeBullet } from "./bullet-flags";
import type { ParsedResume, RevisionTree } from "./types";
import { revisionKind } from "./workflow";
import { createServerSupabase } from "./supabase/server";

export async function currentProfile() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { supabase: null as never, user: null, profile: null };
  }
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  return { supabase, user: auth.user, profile };
}

export async function listResumes() {
  const { supabase } = await currentProfile();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, status, current_revision_number, created_at, candidates(id, name, email, target_role, industry, seniority), resume_assignments(user_id, profiles(display_name, role)), revisions(id, revision_number, status, current_step, kind)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createResume(input: {
  name: string;
  email?: string;
  title?: string;
  target_role?: string;
  industry?: string;
  seniority?: string;
  assigneeId?: string;
}) {
  const { supabase, user } = await currentProfile();
  if (!user) throw new Error("Unauthorized");
  const { data: candidate, error: cErr } = await supabase
    .from("candidates")
    .insert({
      name: input.name,
      email: input.email ?? "",
      target_role: input.target_role ?? "",
      industry: input.industry ?? "",
      seniority: input.seniority ?? "",
      created_by: user.id,
    })
    .select()
    .single();
  if (cErr) throw cErr;
  const { data: resume, error: rErr } = await supabase
    .from("resumes")
    .insert({ candidate_id: candidate.id, title: input.title || `${input.name} resume` })
    .select()
    .single();
  if (rErr) throw rErr;
  await supabase.from("resume_assignments").insert({ resume_id: resume.id, user_id: input.assigneeId || user.id });
  const { data: revision, error: vErr } = await supabase
    .from("revisions")
    .insert({
      resume_id: resume.id,
      revision_number: 1,
      kind: "discovery",
      current_step: "upload",
    })
    .select()
    .single();
  if (vErr) throw vErr;
  await supabase.from("contacts").insert({ revision_id: revision.id, full_name: input.name, email: input.email ?? "" });
  await seedEmptySections(revision.id);
  return { resume, revision };
}

async function seedEmptySections(revisionId: string) {
  const { supabase } = await currentProfile();
  const kinds = [
    ["experience", "Work Experience", "job"],
    ["project", "Projects", "project"],
    ["education", "Education", "school"],
    ["skills", "Technical Skills", "skill_group"],
  ] as const;
  for (const [i, [kind, heading, entryKind]] of kinds.entries()) {
    const { data: section } = await supabase
      .from("sections")
      .insert({ revision_id: revisionId, kind, position: i, heading })
      .select()
      .single();
    if (section) {
      await supabase.from("entries").insert({
        section_id: section.id,
        kind: entryKind,
        position: 0,
        org_name: "",
      });
    }
  }
}

export async function getResume(id: string) {
  const { supabase } = await currentProfile();
  const { data, error } = await supabase
    .from("resumes")
    .select("*, candidates(*), resume_assignments(user_id, profiles(id, display_name, role)), revisions(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function assignResume(resumeId: string, userId: string) {
  const { supabase } = await currentProfile();
  const { error } = await supabase.from("resume_assignments").upsert({ resume_id: resumeId, user_id: userId });
  if (error) throw error;
}

export async function listProfiles() {
  const { supabase } = await currentProfile();
  const { data, error } = await supabase.from("profiles").select("id, display_name, role");
  if (error) throw error;
  return data ?? [];
}

export async function getRevisionTree(revisionId: string): Promise<RevisionTree> {
  const { supabase } = await currentProfile();
  const { data: revision, error } = await supabase.from("revisions").select("*").eq("id", revisionId).single();
  if (error) throw error;
  const [{ data: contact }, { data: sections }, { data: files }, { data: comments }] = await Promise.all([
    supabase.from("contacts").select("*").eq("revision_id", revisionId).maybeSingle(),
    supabase.from("sections").select("*").eq("revision_id", revisionId).order("position"),
    supabase.from("files").select("*").eq("revision_id", revisionId),
    supabase.from("comments").select("*").eq("revision_id", revisionId),
  ]);
  const sectionRows = sections ?? [];
  const sectionIds = sectionRows.map((s) => s.id);
  const { data: entries } = sectionIds.length
    ? await supabase.from("entries").select("*").in("section_id", sectionIds).order("position")
    : { data: [] };
  const entryRows = entries ?? [];
  const entryIds = entryRows.map((e) => e.id);
  const { data: bullets } = entryIds.length
    ? await supabase.from("bullets").select("*").in("entry_id", entryIds).order("position")
    : { data: [] };
  const bulletRows = bullets ?? [];
  const { data: techs } = bulletRows.length
    ? await supabase.from("bullet_technologies").select("*").in(
        "bullet_id",
        bulletRows.map((b) => b.id),
      )
    : { data: [] };
  const techMap = new Map<string, string[]>();
  for (const t of techs ?? []) {
    techMap.set(t.bullet_id, [...(techMap.get(t.bullet_id) ?? []), t.technology]);
  }
  const commentRows = comments ?? [];
  const treeSections = sectionRows.map((section) => ({
    ...section,
    entries: entryRows
      .filter((e) => e.section_id === section.id)
      .map((entry) => ({
        ...entry,
        bullets: bulletRows
          .filter((b) => b.entry_id === entry.id)
          .map((b) => ({ ...b, technologies: techMap.get(b.id) ?? [] })),
        comments: commentRows.filter((c) => c.entry_id === entry.id || bulletRows.some((b) => b.entry_id === entry.id && b.id === c.bullet_id)),
      })),
  }));
  return {
    revision,
    contact: contact ?? {
      revision_id: revisionId,
      full_name: "",
      email: "",
      phone: "",
      linkedin: "",
      github: "",
      location_city: "",
      location_region: "",
    },
    sections: treeSections,
    files: files ?? [],
    comments: commentRows,
  };
}

export async function upsertFileRecord(input: {
  revision_id: string;
  kind: string;
  storage_path: string;
  mime_type: string;
  filename: string;
  extracted_text?: string;
}) {
  const { supabase } = await currentProfile();
  const { data: existing } = await supabase
    .from("files")
    .select("id")
    .eq("revision_id", input.revision_id)
    .eq("kind", input.kind)
    .eq("filename", input.filename)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from("files")
      .update({
        storage_path: input.storage_path,
        mime_type: input.mime_type,
        extracted_text: input.extracted_text ?? "",
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.from("files").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function getReferenceText(resumeId: string): Promise<{ text: string; filename: string } | null> {
  const { supabase } = await currentProfile();
  const { data: revisions } = await supabase
    .from("revisions")
    .select("id, revision_number")
    .eq("resume_id", resumeId)
    .order("revision_number", { ascending: true });
  if (!revisions?.length) return null;

  for (const rev of revisions) {
    const { data: files } = await supabase
      .from("files")
      .select("*")
      .eq("revision_id", rev.id)
      .in("kind", ["original_upload", "client_return"]);
    const file = files?.find((f) => f.kind === "original_upload") ?? files?.[0];
    if (!file) continue;
    if (file.extracted_text) {
      return { text: file.extracted_text, filename: file.filename };
    }
    const { data: blob } = await supabase.storage.from("resume-files").download(file.storage_path);
    if (!blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    let text = "";
    if (file.filename.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (file.filename.toLowerCase().endsWith(".pdf")) {
      text = buffer.toString("latin1").replace(/[^\n\r\t\x20-\x7E]/g, " ");
    } else {
      text = buffer.toString("utf8");
    }
    await supabase.from("files").update({ extracted_text: text }).eq("id", file.id);
    return { text, filename: file.filename };
  }
  return null;
}

export async function syncEntryBullets(
  entryId: string,
  lines: string[],
  userId: string | undefined,
  revisionId: string,
) {
  const { supabase } = await currentProfile();
  const { data: existing } = await supabase.from("bullets").select("*").eq("entry_id", entryId).order("position");
  const bullets = existing ?? [];
  for (let i = 0; i < lines.length; i++) {
    if (bullets[i]) {
      await saveBullet(bullets[i].id, lines[i], userId, revisionId);
    } else {
      await addBullet(entryId, lines[i]);
    }
  }
  for (let i = lines.length; i < bullets.length; i++) {
    await supabase.from("bullets").delete().eq("id", bullets[i].id);
  }
}

export async function saveContact(revisionId: string, contact: Record<string, string>) {
  const { supabase } = await currentProfile();
  const { error } = await supabase.from("contacts").upsert({ revision_id: revisionId, ...contact });
  if (error) throw error;
}

export async function saveEntry(entryId: string, patch: Record<string, unknown>) {
  const { supabase } = await currentProfile();
  const { error } = await supabase.from("entries").update(patch).eq("id", entryId);
  if (error) throw error;
}

export async function addEntry(sectionId: string, kind: string, position: number) {
  const { supabase } = await currentProfile();
  const { data, error } = await supabase
    .from("entries")
    .insert({ section_id: sectionId, kind, position, org_name: "" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveBullet(bulletId: string, current_text: string, userId: string | undefined, revisionId: string) {
  const { supabase } = await currentProfile();
  const { data: before } = await supabase.from("bullets").select("*").eq("id", bulletId).single();
  if (!before) throw new Error("Bullet not found");
  const flags = analyzeBullet(current_text);
  const { error } = await supabase.from("bullets").update({ current_text, ...flags }).eq("id", bulletId);
  if (error) throw error;
  if (before.current_text !== current_text) {
    await supabase.from("edits").insert({
      bullet_id: bulletId,
      revision_id: revisionId,
      before_text: before.current_text,
      after_text: current_text,
      source: "human",
      created_by: userId ?? null,
    });
  }
}

export async function addBullet(entryId: string, text: string) {
  const { supabase } = await currentProfile();
  const { data: existing } = await supabase.from("bullets").select("position").eq("entry_id", entryId).order("position", { ascending: false }).limit(1);
  const position = (existing?.[0]?.position ?? -1) + 1;
  const flags = analyzeBullet(text);
  const { data, error } = await supabase
    .from("bullets")
    .insert({
      entry_id: entryId,
      position,
      original_text: text,
      current_text: text,
      ...flags,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveComment(input: {
  id?: string;
  revision_id: string;
  bullet_id?: string | null;
  entry_id?: string | null;
  section_id?: string | null;
  anchor_start?: number | null;
  anchor_end?: number | null;
  body: string;
  status?: string;
  created_by?: string | null;
}) {
  const { supabase } = await currentProfile();
  if (input.id) {
    const { data, error } = await supabase
      .from("comments")
      .update({ body: input.body, status: input.status ?? "open", updated_at: new Date().toISOString() })
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("comments").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setCurrentStep(revisionId: string, current_step: string) {
  const { supabase } = await currentProfile();
  await supabase.from("revisions").update({ current_step }).eq("id", revisionId);
}

export async function setRevisionStatus(revisionId: string, status: string) {
  const { supabase } = await currentProfile();
  await supabase.from("revisions").update({ status }).eq("id", revisionId);
}

export async function applyParsedResume(revisionId: string, parsed: ParsedResume) {
  const { supabase } = await currentProfile();
  await supabase.from("contacts").upsert({ revision_id: revisionId, ...parsed.contact });
  await supabase.from("sections").delete().eq("revision_id", revisionId);
  const groups: { kind: string; heading: string; entryKind: string; items: ParsedResume["jobs"] }[] = [
    { kind: "experience", heading: "Work Experience", entryKind: "job", items: parsed.jobs },
    { kind: "project", heading: "Projects", entryKind: "project", items: parsed.projects },
    { kind: "education", heading: "Education", entryKind: "school", items: parsed.schools },
    { kind: "skills", heading: "Technical Skills", entryKind: "skill_group", items: parsed.skillGroups },
    { kind: "extracurricular", heading: "Extracurricular", entryKind: "extra", items: parsed.extras },
    { kind: "patents", heading: "Patents / Publications", entryKind: "patent", items: parsed.patents },
  ];
  for (const [i, group] of groups.entries()) {
    const items = group.items.length ? group.items : group.kind === "extracurricular" || group.kind === "patents" ? [] : [
      {
        org_name: "",
        role_title: "",
        location: "",
        start_date: null,
        end_date: null,
        is_current: false,
        url: "",
        gpa: "",
        courses: "",
        bullets: [],
      },
    ];
    if (!items.length) continue;
    const { data: section } = await supabase
      .from("sections")
      .insert({ revision_id: revisionId, kind: group.kind, position: i, heading: group.heading })
      .select()
      .single();
    if (!section) continue;
    for (const [j, item] of items.entries()) {
      const { data: entry } = await supabase
        .from("entries")
        .insert({
          section_id: section.id,
          kind: group.entryKind,
          position: j,
          org_name: item.org_name,
          role_title: item.role_title,
          location: item.location,
          start_date: item.start_date,
          end_date: item.end_date,
          is_current: item.is_current,
          url: item.url,
          gpa: item.gpa,
          courses: item.courses,
        })
        .select()
        .single();
      if (!entry) continue;
      for (const [k, text] of item.bullets.entries()) {
        const flags = analyzeBullet(text);
        await supabase.from("bullets").insert({
          entry_id: entry.id,
          position: k,
          original_text: text,
          current_text: text,
          ...flags,
        });
      }
    }
  }
}

export async function copyRevision(resumeId: string, fromRevisionId: string) {
  const { supabase } = await currentProfile();
  const tree = await getRevisionTree(fromRevisionId);
  const nextNumber = tree.revision.revision_number + 1;
  if (nextNumber > 10) throw new Error("Maximum of 10 revisions");
  const { data: revision, error } = await supabase
    .from("revisions")
    .insert({
      resume_id: resumeId,
      revision_number: nextNumber,
      kind: revisionKind(nextNumber),
      current_step: "upload",
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("contacts").insert({ ...tree.contact, revision_id: revision.id });
  const commentMap = new Map<string, string>();
  for (const section of tree.sections) {
    const { data: newSection } = await supabase
      .from("sections")
      .insert({ revision_id: revision.id, kind: section.kind, position: section.position, heading: section.heading })
      .select()
      .single();
    if (!newSection) continue;
    for (const entry of section.entries) {
      const { data: newEntry } = await supabase
        .from("entries")
        .insert({
          section_id: newSection.id,
          kind: entry.kind,
          position: entry.position,
          org_name: entry.org_name,
          role_title: entry.role_title,
          location: entry.location,
          start_date: entry.start_date,
          end_date: entry.end_date,
          is_current: entry.is_current,
          url: entry.url,
          gpa: entry.gpa,
          courses: entry.courses,
        })
        .select()
        .single();
      if (!newEntry) continue;
      for (const bullet of entry.bullets) {
        const { data: newBullet } = await supabase
          .from("bullets")
          .insert({
            entry_id: newEntry.id,
            position: bullet.position,
            lineage_id: bullet.lineage_id,
            original_text: bullet.current_text,
            current_text: bullet.current_text,
            starts_with_verb: bullet.starts_with_verb,
            tense: bullet.tense,
            has_first_person: bullet.has_first_person,
            has_metric: bullet.has_metric,
            has_tools: bullet.has_tools,
            has_justification: bullet.has_justification,
            xyz_pattern: bullet.xyz_pattern,
          })
          .select()
          .single();
        if (newBullet) {
          for (const tech of bullet.technologies) {
            await supabase.from("bullet_technologies").insert({ bullet_id: newBullet.id, technology: tech });
          }
          commentMap.set(bullet.id, newBullet.id);
        }
      }
    }
  }
  for (const comment of tree.comments.filter((c) => c.status === "open")) {
    await supabase.from("comments").insert({
      revision_id: revision.id,
      bullet_id: comment.bullet_id ? commentMap.get(comment.bullet_id) ?? null : null,
      entry_id: null,
      section_id: null,
      anchor_start: comment.anchor_start,
      anchor_end: comment.anchor_end,
      body: comment.body,
      status: "open",
      created_by: comment.created_by,
    });
  }
  await supabase.from("resumes").update({ current_revision_number: nextNumber }).eq("id", resumeId);
  return revision;
}

export async function listGuidelines(filter: { industry?: string; seniority?: string; role_type?: string }) {
  const { supabase } = await currentProfile();
  let q = supabase.from("guidelines").select("*").order("created_at", { ascending: false }).limit(20);
  if (filter.industry) q = q.eq("industry", filter.industry);
  if (filter.seniority) q = q.eq("seniority", filter.seniority);
  if (filter.role_type) q = q.eq("role_type", filter.role_type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function insertGuidelines(rows: { body: string; industry?: string; seniority?: string; role_type?: string; source_revision_id?: string }[]) {
  const { supabase } = await currentProfile();
  const { error } = await supabase.from("guidelines").insert(rows);
  if (error) throw error;
}

export function emptyTree(): RevisionTree {
  return {
    revision: {
      id: randomUUID(),
      resume_id: "",
      revision_number: 1,
      kind: "discovery",
      status: "in_progress",
      current_step: "upload",
    },
    contact: {
      revision_id: "",
      full_name: "",
      email: "",
      phone: "",
      linkedin: "",
      github: "",
      location_city: "",
      location_region: "",
    },
    sections: [],
    files: [],
    comments: [],
  };
}
