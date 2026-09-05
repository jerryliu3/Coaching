import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepBody } from "./step-body";
import { testEntry, testSection, testTree } from "@/lib/test-fixtures";

describe("StepBody", () => {
  const onChange = vi.fn();
  const onReload = vi.fn(async () => undefined);
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

  beforeEach(() => {
    onChange.mockReset();
    onReload.mockClear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = vi.fn(() => "blob:resume");
      },
    );
  });

  it("uploads a file for revision 1", async () => {
    render(
      <StepBody
        tree={testTree({ files: [{ id: "f1", revision_id: "r1", kind: "original_upload", filename: "old.txt", storage_path: "p", mime_type: "text/plain" }] })}
        step={{ id: "upload", kind: "upload", label: "Upload" }}
        onChange={onChange}
        onReload={onReload}
      />,
    );
    expect(screen.getByText("Upload the resume")).toBeInTheDocument();
    expect(screen.getByText("old.txt")).toBeInTheDocument();
    const file = new File(["Jane"], "resume.txt", { type: "text/plain" });
    await userEvent.upload(screen.getByLabelText("Resume file"), file);
    expect(fetchMock).toHaveBeenCalled();
    expect(onReload).toHaveBeenCalled();
  });

  it("shows formatting order", () => {
    render(
      <StepBody tree={testTree()} step={{ id: "format", kind: "format", label: "Format" }} onChange={onChange} onReload={onReload} />,
    );
    expect(screen.getByText(/Work Experience/)).toBeInTheDocument();
  });

  it("saves contact fields on blur", async () => {
    render(
      <StepBody tree={testTree()} step={{ id: "contact", kind: "contact", label: "Contact" }} onChange={onChange} onReload={onReload} />,
    );
    const name = screen.getByDisplayValue("Jane Doe");
    await userEvent.clear(name);
    await userEvent.type(name, "Ada Lovelace");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/revisions/r1", expect.objectContaining({ method: "PATCH" }));
  });

  it("syncs bullets from the combined textarea", async () => {
    render(
      <StepBody
        tree={testTree()}
        step={{ id: "experience/0", kind: "experience", label: "Job", entryIndex: 0 }}
        onChange={onChange}
        onReload={onReload}
      />,
    );
    const bullet = screen.getByDisplayValue("Built an API using Python");
    await userEvent.clear(bullet);
    await userEvent.type(bullet, "Shipped an API");
    await userEvent.tab();
    expect(fetchMock).toHaveBeenCalledWith("/api/entries/e1/bullets", expect.objectContaining({ method: "POST" }));
  });

  it("shows empty experience and project copy", () => {
    const empty = testTree({ sections: [testSection({ entries: [] })] });
    const { rerender } = render(
      <StepBody
        tree={empty}
        step={{ id: "experience/0", kind: "experience", label: "Job", entryIndex: 0 }}
        onChange={onChange}
        onReload={onReload}
      />,
    );
    expect(screen.getByText(/Add a work experience entry/)).toBeInTheDocument();
    rerender(
      <StepBody
        tree={empty}
        step={{ id: "project/0", kind: "project", label: "Project", entryIndex: 0 }}
        onChange={onChange}
        onReload={onReload}
      />,
    );
    expect(screen.getByText("No project yet.")).toBeInTheDocument();
  });

  it("exports docx and marks the revision sent", async () => {
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    render(
      <StepBody tree={testTree()} step={{ id: "export", kind: "export", label: "Export" }} onChange={onChange} onReload={onReload} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Download Word" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/export", expect.objectContaining({ method: "POST" }));
    expect(click).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Mark sent to client" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/revisions/r1", expect.objectContaining({ method: "PATCH" }));
  });
});
