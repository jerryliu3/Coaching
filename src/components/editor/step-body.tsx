"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Entry, RevisionTree, WorkflowStep } from "@/lib/types";
import { AiPanel } from "./ai-panel";
import { CommentsPanel } from "./comments-panel";

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
    if (!entry) return <p>Add a work experience entry from upload or type one below.</p>;
    return <EntryStep tree={tree} entry={entry} onReload={onReload} />;
  }
  if (step.kind === "project") {
    const entry = projects?.entries[step.entryIndex ?? 0];
    if (!entry) return <p>No project yet.</p>;
    return <EntryStep tree={tree} entry={entry} onReload={onReload} />;
  }
  if (step.kind === "education") {
    const entries = tree.sections.find((s) => s.kind === "education")?.entries ?? [];
    return (
      <div className="space-y-8">
        {entries.map((entry) => (
          <EntryStep key={entry.id} tree={tree} entry={entry} onReload={onReload} showCourses />
        ))}
      </div>
    );
  }
  if (step.kind === "skills") {
    const entries = tree.sections.find((s) => s.kind === "skills")?.entries ?? [];
    return (
      <div className="space-y-8">
        {entries.map((entry) => (
          <EntryStep key={entry.id} tree={tree} entry={entry} onReload={onReload} skills />
        ))}
      </div>
    );
  }
  if (step.kind === "export") return <ExportStep tree={tree} />;
  const extras = tree.sections.find((s) => s.kind === step.kind);
  return (
    <div className="space-y-8">
      {(extras?.entries ?? []).map((entry) => (
        <EntryStep key={entry.id} tree={tree} entry={entry} onReload={onReload} />
      ))}
    </div>
  );
}

function UploadStep({ tree, onReload }: { tree: RevisionTree; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
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
    <div className="space-y-4 rounded-xl border p-6">
      <h2 className="text-lg font-medium">{tree.revision.revision_number === 1 ? "Upload the resume" : "Upload the client return"}</h2>
      <p className="text-sm text-muted-foreground">DOCX or PDF. The original file is stored even after we parse it into fields.</p>
      <Input
        type="file"
        aria-label="Resume file"
        accept=".docx,.pdf,.txt"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {tree.files.length ? (
        <ul className="text-sm text-muted-foreground">
          {tree.files.map((f) => (
            <li key={f.id}>
              {f.kind}: {f.filename}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FormatStep({ tree }: { tree: RevisionTree }) {
  const order = tree.sections.map((s) => s.heading || s.kind).join(" → ");
  return (
    <div className="space-y-3 rounded-xl border p-6">
      <h2 className="text-lg font-medium">Formatting pass</h2>
      <p className="text-sm">Current section order: {order || "not parsed yet"}</p>
      <p className="text-sm text-muted-foreground">
        Use the following steps to fix dates, dashes, headers, and order. You do not need to squeeze the resume onto one page.
      </p>
    </div>
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
    <div className="grid gap-3 rounded-xl border p-6">
      {fields.map(([key, label]) => (
        <div key={key} className="grid gap-1">
          <Label>{label}</Label>
          <Input defaultValue={c[key]} onBlur={(e) => save({ [key]: e.target.value })} />
        </div>
      ))}
    </div>
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
  async function patch(field: string, value: string | boolean) {
    await fetch(`/api/revisions/${tree.revision.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id, entry: { [field]: value } }),
    });
    await onReload();
  }
  async function saveBullet(id: string, text: string) {
    await fetch(`/api/bullets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_text: text, revision_id: tree.revision.id }),
    });
    await onReload();
  }
  async function addBullet() {
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: entry.id, text: "" }),
    });
    await onReload();
  }
  return (
    <div className="space-y-4 rounded-xl border p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={skills ? "Category" : "Organization / title"} value={entry.org_name} onSave={(v) => patch("org_name", v)} />
        <Field label={skills ? "" : "Role / degree"} value={entry.role_title} onSave={(v) => patch("role_title", v)} />
        <Field label="Location" value={entry.location} onSave={(v) => patch("location", v)} />
        <Field label="URL" value={entry.url} onSave={(v) => patch("url", v)} />
        <Field label="Start" value={entry.start_date ?? ""} onSave={(v) => patch("start_date", v)} />
        <Field label="End" value={entry.end_date ?? ""} onSave={(v) => patch("end_date", v)} />
        {showCourses ? <Field label="GPA" value={entry.gpa} onSave={(v) => patch("gpa", v)} /> : null}
        {showCourses ? <Field label="Courses" value={entry.courses} onSave={(v) => patch("courses", v)} /> : null}
      </div>
      <div className="space-y-3">
        {entry.bullets.map((bullet) => (
          <div key={bullet.id} className="space-y-2">
            <Textarea
              defaultValue={bullet.current_text}
              onBlur={(e) => saveBullet(bullet.id, e.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {bullet.has_metric ? <span>metric</span> : <span>no metric</span>}
              {bullet.has_tools ? <span>tools</span> : null}
              {bullet.has_first_person ? <span className="text-destructive">first person</span> : null}
              <span>{bullet.xyz_pattern}</span>
            </div>
            <CommentsPanel
              revisionId={tree.revision.id}
              bulletId={bullet.id}
              comments={tree.comments.filter((c) => c.bullet_id === bullet.id)}
              onReload={onReload}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addBullet}>
          Add bullet
        </Button>
      </div>
      <AiPanel revisionId={tree.revision.id} entryId={entry.id} />
    </div>
  );
}

function Field({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  if (!label) return null;
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      <Input defaultValue={value} onBlur={(e) => onSave(e.target.value)} />
    </div>
  );
}

function ExportStep({ tree }: { tree: RevisionTree }) {
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
    <div className="space-y-4 rounded-xl border p-6">
      <h2 className="text-lg font-medium">Export</h2>
      <p className="text-sm text-muted-foreground">
        Generates a new DOCX or PDF from the structured resume. Open the DOCX in Pages if you need a Pages file. The original upload stays in storage.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => download("docx")}>Download Word</Button>
        <Button variant="outline" onClick={() => download("pdf")}>
          Download PDF
        </Button>
      </div>
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
  );
}
