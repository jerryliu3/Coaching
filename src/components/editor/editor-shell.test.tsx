import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorShell } from "./editor-shell";
import { testTree } from "@/lib/test-fixtures";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("./editor-sidebar", () => ({
  EditorSidebar: () => <div>Sidebar</div>,
  useResizableSidebar: () => ({
    width: 380,
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
  }),
}));

describe("EditorShell", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ tree: testTree() }))));
  });

  it("shows revision-aware guidance and navigates to the next step", async () => {
    render(<EditorShell resumeId="resume-1" revisionNumber={1} stepId="contact" initialTree={testTree()} />);
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getAllByText(/open questions/i).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(push).toHaveBeenCalledWith("/resumes/resume-1/rev/1/experience/0");
  });
});
