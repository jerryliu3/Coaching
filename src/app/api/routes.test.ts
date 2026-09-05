import { generateObject } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testTree } from "@/lib/test-fixtures";

const user = { id: "user-1" };
const currentProfile = vi.fn();
const listResumes = vi.fn();
const createResume = vi.fn();
const getResume = vi.fn();
const assignResume = vi.fn();
const copyRevision = vi.fn();
const getRevisionTree = vi.fn();
const saveContact = vi.fn();
const saveEntry = vi.fn();
const setCurrentStep = vi.fn();
const setRevisionStatus = vi.fn();
const saveBullet = vi.fn();
const addBullet = vi.fn();
const saveComment = vi.fn();
const applyParsedResume = vi.fn();
const listGuidelines = vi.fn();
const insertGuidelines = vi.fn();
const upsertFileRecord = vi.fn();
const storageUpload = vi.fn();
const tableInsert = vi.fn();

vi.mock("@/lib/data", () => ({
  currentProfile: (...args: unknown[]) => currentProfile(...args),
  listResumes: (...args: unknown[]) => listResumes(...args),
  createResume: (...args: unknown[]) => createResume(...args),
  getResume: (...args: unknown[]) => getResume(...args),
  assignResume: (...args: unknown[]) => assignResume(...args),
  copyRevision: (...args: unknown[]) => copyRevision(...args),
  getRevisionTree: (...args: unknown[]) => getRevisionTree(...args),
  saveContact: (...args: unknown[]) => saveContact(...args),
  saveEntry: (...args: unknown[]) => saveEntry(...args),
  setCurrentStep: (...args: unknown[]) => setCurrentStep(...args),
  setRevisionStatus: (...args: unknown[]) => setRevisionStatus(...args),
  saveBullet: (...args: unknown[]) => saveBullet(...args),
  addBullet: (...args: unknown[]) => addBullet(...args),
  saveComment: (...args: unknown[]) => saveComment(...args),
  applyParsedResume: (...args: unknown[]) => applyParsedResume(...args),
  listGuidelines: (...args: unknown[]) => listGuidelines(...args),
  insertGuidelines: (...args: unknown[]) => insertGuidelines(...args),
  upsertFileRecord: (...args: unknown[]) => upsertFileRecord(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(async () => ({
    storage: { from: () => ({ upload: storageUpload }) },
    from: () => ({ insert: tableInsert }),
  })),
}));

vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn(async () => ({ value: "Jane\nWork Experience\nAcme\n- Built it" })) },
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentProfile.mockResolvedValue({ user });
  listResumes.mockResolvedValue([{ id: "r1" }]);
  createResume.mockResolvedValue({ resume: { id: "r1" }, revision: { id: "rev1" } });
  getResume.mockResolvedValue({ id: "r1", revisions: [{ id: "rev1", revision_number: 1 }] });
  getRevisionTree.mockResolvedValue(testTree());
  listGuidelines.mockResolvedValue([]);
  storageUpload.mockResolvedValue({ error: null });
  upsertFileRecord.mockResolvedValue("file-1");
  tableInsert.mockResolvedValue({});
  addBullet.mockResolvedValue({ id: "b-new" });
  saveComment.mockResolvedValue({ id: "c-new", body: "hi" });
  delete process.env.AI_GATEWAY_API_KEY;
});

