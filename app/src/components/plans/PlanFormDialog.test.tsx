import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory, makeTagWorkflow } from "@/test/fixtures";
import type { Plan } from "@/types";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";

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
  it("renders period type select with default '无'", () => {
    renderDialog();

    const periodTypeTrigger = screen.getByLabelText("计划周期");
    expect(periodTypeTrigger).toBeInTheDocument();
  });

  it("renders period value input after selecting a period type", async () => {
    const user = userEvent.setup();
    renderDialog();

    await selectOption(user, "计划周期", "月度");

    const periodValueInput = screen.getByPlaceholderText("如 2026-08、2026-Q3、2026");
    expect(periodValueInput).toBeInTheDocument();
  });

  it("defaults period type to 'none' (no period)", () => {
    renderDialog();

    const periodTypeTrigger = screen.getByLabelText("计划周期");
    expect(periodTypeTrigger).toHaveTextContent("无");
  });

  it("allows selecting a period type", async () => {
    const user = userEvent.setup();
    renderDialog();

    await selectOption(user, "计划周期", "月度");

    // The select should now show "月度"
    expect(screen.getByLabelText("计划周期")).toHaveTextContent("月度");
  });

  it("includes period_type and period_value in create payload", async () => {
    const user = userEvent.setup();
    renderDialog();

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

  it("renders workflow select with default '无'", () => {
    renderDialog();

    const workflowTrigger = screen.getByLabelText("工作流");
    expect(workflowTrigger).toBeInTheDocument();
    expect(workflowTrigger).toHaveTextContent("无");
  });

  it("allows selecting a workflow", async () => {
    const user = userEvent.setup();
    renderDialog();

    await selectOption(user, "工作流", "开发任务流程");

    expect(screen.getByLabelText("工作流")).toHaveTextContent("开发任务流程");
  });

  it("includes tag_workflow_id and current_step_index in create payload", async () => {
    const user = userEvent.setup();
    renderDialog();

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
});
