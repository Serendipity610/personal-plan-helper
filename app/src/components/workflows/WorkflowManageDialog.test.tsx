import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makeTagWorkflow } from "@/test/fixtures";
import { WorkflowManageDialog } from "@/components/workflows/WorkflowManageDialog";

vi.mock("@/lib/api", () => ({
  createTagWorkflow: vi.fn(),
  updateTagWorkflow: vi.fn(),
  deleteTagWorkflow: vi.fn(),
  listTagWorkflows: vi.fn(),
}));

const mockedApi = vi.mocked(api);

function renderDialog() {
  return render(<WorkflowManageDialog onOpenChange={vi.fn()} />);
}

beforeEach(() => {
  useAppStore.setState({
    plans: [],
    categories: [],
    tagWorkflows: [
      makeTagWorkflow({ id: "wf-1", name: "开发流程", steps: JSON.stringify(["需求分析", "开发", "测试"]) }),
      makeTagWorkflow({ id: "wf-2", name: "学习流程", steps: JSON.stringify(["预习", "学习", "复习"]) }),
    ],
    selectedCategoryId: null,
    selectedStatus: "all",
    selectedTimeRange: "all",
    loading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe("WorkflowManageDialog", () => {
  it("renders existing workflows", () => {
    renderDialog();

    expect(screen.getByText("开发流程")).toBeInTheDocument();
    expect(screen.getByText("学习流程")).toBeInTheDocument();
  });

  it("renders step count for each workflow", () => {
    renderDialog();

    // Both workflows have 3 steps, so there are multiple step count elements
    const stepCounts = screen.getAllByText(/3 个步骤/);
    expect(stepCounts).toHaveLength(2);
  });

  it("switches to create mode with empty form", () => {
    renderDialog();

    // Initially in create mode — just check the input is empty
    const nameInput = screen.getByPlaceholderText("工作流名称");
    expect(nameInput).toHaveValue("");
  });

  it("switches to edit mode when clicking edit on a workflow", async () => {
    const user = userEvent.setup();
    renderDialog();

    const editBtns = screen.getAllByLabelText(/编辑工作流/);
    await user.click(editBtns[0]);

    // Name input should be pre-filled
    const nameInput = screen.getByPlaceholderText("工作流名称");
    expect(nameInput).toHaveValue("开发流程");
  });

  it("creates a new workflow", async () => {
    const user = userEvent.setup();
    mockedApi.createTagWorkflow.mockResolvedValueOnce(
      makeTagWorkflow({ id: "wf-new", name: "新流程", steps: JSON.stringify(["步骤A", "步骤B"]) }),
    );
    renderDialog();

    await user.type(screen.getByPlaceholderText("工作流名称"), "新流程");

    // Fill the first (default) step
    const initialStepInputs = screen.getAllByPlaceholderText(/步骤 \d/);
    await user.type(initialStepInputs[0], "步骤A");

    // Add a second step
    await user.click(screen.getByLabelText("添加步骤"));

    // Fill the second step
    const allStepInputs = screen.getAllByPlaceholderText(/步骤 \d/);
    await user.type(allStepInputs[1], "步骤B");

    // Submit
    await user.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() => {
      expect(mockedApi.createTagWorkflow).toHaveBeenCalledWith({
        name: "新流程",
        steps: JSON.stringify(["步骤A", "步骤B"]),
      });
    });
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "新增" }));

    expect(screen.getByText("工作流名称不能为空")).toBeInTheDocument();
  });

  it("deletes a workflow after confirmation", async () => {
    const user = userEvent.setup();
    mockedApi.deleteTagWorkflow.mockResolvedValueOnce(true);
    renderDialog();

    const deleteBtns = screen.getAllByLabelText(/删除工作流/);
    await user.click(deleteBtns[0]);

    // Confirmation dialog should appear
    const confirmDialog = await screen.findByTestId("delete-workflow-dialog");
    await user.click(within(confirmDialog).getByTestId("delete-workflow-confirm"));

    await waitFor(() => {
      expect(mockedApi.deleteTagWorkflow).toHaveBeenCalledWith("wf-1");
    });
  });

  it("allows removing steps", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Switch to edit mode on the 3-step workflow
    const editBtns = screen.getAllByLabelText(/编辑工作流/);
    await user.click(editBtns[0]);

    // Should have 3 step inputs
    const removeBtns = screen.getAllByLabelText("移除步骤");
    expect(removeBtns).toHaveLength(3);

    // Remove the first step
    await user.click(removeBtns[0]);

    // Now should have 2 step inputs
    expect(screen.getAllByPlaceholderText(/步骤 \d/)).toHaveLength(2);
  });

  it("disables remove step button when only one step remains", () => {
    renderDialog();

    // Create mode has 1 default step, the remove button should be disabled
    const removeBtns = screen.getAllByLabelText("移除步骤");
    expect(removeBtns[0]).toBeDisabled();
  });

  it("submits edits to an existing workflow", async () => {
    const user = userEvent.setup();
    mockedApi.updateTagWorkflow.mockResolvedValueOnce(
      makeTagWorkflow({ id: "wf-1", name: "开发流程v2", steps: JSON.stringify(["需求分析", "开发", "测试"]) }),
    );
    renderDialog();

    const editBtns = screen.getAllByLabelText(/编辑工作流/);
    await user.click(editBtns[0]);

    const nameInput = screen.getByPlaceholderText("工作流名称");
    await user.clear(nameInput);
    await user.type(nameInput, "开发流程v2");

    const stepInputs = screen.getAllByPlaceholderText(/步骤 \d/);
    await user.clear(stepInputs[0]);
    await user.type(stepInputs[0], "需求分析");

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockedApi.updateTagWorkflow).toHaveBeenCalledWith({
        id: "wf-1",
        name: "开发流程v2",
        steps: JSON.stringify(["需求分析", "开发", "测试"]),
      });
    });
  });

  it("supports reordering steps (move up/down) per acceptance criterion #1", async () => {
    const user = userEvent.setup();
    renderDialog();

    const editBtns = screen.getAllByLabelText(/编辑工作流/);
    await user.click(editBtns[0]);

    // Acceptance criterion #1 requires the step list to support 排序 (reorder).
    // The dialog must expose move-up/move-down (or drag) controls per step.
    const moveUp = screen.queryAllByLabelText(/上移/);
    const moveDown = screen.queryAllByLabelText(/下移/);
    const reorderControls = screen.queryAllByRole("button", { name: /拖拽|排序|上移|下移/ });

    expect(moveUp.length + moveDown.length + reorderControls.length).toBeGreaterThan(0);
  });

  it("moves a step down when clicking the down button", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getAllByLabelText(/编辑工作流/)[0]);

    // wf-1 step order: [需求分析, 开发, 测试]
    const downBtns = screen.getAllByLabelText("下移步骤");
    await user.click(downBtns[0]); // move 需求分析 down one

    const stepInputs = screen.getAllByPlaceholderText(/步骤 \d/);
    expect(stepInputs[0]).toHaveValue("开发");
    expect(stepInputs[1]).toHaveValue("需求分析");
    expect(stepInputs[2]).toHaveValue("测试");
  });

  it("moves a step up when clicking the up button", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getAllByLabelText(/编辑工作流/)[0]);

    const upBtns = screen.getAllByLabelText("上移步骤");
    await user.click(upBtns[2]); // move 测试 up one

    const stepInputs = screen.getAllByPlaceholderText(/步骤 \d/);
    expect(stepInputs[0]).toHaveValue("需求分析");
    expect(stepInputs[1]).toHaveValue("测试");
    expect(stepInputs[2]).toHaveValue("开发");
  });

  it("disables up on first step and down on last step", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getAllByLabelText(/编辑工作流/)[0]);

    const upBtns = screen.getAllByLabelText("上移步骤");
    const downBtns = screen.getAllByLabelText("下移步骤");

    expect(upBtns[0]).toBeDisabled();
    expect(downBtns[0]).not.toBeDisabled();
    expect(downBtns[2]).toBeDisabled();
    expect(upBtns[2]).not.toBeDisabled();
  });

  it("submits reordered steps when saving after reorder", async () => {
    const user = userEvent.setup();
    mockedApi.updateTagWorkflow.mockResolvedValueOnce(
      makeTagWorkflow({ id: "wf-1", name: "开发流程", steps: JSON.stringify(["开发", "需求分析", "测试"]) }),
    );
    renderDialog();
    await user.click(screen.getAllByLabelText(/编辑工作流/)[0]);

    const downBtns = screen.getAllByLabelText("下移步骤");
    await user.click(downBtns[0]); // swap first two steps

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockedApi.updateTagWorkflow).toHaveBeenCalledWith({
        id: "wf-1",
        name: "开发流程",
        steps: JSON.stringify(["开发", "需求分析", "测试"]),
      });
    });
  });
});