describe("API auth", () => {
  it("rejects anonymous resume list and create", async () => {
    currentProfile.mockResolvedValue({ user: null });
    const { GET, POST } = await import("./resumes/route");
    expect((await GET()).status).toBe(401);
    expect((await POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
  });

  it("rejects anonymous analysis, comments, export, and parse", async () => {
    currentProfile.mockResolvedValue({ user: null });
    const analysis = await import("./analysis/route");
    const comments = await import("./comments/route");
    const exp = await import("./export/route");
    const parse = await import("./parse/route");
    const ai = await import("./ai/route");
    expect((await analysis.GET()).status).toBe(401);
    expect((await analysis.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await comments.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await comments.PATCH(new Request("http://x", { method: "PATCH", body: "{}" }))).status).toBe(401);
    expect((await exp.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await parse.POST(new Request("http://x", { method: "POST", body: new FormData() }))).status).toBe(401);
    expect((await ai.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
  });
});

describe("resumes", () => {
  it("lists and creates resumes", async () => {
    const { GET, POST } = await import("./resumes/route");
    const listed = await GET();
    expect(await listed.json()).toEqual({ resumes: [{ id: "r1" }] });
    const created = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Jane" }) }),
    );
    expect(createResume).toHaveBeenCalledWith({ name: "Jane" });
    expect((await created.json()).resume.id).toBe("r1");
  });

  it("loads and assigns a resume", async () => {
    const { GET, PATCH } = await import("./resumes/[id]/route");
    const got = await GET(new Request("http://x"), { params: Promise.resolve({ id: "r1" }) });
    expect((await got.json()).resume.id).toBe("r1");
    await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ assigneeId: "u2" }) }), {
      params: Promise.resolve({ id: "r1" }),
    });
    expect(assignResume).toHaveBeenCalledWith("r1", "u2");
  });

  it("starts the next revision from the latest one", async () => {
    getResume.mockResolvedValue({
      revisions: [
        { id: "old", revision_number: 1 },
        { id: "new", revision_number: 2 },
      ],
    });
    copyRevision.mockResolvedValue({ id: "rev3", revision_number: 3 });
    const { POST } = await import("./resumes/[id]/revisions/route");
    const res = await POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id: "r1" }) });
    expect(copyRevision).toHaveBeenCalledWith("r1", "new");
    expect((await res.json()).revision.revision_number).toBe(3);
  });

  it("returns 400 when a resume has no revisions", async () => {
    getResume.mockResolvedValue({ revisions: [] });
    const { POST } = await import("./resumes/[id]/revisions/route");
    const res = await POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(400);
  });
});

describe("revisions and bullets", () => {
  it("returns the tree and persists step, contact, and entry patches", async () => {
    const { GET, PATCH } = await import("./revisions/[id]/route");
    const got = await GET(new Request("http://x"), { params: Promise.resolve({ id: "rev1" }) });
    expect((await got.json()).tree.revision.id).toBe("r1");
    await PATCH(
      new Request("http://x", {
        method: "PATCH",
        body: JSON.stringify({
          current_step: "contact",
          status: "sent",
          contact: { full_name: "Ada" },
          entryId: "e1",
          entry: { org_name: "Acme" },
        }),
      }),
      { params: Promise.resolve({ id: "rev1" }) },
    );
    expect(setCurrentStep).toHaveBeenCalledWith("rev1", "contact");
    expect(setRevisionStatus).toHaveBeenCalledWith("rev1", "sent");
    expect(saveContact).toHaveBeenCalled();
    expect(saveEntry).toHaveBeenCalledWith("e1", { org_name: "Acme" });
  });

  it("saves bullet text with the current user", async () => {
    const { PATCH } = await import("./bullets/[id]/route");
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ current_text: "Shipped it", revision_id: "rev1" }) }),
      { params: Promise.resolve({ id: "b1" }) },
    );
    expect(saveBullet).toHaveBeenCalledWith("b1", "Shipped it", "user-1", "rev1");
    expect(res.status).toBe(200);
  });
});

describe("comments", () => {
  it("adds a bullet when entry_id and text are sent without a body", async () => {
    const { POST } = await import("./comments/route");
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ entry_id: "e1", text: "New bullet" }) }),
    );
    expect(addBullet).toHaveBeenCalledWith("e1", "New bullet");
    expect((await res.json()).bullet.id).toBe("b-new");
  });

  it("creates and updates comments", async () => {
    const { POST, PATCH } = await import("./comments/route");
    await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ revision_id: "rev1", body: "hi" }) }));
    expect(saveComment).toHaveBeenCalledWith(expect.objectContaining({ body: "hi", created_by: "user-1" }));
    await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ id: "c1", body: "edited" }) }));
    expect(saveComment).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", created_by: "user-1" }));
  });
});

