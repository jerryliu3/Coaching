import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BulletEditor } from "./bullet-editor";
import { testBullet } from "@/lib/test-fixtures";

describe("BulletEditor", () => {
  it("saves multiline bullet edits on blur", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const onReload = vi.fn(async () => undefined);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BulletEditor entryId="e1" revisionId="r1" bullets={[testBullet()]} comments={[]} onReload={onReload} />,
    );

    const field = screen.getByDisplayValue("Built an API using Python");
    await userEvent.clear(field);
    await userEvent.type(field, "Shipped an API");
    await userEvent.tab();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/entries/e1/bullets",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(onReload).toHaveBeenCalled();
  });

  it("creates an anchored comment from a text selection", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const onReload = vi.fn(async () => undefined);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <BulletEditor entryId="e1" revisionId="r1" bullets={[testBullet()]} comments={[]} onReload={onReload} />,
    );

    const field = screen.getByDisplayValue("Built an API using Python") as HTMLTextAreaElement;
    field.focus();
    field.setSelectionRange(0, 5);
    fireEvent.mouseUp(field);
    await userEvent.type(screen.getByPlaceholderText("What should change here?"), "Add metric");
    await userEvent.click(screen.getByRole("button", { name: "Add comment" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/comments",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
