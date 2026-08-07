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
