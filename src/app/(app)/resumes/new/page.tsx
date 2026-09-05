"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewResumePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, title }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not create");
      setBusy(false);
      return;
    }
    router.push(`/resumes/${json.resume.id}/rev/1/upload`);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">New resume</h1>
      <div className="grid gap-2">
        <Label htmlFor="name">Candidate name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="title">Internal title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jane Doe — May 2026" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Start editing"}</Button>
    </form>
  );
}
