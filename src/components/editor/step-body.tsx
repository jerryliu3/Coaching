"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Entry, ResumeFile, RevisionTree, WorkflowStep } from "@/lib/types";
import { AiPanel } from "./ai-panel";
import { BulletEditor } from "./bullet-editor";

export function StepBody({
  tree,
  step,
  onChange,
  onReload,
}: {
  tree: RevisionTree;
  step: WorkflowStep;
  onChange: (tree: RevisionTree) => void;
  onReload: () => Promise<void>;
}) {
  const experience = tree.sections.find((s) => s.kind === "experience");
  const projects = tree.sections.find((s) => s.kind === "project");

  if (step.kind === "upload") return <UploadStep tree={tree} onReload={onReload} />;
  if (step.kind === "format") return <FormatStep tree={tree} />;
  if (step.kind === "contact") return <ContactStep tree={tree} onChange={onChange} />;
  if (step.kind === "experience") {
    const entry = experience?.entries[step.entryIndex ?? 0];
    if (!entry) return <EmptyHint text="Add a work experience entry from upload or type one below." />;
    return <EntryStep tree={tree} entry={entry} onReload={onReload} />;
  }
  if (step.kind === "project") {
    const entry = projects?.entries[step.entryIndex ?? 0];
    if (!entry) return <EmptyHint text="No project yet." />;
    return <EntryStep tree={tree} entry={entry} onReload={onReload} />;
  }
  if (step.kind === "education") {
    const entry = tree.sections.find((s) => s.kind === "education")?.entries[step.entryIndex ?? 0];
    if (!entry) return <EmptyHint text="No education entry yet." />;
    return <EntryStep tree={tree} entry={entry} onReload={onReload} showCourses />;
  }
  if (step.kind === "skills") {
    const entries = tree.sections.find((s) => s.kind === "skills")?.entries ?? [];
    if (!entries.length) return <EmptyHint text="No skills entry yet." />;
    return (
      <div className="space-y-6">
        {entries.map((entry) => (
          <EntryStep key={entry.id} tree={tree} entry={entry} onReload={onReload} skills />
        ))}
      </div>
    );
  }
  if (step.kind === "export") return <ExportStep tree={tree} revisionNumber={tree.revision.revision_number} />;
  const extras = tree.sections.find((s) => s.kind === step.kind);
  return (
    <div className="space-y-6">
      {(extras?.entries ?? []).map((entry) => (
        <EntryStep key={entry.id} tree={tree} entry={entry} onReload={onReload} />
      ))}
    </div>
  );
}

function Shell({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Shell title="Nothing here yet">
      <p className="text-sm text-muted-foreground">{text}</p>
    </Shell>
  );
}

function uniqueFiles(files: ResumeFile[]) {
  const map = new Map<string, ResumeFile>();
  for (const f of files) {
    map.set(`${f.kind}:${f.filename}`, f);
  }
  return [...map.values()];
}

