import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ListPage from "@/pages/ListPage";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory } from "@/test/fixtures";
import { toDateInputValue } from "@/lib/date";

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const categories = [makeCategory({ id: "cat-1", name: "工作", color: "#3B82F6" })];

const seedPlans = [
  makePlan({
    id: "p-high",
    title: "高重要度任务",
    category_id: "cat-1",
    importance: 4,
    urgency: 2,
    ddl: "2026-08-10",
    created_at: "2026-08-01T00:00:00Z",
  }),
  makePlan({
    id: "p-mid",
    title: "中重要度任务",
    importance: 2,
    urgency: 1,
    ddl: "2026-08-05",
    created_at: "2026-08-02T00:00:00Z",
  }),
  makePlan({
    id: "p-low",
    title: "低重要度任务",
    importance: 1,
    urgency: 3,
    ddl: null,
    created_at: "2026-08-03T00:00:00Z",
  }),
  makePlan({
    id: "p-done",
    title: "已完成任务",
    status: "completed",
    importance: 3,
    urgency: 1,
    ddl: "2026-08-01",
    created_at: "2026-08-04T00:00:00Z",
  }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ListPage />
    </MemoryRouter>,
  );
}

function rowIds() {
  return screen.getAllByTestId(/^plan-row-/).map((el) => el.getAttribute("data-testid"));
}

beforeEach(() => {
  useAppStore.setState({
    plans: [],
    categories: [],
    tagWorkflows: [],
    selectedCategoryId: null,
    selectedStatus: "all",
    selectedTimeRange: "all",
    loading: false,
    error: null,
  });
  vi.clearAllMocks();
  mockedApi.listPlans.mockResolvedValue(seedPlans);
  mockedApi.listCategories.mockResolvedValue(categories);
});

describe("ListPage rendering", () => {
  it("renders plans as table rows with category badge and status", async () => {
    renderPage();

    await screen.findByTestId("plan-row-p-high");
    expect(screen.getByText("高重要度任务")).toBeInTheDocument();
    expect(screen.getByText("工作")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getAllByText("活跃")).toHaveLength(3);
  });

  it("shows an empty state when there are no plans", async () => {
    mockedApi.listPlans.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("暂无计划")).toBeInTheDocument();
  });

  it("sorts by created_at descending by default", async () => {
    renderPage();
    await screen.findByTestId("plan-row-p-done");

    expect(rowIds()).toEqual([
      "plan-row-p-done",
      "plan-row-p-low",
      "plan-row-p-mid",
      "plan-row-p-high",
    ]);
  });
});

describe("ListPage sorting", () => {
  it("sorts by importance descending on first click and toggles ascending", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    await user.click(screen.getByRole("button", { name: "按重要度排序" }));
    expect(rowIds()).toEqual([
      "plan-row-p-high",
      "plan-row-p-done",
      "plan-row-p-mid",
      "plan-row-p-low",
    ]);

    await user.click(screen.getByRole("button", { name: "按重要度排序" }));
    expect(rowIds()).toEqual([
      "plan-row-p-low",
      "plan-row-p-mid",
      "plan-row-p-done",
      "plan-row-p-high",
    ]);
  });

  it("sorts by urgency descending", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    await user.click(screen.getByRole("button", { name: "按紧急度排序" }));
    expect(rowIds()).toEqual([
      "plan-row-p-low",
      "plan-row-p-high",
      "plan-row-p-mid",
      "plan-row-p-done",
    ]);
  });

  it("sorts by ddl with nulls last in both directions", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    await user.click(screen.getByRole("button", { name: "按DDL排序" }));
    expect(rowIds()).toEqual([
      "plan-row-p-high",
      "plan-row-p-mid",
      "plan-row-p-done",
      "plan-row-p-low",
    ]);

    await user.click(screen.getByRole("button", { name: "按DDL排序" }));
    expect(rowIds()).toEqual([
      "plan-row-p-done",
      "plan-row-p-mid",
      "plan-row-p-high",
      "plan-row-p-low",
    ]);
  });
});

describe("ListPage batch operations", () => {
  it("marks selected plans as completed in one batch", async () => {
    const user = userEvent.setup();
    mockedApi.updatePlan.mockImplementation(async ({ id }) =>
      makePlan({ id, status: "completed", title: "任务" }),
    );
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    await user.click(screen.getByLabelText("选择 高重要度任务"));
    await user.click(screen.getByLabelText("选择 中重要度任务"));

    const batchBar = screen.getByTestId("batch-bar");
    expect(within(batchBar).getByText("已选 2 项")).toBeInTheDocument();

    await user.click(within(batchBar).getByRole("button", { name: "标记完成" }));

    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-high", status: "completed" }),
      ),
    );
    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-mid", status: "completed" }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId("batch-bar")).not.toBeInTheDocument());
  });

  it("cancels selected plans in one batch", async () => {
    const user = userEvent.setup();
    mockedApi.updatePlan.mockImplementation(async ({ id }) =>
      makePlan({ id, status: "cancelled", title: "任务" }),
    );
    renderPage();
    await screen.findByTestId("plan-row-p-low");

    await user.click(screen.getByLabelText("选择 低重要度任务"));
    const batchBar = screen.getByTestId("batch-bar");
    await user.click(within(batchBar).getByRole("button", { name: "标记取消" }));

    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-low", status: "cancelled" }),
      ),
    );
  });

  it("selects all visible rows via the header checkbox", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    await user.click(screen.getByLabelText("全选"));
    expect(screen.getByTestId("batch-bar")).toHaveTextContent("已选 4 项");
  });
});

