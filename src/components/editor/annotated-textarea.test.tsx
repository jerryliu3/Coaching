import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnnotatedTextarea } from "./annotated-textarea";

describe("AnnotatedTextarea", () => {
  it("renders highlighted ranges and updates text", async () => {
    const onChange = vi.fn();
    const onHoverComment = vi.fn();
    const ref = createRef<HTMLTextAreaElement>();

    render(
      <AnnotatedTextarea
        textareaRef={ref}
        value="Built an API"
        onChange={onChange}
        comments={[{ id: "c1", anchor_start: 0, anchor_end: 5, status: "open" }]}
        pendingRange={{ start: 6, end: 8 }}
        hoveredCommentId={null}
        onHoverComment={onHoverComment}
        rows={4}
      />,
    );

    expect(screen.getAllByText(/Built|an/).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByRole("textbox"), "!");
    expect(onChange).toHaveBeenCalled();
  });
});