function UploadStep({ tree, onReload }: { tree: RevisionTree; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const files = uniqueFiles(tree.files);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("revision_id", tree.revision.id);
    form.set("kind", tree.revision.revision_number === 1 ? "original_upload" : "client_return");
    await fetch("/api/parse", { method: "POST", body: form });
    await onReload();
    setBusy(false);
  }

  return (
    <Shell
      title={tree.revision.revision_number === 1 ? "Upload the resume" : "Upload the client return"}
      description="DOCX or PDF. We store the original and parse it into editable sections."
    >
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Input
          type="file"
          aria-label="Resume file"
          accept=".docx,.pdf,.txt"
          disabled={busy}
          className="mx-auto max-w-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {busy ? <p className="mt-3 text-sm text-muted-foreground">Parsing…</p> : null}
      </div>
      {files.length ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/60" />
              <span className="capitalize">{f.kind.replace("_", " ")}</span>
              <span>—</span>
              <span>{f.filename}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Shell>
  );
}

function FormatStep({ tree }: { tree: RevisionTree }) {
  const order = tree.sections.map((s) => s.heading || s.kind).join(" → ");
  return (
    <Shell title="Formatting pass" description="Fix dates, dashes, headers, and section order before editing content.">
      <p className="text-sm">
        Current order: <span className="font-medium text-foreground">{order || "not parsed yet"}</span>
      </p>
    </Shell>
  );
}

function ContactStep({ tree, onChange }: { tree: RevisionTree; onChange: (tree: RevisionTree) => void }) {
  const c = tree.contact;
  async function save(patch: Record<string, string>) {
    const contact = { ...c, ...patch };
    onChange({ ...tree, contact });
    await fetch(`/api/revisions/${tree.revision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact }),
    });
  }
  const fields = [
    ["full_name", "Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["linkedin", "LinkedIn"],
    ["github", "GitHub"],
    ["location_city", "City"],
    ["location_region", "State / country"],
  ] as const;
  return (
    <Shell title="Contact">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input defaultValue={c[key]} onBlur={(e) => save({ [key]: e.target.value })} className="bg-background" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

function EntryStep({
  tree,
  entry,
  onReload,
  showCourses,
  skills,
}: {
  tree: RevisionTree;
  entry: Entry;
  onReload: () => Promise<void>;
  showCourses?: boolean;
  skills?: boolean;
}) {
  const title = entry.org_name?.trim() || (skills ? "Skills" : entry.role_title?.trim() || "Entry");

  async function patch(field: string, value: string | boolean) {
    await fetch(`/api/revisions/${tree.revision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id, entry: { [field]: value } }),
    });
    await onReload();
  }

  const entryComments = useMemo(
    () => tree.comments.filter((c) => c.entry_id === entry.id || entry.bullets.some((b) => b.id === c.bullet_id)),
    [entry.bullets, entry.id, tree.comments],
  );

  return (
    <Shell title={title} description={skills ? undefined : [entry.role_title, entry.location].filter(Boolean).join(" · ")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={skills ? "Category" : "Organization"} value={entry.org_name} onSave={(v) => patch("org_name", v)} />
        {!skills ? <Field label="Role / degree" value={entry.role_title} onSave={(v) => patch("role_title", v)} /> : null}
        {!skills ? <Field label="Location" value={entry.location} onSave={(v) => patch("location", v)} /> : null}
        {!skills ? <Field label="URL" value={entry.url} onSave={(v) => patch("url", v)} /> : null}
        {!skills ? <Field label="Start" value={entry.start_date ?? ""} onSave={(v) => patch("start_date", v)} /> : null}
        {!skills ? <Field label="End" value={entry.end_date ?? ""} onSave={(v) => patch("end_date", v)} /> : null}
        {showCourses ? <Field label="GPA" value={entry.gpa} onSave={(v) => patch("gpa", v)} /> : null}
        {showCourses ? <Field label="Courses" value={entry.courses} onSave={(v) => patch("courses", v)} /> : null}
      </div>

      {!skills ? (
        <div className="mt-6 border-t border-border/60 pt-6">
          <BulletEditor
            entryId={entry.id}
            revisionId={tree.revision.id}
            bullets={entry.bullets}
            comments={entryComments}
            onReload={onReload}
          />
        </div>
      ) : (
        <div className="mt-4">
          <BulletEditor
            entryId={entry.id}
            revisionId={tree.revision.id}
            bullets={entry.bullets}
            comments={entryComments}
            onReload={onReload}
          />
        </div>
      )}

      <div className="mt-6 border-t border-border/60 pt-4">
        <AiPanel revisionId={tree.revision.id} entryId={entry.id} />
      </div>
    </Shell>
  );
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  if (!label) return null;
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input defaultValue={value} onBlur={(e) => onSave(e.target.value)} className="bg-background" />
    </div>
  );
}

function ExportStep({ tree, revisionNumber }: { tree: RevisionTree; revisionNumber: number }) {
  async function download(format: "docx" | "pdf") {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_id: tree.revision.id, format }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume.${format}`;
    a.click();
  }

  return (
    <Shell
      title="Export"
      description="Download a fresh DOCX or PDF from the structured resume. The original upload stays in storage."
    >
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void download("docx")}>Download Word</Button>
        <Button variant="outline" onClick={() => void download("pdf")}>Download PDF</Button>
        <Button
          variant="outline"
          onClick={() =>
            fetch(`/api/revisions/${tree.revision.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "sent" }),
            })
          }
        >
          Mark sent to client
        </Button>
      </div>
      {revisionNumber < 10 ? (
        <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          When the client replies, click <strong className="text-foreground">Start revision {revisionNumber + 1}</strong> below
          to copy this revision forward and upload their return.
        </p>
      ) : null}
    </Shell>
  );
}
