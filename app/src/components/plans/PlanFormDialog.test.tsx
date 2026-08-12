import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory, makeTagWorkflow } from "@/test/fixtures";
import type { Plan } from "@/types";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { PRIORITY_TAGS } from "@/lib/quickCapture";

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
  listTagWorkflows: vi.fn(),
}));

const mockedApi = vi.mocked(api);

function renderDialog(plan: Plan | null = null) {
  return render(<PlanFormDialog onOpenChange={vi.fn()} plan={plan} />);
}

/** Select a Radix Select option by clicking the trigger then the portal option */
async function selectOption(user: ReturnType<typeof userEvent.setup>, label: string, optionText: string) {
  await user.click(screen.getByLabelText(label));
  // Radix Select renders both a hidden <option> and a visible <span> in a portal.
  // Use getAllByText to handle duplicates.
  const options = await screen.findAllByText(optionText);
  // Click the last one (the visible portal span, not the hidden native option)
  await user.click(options[options.length - 1]);
}

beforeEach(() => {
  useAppStore.setState({
    plans: [],
    categories: [makeCategory({ id: "cat-1", name: "工作", color: "#3B82F6" })],
    tagWorkflows: [makeTagWorkflow()],
    selectedCategoryId: null,
    selectedStatus: "all",
    selectedTimeRange: "all",
    loading: false,
    error: null,
  });
  vi.clearAllMocks();
  mockedApi.createPlan.mockImplementation(async (input) =>
    makePlan({
      id: "new-plan",
      title: input.title ?? "",
      description: input.description ?? "",
      category_id: input.category_id ?? null,
      importance: input.importance ?? 2,
      urgency: input.urgency ?? 2,
      ddl: input.ddl ?? null,
      period_type: (input.period_type as "daily" | "monthly" | "quarterly" | "yearly" | null) ?? null,
      period_value: input.period_value ?? null,
    }),
  );
});

