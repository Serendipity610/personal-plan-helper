import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanInlineEdit } from "@/components/plans/PlanInlineEdit";

function renderEdit(
  props: Partial<React.ComponentProps<typeof PlanInlineEdit>> = {},
) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  const value = props.value ?? "原始标题";
  const renderResult = render(
    <div>
      <PlanInlineEdit
        value={value}
        onSave={onSave}
        {...props}
      />
      <button data-testid="outside">外部元素</button>
    </div>,
  );
  return {
    onSave,
    user: userEvent.setup(),
    ...renderResult,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlanInlineEdit", () => {
  describe("display mode", () => {
    it("renders the value as text", () => {
      renderEdit();
      expect(screen.getByText("原始标题")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("has an accessible label indicating edit action", () => {
      renderEdit();
      const text = screen.getByText("原始标题");
      expect(text).toHaveAttribute("role", "button");
      expect(text).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("entering edit mode", () => {
    it("enters edit mode on click and focuses input", async () => {
      const { user } = renderEdit({ onEditStart: vi.fn() });
      await user.click(screen.getByText("原始标题"));

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("原始标题");
      expect(input).toHaveFocus();
    });

    it("enters edit mode on Enter key press", async () => {
      const { user } = renderEdit();
      screen.getByText("原始标题").focus();
      await user.keyboard("{Enter}");

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("does not enter edit mode when disabled", async () => {
      const { user } = renderEdit({ disabled: true });
      await user.click(screen.getByText("原始标题"));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("calls onEditStart when entering edit mode", async () => {
      const onEditStart = vi.fn();
      const { user } = renderEdit({ onEditStart });
      await user.click(screen.getByText("原始标题"));

      expect(onEditStart).toHaveBeenCalledTimes(1);
    });
  });

  describe("saving", () => {
    it("saves on Enter and exits edit mode", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user, rerender } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "新标题");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("新标题");
      });
      // Simulate parent re-rendering with the updated value
      rerender(
        <div>
          <PlanInlineEdit value="新标题" onSave={onSave} />
          <button data-testid="outside">外部元素</button>
        </div>,
      );
      // Should exit edit mode after successful save
      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
      expect(screen.getByText("新标题")).toBeInTheDocument();
    });

    it("saves on blur (clicking outside)", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "新标题");
      await user.click(screen.getByTestId("outside"));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("新标题");
      });
      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
    });

    it("does not save if value is unchanged", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      // Don't change the value, just blur
      await user.click(screen.getByTestId("outside"));

      expect(onSave).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
    });

    it("calls onSave exactly once when Enter is pressed, even if blur fires too", async () => {
      // Regression: disabling the input on save triggers blur in real browsers,
      // which would re-enter doSave and call onSave twice without a guard.
      // Use a deferred promise so the component stays in saving state.
      const pendingSaves: Array<() => void> = [];
      const onSave = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { pendingSaves.push(resolve as () => void); }),
      );
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "新标题");
      // Press Enter — this triggers doSave which sets saving=true
      await user.keyboard("{Enter}");
      // Component is now in saving state with disabled input.
      // Simulate the blur that a real browser fires when a focused
      // element becomes disabled.
      fireEvent.blur(input);
      // Now resolve the save
      pendingSaves[0]?.();

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("cancel", () => {
    it("restores original value and exits edit mode on Escape", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "未保存的修改");
      await user.keyboard("{Escape}");

      expect(onSave).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
      // Should show original value restored
      expect(screen.getByText("原始标题")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error and stays in edit mode when title is empty", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.keyboard("{Enter}");

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
    });

    it("shows error and stays in edit mode when title is whitespace only", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "   ");
      await user.keyboard("{Enter}");

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
    });

    it("clears validation error when user starts typing again", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.keyboard("{Enter}");
      expect(screen.getByText("标题不能为空")).toBeInTheDocument();

      await user.type(input, "新内容");
      expect(screen.queryByText("标题不能为空")).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("keeps draft and stays in edit mode when save fails", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("网络错误"));
      const { user } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "失败的新标题");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("失败的新标题");
      });
      // Should still be in edit mode
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("失败的新标题");
      // Should show error message
      expect(screen.getByText(/保存失败/)).toBeInTheDocument();
    });

    it("allows retry after save failure", async () => {
      const onSave = vi
        .fn()
        .mockRejectedValueOnce(new Error("网络错误"))
        .mockResolvedValueOnce(undefined);
      const { user, rerender } = renderEdit({ onSave });

      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "重试标题");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText(/保存失败/)).toBeInTheDocument();
      });

      // Try again
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(2);
      });
      // Simulate parent re-rendering with the updated value
      rerender(
        <div>
          <PlanInlineEdit value="重试标题" onSave={onSave} />
          <button data-testid="outside">外部元素</button>
        </div>,
      );
      await waitFor(() => {
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
      expect(screen.getByText("重试标题")).toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("calls onEditEnd after successful save", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onEditEnd = vi.fn();
      const { user } = renderEdit({ onSave, onEditEnd });

      await user.click(screen.getByText("原始标题"));
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(onEditEnd).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onEditEnd after cancel", async () => {
      const onEditEnd = vi.fn();
      const { user } = renderEdit({ onEditEnd });

      await user.click(screen.getByText("原始标题"));
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(onEditEnd).toHaveBeenCalledTimes(1);
      });
    });

  });

  describe("focus behavior", () => {
    it("does not steal focus on initial mount", () => {
      // Render two instances to reproduce the bug: the last-rendered
      // instance's focus-return effect would steal focus on mount.
      render(
        <div>
          <PlanInlineEdit value="第一行标题" onSave={vi.fn().mockResolvedValue(undefined)} />
          <PlanInlineEdit value="第二行标题" onSave={vi.fn().mockResolvedValue(undefined)} />
        </div>,
      );

      // Neither display span should be focused on mount.
      // activeElement should remain at body (or the container).
      const first = screen.getByText("第一行标题");
      const second = screen.getByText("第二行标题");
      expect(first).not.toHaveFocus();
      expect(second).not.toHaveFocus();
    });

    it("returns focus to the display element after successful save", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { user } = renderEdit({ onSave });

      // Sanity: display span does NOT have focus on mount
      expect(screen.getByText("原始标题")).not.toHaveFocus();

      await user.click(screen.getByText("原始标题"));
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByLabelText(/编辑/)).toHaveFocus();
      });
    });

    it("returns focus to the display element after cancel", async () => {
      const onEditEnd = vi.fn();
      const { user } = renderEdit({ onEditEnd });

      // Sanity: display span does NOT have focus on mount
      expect(screen.getByText("原始标题")).not.toHaveFocus();

      await user.click(screen.getByText("原始标题"));
      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.getByLabelText(/编辑/)).toHaveFocus();
      });
    });
  });

  describe("accessibility", () => {
    it("input has proper aria-label", async () => {
      const { user } = renderEdit();
      await user.click(screen.getByText("原始标题"));

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-label",
        "编辑标题",
      );
    });

    it("input has aria-invalid when validation error exists", async () => {
      const { user } = renderEdit();
      await user.click(screen.getByText("原始标题"));
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.keyboard("{Enter}");

      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });
  });
});