describe("parse", () => {
  it("requires a file and revision", async () => {
    const { POST } = await import("./parse/route");
    const form = new FormData();
    const res = await POST(new Request("http://x", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });

  it("stores a text upload and parses it", async () => {
    const { POST } = await import("./parse/route");
    const form = new FormData();
    form.set("file", new File(["Jane\nWork Experience\nAcme\n- Built it"], "resume.txt", { type: "text/plain" }));
    form.set("revision_id", "rev1");
    const res = await POST(new Request("http://x", { method: "POST", body: form }));
    const json = await res.json();
    expect(applyParsedResume).toHaveBeenCalled();
    expect(json.path).toContain("rev1");
  });

  it("returns storage errors", async () => {
    storageUpload.mockResolvedValue({ error: { message: "quota" } });
    const { POST } = await import("./parse/route");
    const form = new FormData();
    form.set("file", new File(["x"], "resume.txt"));
    form.set("revision_id", "rev1");
    expect((await POST(new Request("http://x", { method: "POST", body: form }))).status).toBe(400);
  });

  it("extracts text from docx and pdf uploads", async () => {
    const { POST } = await import("./parse/route");
    const docx = new FormData();
    docx.set("file", new File(["zip"], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
    docx.set("revision_id", "rev1");
    expect((await POST(new Request("http://x", { method: "POST", body: docx }))).status).toBe(200);

    const pdf = new FormData();
    pdf.set("file", new File(["%PDF Jane"], "resume.pdf", { type: "application/pdf" }));
    pdf.set("revision_id", "rev1");
    expect((await POST(new Request("http://x", { method: "POST", body: pdf }))).status).toBe(200);
  });
});

describe("ai and analysis", () => {
  it("returns the no-key fallback for AI review", async () => {
    const { POST } = await import("./ai/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ revision_id: "r1", entry_id: "e1", trigger: "review" }),
      }),
    );
    const json = await res.json();
    expect(json.result.issues[0]).toMatch(/AI_GATEWAY_API_KEY/);
    expect(json.result.suggested_text).toContain("Built an API");
  });

  it("stores analysis notes as guidelines when AI is not configured", async () => {
    const { GET, POST } = await import("./analysis/route");
    listGuidelines.mockResolvedValue([{ id: "g1", body: "Lead with impact" }]);
    expect((await (await GET()).json()).guidelines[0].body).toBe("Lead with impact");
    await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ notes: "Lead with impact\n\nMove metrics up" }),
      }),
    );
    expect(insertGuidelines).toHaveBeenCalledWith([
      expect.objectContaining({ body: "Lead with impact" }),
      expect.objectContaining({ body: "Move metrics up" }),
    ]);
  });

  it("calls the model when an AI key is present", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        issues: [],
        open_questions: [],
        suggested_text: "Led a team",
        reviewer_comment: "Stronger verb",
      },
    } as never);
    const { POST } = await import("./ai/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ revision_id: "r1", entry_id: "e1", trigger: "review" }),
      }),
    );
    expect((await res.json()).result.suggested_text).toBe("Led a team");
    expect(tableInsert).toHaveBeenCalled();
  });

  it("extracts guidelines with the model when an AI key is present", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    vi.mocked(generateObject).mockResolvedValue({
      object: { guidelines: [{ body: "Lead with impact" }], summary: "One rule" },
    } as never);
    const { POST } = await import("./analysis/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ notes: "x" }) }));
    expect((await res.json()).summary).toBe("One rule");
    expect(insertGuidelines).toHaveBeenCalledWith([expect.objectContaining({ body: "Lead with impact" })]);
  });

  it("uses contact text when the AI request has no matching entry", async () => {
    const { POST } = await import("./ai/route");
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ revision_id: "r1", entry_id: "missing", trigger: "review" }),
      }),
    );
    expect((await res.json()).result.suggested_text).toBe("");
  });
});

describe("export", () => {
  it("returns a docx attachment", async () => {
    const { POST } = await import("./export/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ revision_id: "r1" }) }));
    expect(res.headers.get("Content-Disposition")).toMatch(/Jane-Doe.docx/);
    expect(res.headers.get("Content-Type")).toMatch(/wordprocessingml/);
    expect(upsertFileRecord).toHaveBeenCalled();
  });

  it("returns a pdf attachment", async () => {
    const { POST } = await import("./export/route");
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ revision_id: "r1", format: "pdf" }) }),
    );
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });
});