describe("ListPage inline title editing", () => {
    it("enters edit mode when title is clicked", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByText("高重要度任务"));

      const input = within(screen.getByTestId("plan-row-p-high")).getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("高重要度任务");
    });

    it("saves title on Enter and exits edit mode", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({ id: "p-high", title: "修改后的标题" }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByText("高重要度任务"));
      const input = within(screen.getByTestId("plan-row-p-high")).getByRole("textbox");
      await user.clear(input);
      await user.type(input, "修改后的标题");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p-high", title: "修改后的标题" }),
        );
      });
    });

    it("restores original title on Escape", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByText("高重要度任务"));
      const input = within(screen.getByTestId("plan-row-p-high")).getByRole("textbox");
      await user.clear(input);
      await user.type(input, "不要保存的修改");
      await user.keyboard("{Escape}");

      expect(mockedApi.updatePlan).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("高重要度任务")).toBeInTheDocument();
      });
    });

    it("shows validation error and stays in edit mode when title is empty", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByText("高重要度任务"));
      const input = within(screen.getByTestId("plan-row-p-high")).getByRole("textbox");
      await user.clear(input);
      await user.keyboard("{Enter}");

      expect(mockedApi.updatePlan).not.toHaveBeenCalled();
      expect(
        within(screen.getByTestId("plan-row-p-high")).getByRole("textbox"),
      ).toBeInTheDocument();
      expect(screen.getByText("标题不能为空")).toBeInTheDocument();
    });

    it("keeps draft and shows error on save failure", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockRejectedValue(new Error("网络错误"));
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByText("高重要度任务"));
      const input = within(screen.getByTestId("plan-row-p-high")).getByRole("textbox");
      await user.clear(input);
      await user.type(input, "失败的新标题");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText(/保存失败/)).toBeInTheDocument();
      });
      // Draft preserved
      expect(
        within(screen.getByTestId("plan-row-p-high")).getByRole("textbox"),
      ).toHaveValue("失败的新标题");
    });
  });

  describe("ListPage status toggle", () => {
    it("toggles active plan to completed when status badge is clicked", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({ id: "p-high", status: "completed", title: "高重要度任务" }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      const row = screen.getByTestId("plan-row-p-high");
      // Find the status toggle button within the row
      const statusBtn = within(row).getByLabelText(/切换状态/);
      await user.click(statusBtn);

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p-high", status: "completed" }),
        );
      });
    });

    it("toggles completed plan back to active", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({ id: "p-done", status: "active", title: "已完成任务" }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-done");

      const row = screen.getByTestId("plan-row-p-done");
      const statusBtn = within(row).getByLabelText(/切换状态/);
      await user.click(statusBtn);

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p-done", status: "active" }),
        );
      });
    });

    it("does not toggle cancelled plan status when badge is clicked", async () => {
      const user = userEvent.setup();
      // Add a cancelled plan fixture
      const cancelledPlan = makePlan({
        id: "p-cancelled",
        title: "已取消任务",
        status: "cancelled",
        created_at: "2026-08-05T00:00:00Z",
      });
      mockedApi.listPlans.mockResolvedValue([...seedPlans, cancelledPlan]);
      renderPage();
      await screen.findByTestId("plan-row-p-cancelled");

      const row = screen.getByTestId("plan-row-p-cancelled");
      const statusBtn = within(row).getByLabelText(/切换状态: 已取消/);
      await user.click(statusBtn);

      // updatePlan should NOT be called for cancelled plans
      expect(mockedApi.updatePlan).not.toHaveBeenCalled();
      // Status should remain "已取消"
      expect(within(row).getByText("已取消")).toBeInTheDocument();
    });
  });

  describe("ListPage category quick menu", () => {
    it("shows category dropdown when category badge is clicked", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      // The row with category "工作"
      const row = screen.getByTestId("plan-row-p-high");
      // Click on the category cell's dropdown trigger
      await user.click(within(row).getByLabelText(/更换分类/));

      // Should see the "无分类" option and available categories
      // Radix DropdownMenu renders in a portal — the option "工作" also appears,
      // so use getAllByText to handle the badge + dropdown option duplicates
      expect(screen.getByText("无分类")).toBeInTheDocument();
      expect(screen.getAllByText("工作").length).toBeGreaterThanOrEqual(2);
    });

    it("updates category when a new one is selected", async () => {
      const user = userEvent.setup();
      // Add a second category for selection — update both store and mock
      const extendedCategories = [
        makeCategory({ id: "cat-1", name: "工作", color: "#3B82F6" }),
        makeCategory({ id: "cat-2", name: "个人", color: "#EF4444" }),
      ];
      useAppStore.setState({ categories: extendedCategories });
      // Override the mock response so fetchCategories doesn't overwrite
      mockedApi.listCategories.mockResolvedValue(extendedCategories);
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({ id: "p-mid", title: "中重要度任务", category_id: "cat-2" }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-mid");

      const row = screen.getByTestId("plan-row-p-mid");
      await user.click(within(row).getByLabelText(/更换分类/));
      // "个人" only appears in the dropdown, not in the row
      await user.click(screen.getByText("个人"));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p-mid", category_id: "cat-2" }),
        );
      });
    });

    it("clears category when '无分类' is selected", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({ id: "p-high", title: "高重要度任务", category_id: null }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      const row = screen.getByTestId("plan-row-p-high");
      await user.click(within(row).getByLabelText(/更换分类/));
      await user.click(screen.getByText("无分类"));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p-high", category_id: null }),
        );
      });
    });
  });

  describe("ListPage quadrant quick menu", () => {
    it("shows quadrant options when importance cell is clicked", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      const row = screen.getByTestId("plan-row-p-high");
      await user.click(within(row).getByLabelText(/象限快捷操作/));

      expect(screen.getByText("重要紧急")).toBeInTheDocument();
      expect(screen.getByText("重要不紧急")).toBeInTheDocument();
      expect(screen.getByText("不重要紧急")).toBeInTheDocument();
      expect(screen.getByText("不重要不紧急")).toBeInTheDocument();
    });

    it("updates importance and urgency when a quadrant is selected", async () => {
      const user = userEvent.setup();
      mockedApi.updatePlan.mockResolvedValue(
        makePlan({
          id: "p-mid",
          title: "中重要度任务",
          importance: 3,
          urgency: 3,
        }),
      );
      renderPage();
      await screen.findByTestId("plan-row-p-mid");

      const row = screen.getByTestId("plan-row-p-mid");
      await user.click(within(row).getByLabelText(/象限快捷操作/));
      await user.click(screen.getByText("重要紧急"));

      await waitFor(() => {
        expect(mockedApi.updatePlan).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "p-mid",
            importance: 3,
            urgency: 3,
          }),
        );
      });
    });
  });

  describe("ListPage more details entry", () => {
    it("opens PlanFormDialog when '更多详情' is clicked", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      const row = screen.getByTestId("plan-row-p-high");
      await user.click(within(row).getByLabelText(/更多详情/));

      // PlanFormDialog should open in edit mode
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
      expect(screen.getByText("编辑计划")).toBeInTheDocument();
    });
  });

  describe("ListPage event boundaries", () => {
    it("does not open edit dialog on row click (inline editing replaces full dialog trigger)", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      // Click on a non-interactive area of the row
      const row = screen.getByTestId("plan-row-p-high");
      await user.click(row);

      // Should NOT open the edit dialog
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("checkbox selection still works without triggering edit", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByLabelText("选择 高重要度任务"));
      expect(screen.getByTestId("batch-bar")).toBeInTheDocument();

      // Should NOT open edit dialog
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("delete button still opens confirmation dialog", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("plan-row-p-high");

      await user.click(screen.getByLabelText("删除 高重要度任务"));

      // Delete dialog should open
      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      });
    });
  });

  describe("ListPage global filters", () => {
  it("shows only plans of the selected category", async () => {
    useAppStore.setState({ selectedCategoryId: "cat-1" });
    renderPage();
    await screen.findByTestId("plan-row-p-high");

    expect(rowIds()).toEqual(["plan-row-p-high"]);
  });

  it("shows only plans due within the selected time range", async () => {
    const today = toDateInputValue(new Date());
    // 页面挂载时会重新 fetch，mock 返回与 store 预置一致的数据
    mockedApi.listPlans.mockResolvedValue([
      makePlan({
        id: "p-today",
        title: "今日到期",
        ddl: today,
        created_at: "2026-08-01T00:00:00Z",
      }),
      makePlan({
        id: "p-old",
        title: "旧任务",
        ddl: "2020-01-01",
        created_at: "2026-08-01T00:00:00Z",
      }),
    ]);
    useAppStore.setState({
      selectedTimeRange: "today",
      plans: [
        makePlan({
          id: "p-today",
          title: "今日到期",
          ddl: today,
          created_at: "2026-08-01T00:00:00Z",
        }),
        makePlan({
          id: "p-old",
          title: "旧任务",
          ddl: "2020-01-01",
          created_at: "2026-08-01T00:00:00Z",
        }),
      ],
    });
    renderPage();
    await screen.findByTestId("plan-row-p-today");

    expect(rowIds()).toEqual(["plan-row-p-today"]);
  });
});