describe("PlanFormDialog period fields", () => {
  it("renders period type select with default '无'", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    const periodTypeTrigger = screen.getByLabelText("计划周期");
    expect(periodTypeTrigger).toBeInTheDocument();
  });

  it("renders period value input after selecting a period type", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    await selectOption(user, "计划周期", "月度");

    const periodValueInput = screen.getByPlaceholderText("如 2026-08、2026-Q3、2026");
    expect(periodValueInput).toBeInTheDocument();
  });

  it("defaults period type to 'none' (no period)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    const periodTypeTrigger = screen.getByLabelText("计划周期");
    expect(periodTypeTrigger).toHaveTextContent("无");
  });

  it("allows selecting a period type", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    await selectOption(user, "计划周期", "月度");

    // The select should now show "月度"
    expect(screen.getByLabelText("计划周期")).toHaveTextContent("月度");
  });

  it("includes period_type and period_value in create payload", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Expand advanced fields
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    // Fill title
    await user.type(screen.getByLabelText("标题"), "测试周期计划");

    // Select period type
    await selectOption(user, "计划周期", "月度");

    // Fill period value
    await user.type(screen.getByPlaceholderText("如 2026-08、2026-Q3、2026"), "2026-08");

    // Submit
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "测试周期计划",
          period_type: "monthly",
          period_value: "2026-08",
        }),
      );
    });
  });

  it("sends null period values when type is 'none'", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Fill title
    await user.type(screen.getByLabelText("标题"), "无周期计划");

    // Submit
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "无周期计划",
          period_type: null,
          period_value: null,
        }),
      );
    });
  });

  it("renders workflow select with default '无'", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    const workflowTrigger = screen.getByLabelText("工作流");
    expect(workflowTrigger).toBeInTheDocument();
    expect(workflowTrigger).toHaveTextContent("无");
  });

  it("allows selecting a workflow", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    await selectOption(user, "工作流", "开发任务流程");

    expect(screen.getByLabelText("工作流")).toHaveTextContent("开发任务流程");
  });

  it("includes tag_workflow_id and current_step_index in create payload", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "更多选项" }));

    await user.type(screen.getByLabelText("标题"), "工作流任务");
    await selectOption(user, "工作流", "开发任务流程");

    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "工作流任务",
          tag_workflow_id: "wf-1",
          current_step_index: 0,
        }),
      );
    });
  });

  it("sends null tag_workflow_id when workflow is 'none'", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("标题"), "无工作流任务");

    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "无工作流任务",
          tag_workflow_id: null,
          current_step_index: 0,
        }),
      );
    });
  });

  describe("PlanFormDialog workflow progress preservation", () => {
    it("preserves current_step_index when editing without changing workflow", async () => {
      const user = userEvent.setup();
      const existingPlan = makePlan({
        id: "plan-existing",
        title: "进行中的任务",
        tag_workflow_id: "wf-1",
        current_step_index: 2,
      });
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({
          id: "plan-existing",
          title: "更新后的任务名",
          tag_workflow_id: "wf-1",
          current_step_index: 2,
        }),
      );

      renderDialog(existingPlan);

      // Just change the title, don't touch workflow
      const titleInput = screen.getByLabelText("标题");
      await user.clear(titleInput);
      await user.type(titleInput, "更新后的任务名");

      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "plan-existing",
            title: "更新后的任务名",
            tag_workflow_id: "wf-1",
            current_step_index: 2, // preserved!
          }),
        );
      });
    });

    it("resets current_step_index to 0 when workflow is changed during edit", async () => {
      const user = userEvent.setup();
      const existingPlan = makePlan({
        id: "plan-existing",
        title: "进行中的任务",
        tag_workflow_id: "wf-1",
        current_step_index: 2,
      });
      // Add a second workflow
      useAppStore.setState({
        tagWorkflows: [
          makeTagWorkflow({ id: "wf-1", name: "开发任务流程" }),
          makeTagWorkflow({ id: "wf-2", name: "测试流程", steps: '["测试1","测试2"]' }),
        ],
      });
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({
          id: "plan-existing",
          tag_workflow_id: "wf-2",
          current_step_index: 0,
        }),
      );

      renderDialog(existingPlan);

      // Switch workflow to wf-2
      await selectOption(user, "工作流", "测试流程");

      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "plan-existing",
            tag_workflow_id: "wf-2",
            current_step_index: 0, // reset because workflow changed
          }),
        );
      });
    });

    it("resets current_step_index to 0 when no workflow was bound and one is added", async () => {
      const user = userEvent.setup();
      const existingPlan = makePlan({
        id: "plan-existing",
        title: "无工作流任务",
        tag_workflow_id: null,
        current_step_index: 0,
      });
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({
          id: "plan-existing",
          tag_workflow_id: "wf-1",
          current_step_index: 0,
        }),
      );

      renderDialog(existingPlan);

      // Add a workflow
      await selectOption(user, "工作流", "开发任务流程");

      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "plan-existing",
            tag_workflow_id: "wf-1",
            current_step_index: 0, // new workflow, start at step 0
          }),
        );
      });
    });
  });

  // ── Quick Capture mode ───────────────────────────────────

  describe("PlanFormDialog quick capture (collapsed mode for new plans)", () => {
    it("shows only title and '更多选项' button for new plans", () => {
      renderDialog();

      expect(screen.getByLabelText("标题")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "更多选项" })).toBeInTheDocument();
      // Advanced fields should NOT be visible
      expect(screen.queryByLabelText("描述")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("分类")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("重要度")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("紧急度")).not.toBeInTheDocument();
    });

    it("shows all fields when editing an existing plan (no collapsed mode)", () => {
      const existingPlan = makePlan({ id: "plan-edit", title: "已有计划" });
      renderDialog(existingPlan);

      // All fields visible in edit mode
      expect(screen.getByLabelText("标题")).toBeInTheDocument();
      expect(screen.getByLabelText("描述")).toBeInTheDocument();
      expect(screen.getByLabelText("分类")).toBeInTheDocument();
      // "更多选项" button should NOT be visible in edit mode
      expect(screen.queryByRole("button", { name: "更多选项" })).not.toBeInTheDocument();
    });

    it("expands advanced fields when '更多选项' is clicked", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: "更多选项" }));

      // Advanced fields should now be visible
      expect(screen.getByLabelText("描述")).toBeInTheDocument();
      expect(screen.getByLabelText("分类")).toBeInTheDocument();
      // "更多选项" button should be replaced
      expect(screen.queryByRole("button", { name: "更多选项" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "收起选项" })).toBeInTheDocument();
    });

    it("collapses advanced fields when '收起选项' is clicked", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: "更多选项" }));
      await user.click(screen.getByRole("button", { name: "收起选项" }));

      // Advanced fields hidden again
      expect(screen.queryByLabelText("描述")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("分类")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "更多选项" })).toBeInTheDocument();
    });

    it("creates a plan by typing title and pressing Enter (quick create)", async () => {
      const user = userEvent.setup();
      renderDialog();

      const titleInput = screen.getByLabelText("标题");
      await user.type(titleInput, "快速创建的计划");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "快速创建的计划",
          }),
        );
      });
    });

    it("does not submit with an empty title", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.keyboard("{Enter}");

      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
      expect(mockedApi.createPlan).not.toHaveBeenCalled();
    });

    it("does not submit with whitespace-only title", async () => {
      const user = userEvent.setup();
      renderDialog();

      const titleInput = screen.getByLabelText("标题");
      await user.type(titleInput, "   ");
      await user.keyboard("{Enter}");

      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
      expect(mockedApi.createPlan).not.toHaveBeenCalled();
    });

    it("preserves input on backend failure and allows retry", async () => {
      const user = userEvent.setup();
      mockedApi.createPlan.mockRejectedValueOnce(new Error("Network error"));
      renderDialog();

      await user.type(screen.getByLabelText("标题"), "失败的计划");
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(screen.getByText(/保存失败/)).toBeInTheDocument();
      });

      // Input should still be there
      expect(screen.getByLabelText("标题")).toHaveValue("失败的计划");

      // Retry — succeed this time
      mockedApi.createPlan.mockResolvedValueOnce(
        makePlan({ id: "retry-plan", title: "失败的计划" }),
      );
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledTimes(2);
      });
    });

    it("closes the dialog on Escape", async () => {
      const onOpenChange = vi.fn();
      render(<PlanFormDialog onOpenChange={onOpenChange} plan={null} />);

      await userEvent.keyboard("{Escape}");

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ── Parser integration on submit ─────────────────────────

  describe("PlanFormDialog parser integration", () => {
    it("parses category from title and uses it for creation", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText("标题"), "工作：写周报");
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "写周报",
            category_id: "cat-1",
          }),
        );
      });
    });

    it("parses priority tag from title and uses it for creation", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText("标题"), "【重要紧急】写周报");
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "写周报",
            importance: PRIORITY_TAGS["重要紧急"].importance,
            urgency: PRIORITY_TAGS["重要紧急"].urgency,
          }),
        );
      });
    });

    it("parses both category and priority together", async () => {
      const user = userEvent.setup();
      // Add a second category to match
      useAppStore.setState({
        categories: [
          makeCategory({ id: "cat-1", name: "工作" }),
          makeCategory({ id: "cat-2", name: "学习计划" }),
        ],
      });

      renderDialog();

      await user.type(screen.getByLabelText("标题"), "学习计划：【重要不紧急】复习考试");
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "复习考试",
            category_id: "cat-2",
            importance: PRIORITY_TAGS["重要不紧急"].importance,
            urgency: PRIORITY_TAGS["重要不紧急"].urgency,
          }),
        );
      });
    });

    it("uses form values over parsed values when advanced options are expanded and modified", async () => {
      const user = userEvent.setup();
      useAppStore.setState({
        categories: [
          makeCategory({ id: "cat-1", name: "工作" }),
          makeCategory({ id: "cat-2", name: "学习计划" }),
        ],
      });

      renderDialog();

      // Type a title that would parse to category "学习计划" and priority 重要紧急
      await user.type(screen.getByLabelText("标题"), "学习计划：【重要紧急】写周报");

      // Expand advanced options
      await user.click(screen.getByRole("button", { name: "更多选项" }));

      // Manually override category to "工作"
      await selectOption(user, "分类", "工作");

      // Submit
      await user.click(screen.getByRole("button", { name: "创建" }));

      // Form values should win over parsed values for fields the user explicitly set
      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "写周报", // parsed title
            category_id: "cat-1", // manual override wins
          }),
        );
      });
    });

    it("preserves title as-is when no parsing patterns match", async () => {
      const user = userEvent.setup();
      renderDialog();

      const originalTitle = "这是一条普通的计划标题，没有特殊格式";
      await user.type(screen.getByLabelText("标题"), originalTitle);
      await user.click(screen.getByRole("button", { name: "创建" }));

      await waitFor(() => {
        expect(mockedApi.createPlan).toHaveBeenCalledWith(
          expect.objectContaining({
            title: originalTitle,
            category_id: null,
            importance: 2,
            urgency: 2,
          }),
        );
      });
    });
  });
});
