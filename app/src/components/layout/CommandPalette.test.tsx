import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Category, Plan, TagWorkflow } from "@/types";
import { CommandPalette } from "@/components/layout/CommandPalette";

const editPlan = vi.fn().mockResolvedValue(undefined);
let state: {
  plans: Plan[];
  categories: Category[];
  tagWorkflows: TagWorkflow[];
  editPlan: typeof editPlan;
};

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock("@/components/plans/PlanFormDialog", () => ({
  PlanFormDialog: ({ defaultTitle }: { defaultTitle?: string }) => (
    <div role="dialog">计划表单{defaultTitle ? `:${defaultTitle}` : ""}</div>
  ),
}));

const category: Category = {
  id: "cat-1",
  name: "工作",
  color: "#2563eb",
  icon: "briefcase",
  sort_order: 0,
  is_default: true,
  created_at: "2026-01-01T00:00:00Z",
};

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    title: "准备季度报告",
    description: "整理销售数据和图表",
    category_id: "cat-1",
    parent_id: null,
    importance: 3,
    urgency: 2,
    ddl: "2026-09-30T00:00:00Z",
    tag_workflow_id: null,
    current_step_index: 0,
    period_type: null,
    period_value: null,
    status: "active",
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
    ...overrides,
  };
}

function renderPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette open onOpenChange={vi.fn()} onCreatePlan={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("CommandPalette plan search", () => {
  beforeEach(() => {
    editPlan.mockClear();
    state = { plans: [plan()], categories: [category], tagWorkflows: [], editPlan };
  });

  it("命中标题和描述", () => {
    renderPalette();
    const input = screen.getByPlaceholderText("搜索计划、页面或执行命令...");
    fireEvent.change(input, { target: { value: "销售数据" } });
    expect(screen.getByText("准备季度报告")).toBeInTheDocument();
  });

  it("Ctrl+Enter 切换进行中计划为已完成", () => {
    renderPalette();
    const input = screen.getByPlaceholderText("搜索计划、页面或执行命令...");
    fireEvent.change(input, { target: { value: "季度报告" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    expect(editPlan).toHaveBeenCalledWith({ id: "plan-1", status: "completed" });
  });

  it("空查询显示导航", () => {
    renderPalette();
    expect(screen.getByText("四象限")).toBeInTheDocument();
    expect(screen.getByText("看板")).toBeInTheDocument();
    expect(screen.getByText("日历")).toBeInTheDocument();
    expect(screen.getByText("全部计划")).toBeInTheDocument();
    expect(screen.getByText("数据总览")).toBeInTheDocument();
  });

  it("空结果出现以当前文本新建计划", () => {
    renderPalette();
    const input = screen.getByPlaceholderText("搜索计划、页面或执行命令...");
    fireEvent.change(input, { target: { value: "完全不存在的计划" } });
    expect(screen.getByText("以当前文本新建计划：完全不存在的计划")).toBeInTheDocument();
  });
});
