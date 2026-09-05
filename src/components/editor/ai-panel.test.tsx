import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiPanel } from "./ai-panel";

describe("AiPanel", () => {
  it("sends the selected trigger to the AI route", async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ result: { issues: ["Add a metric"] } })),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPanel revisionId="r1" entryId="e1" />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "apply");
    await userEvent.type(screen.getByPlaceholderText("Optional extra instruction"), "be concise");
    await userEvent.click(screen.getByRole("button", { name: "Run AI" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ revision_id: "r1", entry_id: "e1", trigger: "apply", extra_prompt: "be concise" });
    expect(await screen.findByText(/Add a metric/)).toBeInTheDocument();
  });
});
