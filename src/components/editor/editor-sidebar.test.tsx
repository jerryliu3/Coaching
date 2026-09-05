import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorSidebar, useResizableSidebar } from "./editor-sidebar";
import { testTree } from "@/lib/test-fixtures";

function ResizeHarness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, onPointerDown, onPointerMove, onPointerUp } = useResizableSidebar(380, containerRef);
  return (
    <div ref={containerRef} style={{ width: 800 }}>
      <button type="button" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        Drag
      </button>
      <span data-testid="width">{width}</span>
    </div>
  );
}

describe("EditorSidebar", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "Jane Doe\n\nWork Experience\nAcme Corp\n- Built APIs",
          filename: "resume.txt",
          sections: [
            { id: "header", label: "Header", kind: "header", start: 0, end: 8 },
            { id: "exp-0", label: "Acme Corp", kind: "experience", entryIndex: 0, start: 24, end: 48 },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads reference text and switches to the checklist tab", async () => {
    const onTreeReload = vi.fn(async () => undefined);
    render(
      <EditorSidebar
        resumeId="resume-1"
        step={{ id: "experience/0", kind: "experience", label: "Acme Corp", entryIndex: 0 }}
        revisionKind="discovery"
        tree={testTree()}
        width={360}
        onTreeReload={onTreeReload}
      />,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("resume.txt")).toBeInTheDocument());
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Keep in mind" }));
    expect(screen.getByText(/open questions/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Guided flow" }));
    expect(screen.getByText(/org, role, location, and dates/i)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Yes" })[0]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/revisions/r1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    expect(onTreeReload).toHaveBeenCalled();
  });

  it("clamps sidebar width while dragging", async () => {
    render(<ResizeHarness />);
    const handle = screen.getByRole("button", { name: "Drag" });
    handle.setPointerCapture = vi.fn();
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: handle },
      { coords: { clientX: 100 } },
      { keys: "[/MouseLeft]" },
    ]);
    expect(Number(screen.getByTestId("width").textContent)).toBeLessThanOrEqual(640);
  });
});
