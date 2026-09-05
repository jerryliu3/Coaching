import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnalysisForm } from "./analysis-form";

describe("AnalysisForm", () => {
  it("posts notes and refreshes the knowledge base", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ summary: "Stored notes as guidelines (AI key not configured)." })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ guidelines: [{ id: "g1", body: "Lead with impact" }] })));
    vi.stubGlobal("fetch", fetchMock);
    render(<AnalysisForm initialGuidelines={[]} />);
    await userEvent.type(screen.getByPlaceholderText(/Revision notes/), "Lead with impact");
    await userEvent.click(screen.getByRole("button", { name: "Extract guidelines" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/analysis", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByText(/Stored notes/)).toBeInTheDocument();
    expect(screen.getAllByText("Lead with impact").length).toBeGreaterThan(0);
  });
});
