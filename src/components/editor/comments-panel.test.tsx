import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentsPanel } from "./comments-panel";
import { testComment } from "@/lib/test-fixtures";

describe("CommentsPanel", () => {
  it("hides deleted comments and posts a new one", async () => {
    const onReload = vi.fn(async () => {});
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <CommentsPanel
        revisionId="r1"
        bulletId="b1"
        comments={[testComment(), testComment({ id: "c-del", body: "gone", status: "deleted" })]}
        onReload={onReload}
      />,
    );
    expect(screen.getByDisplayValue("Need a metric")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("gone")).toBeNull();
    await userEvent.type(screen.getByPlaceholderText("Comment on this bullet"), "Tighten this");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/comments",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(onReload).toHaveBeenCalled();
  });

  it("resolves an existing comment", async () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <CommentsPanel revisionId="r1" bulletId="b1" comments={[testComment()]} onReload={vi.fn(async () => {})} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/comments", expect.objectContaining({ method: "PATCH" }));
  });
});
