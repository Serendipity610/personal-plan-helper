import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MatrixPage from "@/pages/MatrixPage";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory } from "@/test/fixtures";
import { toDateInputValue } from "@/lib/date";
import {
  dragPointer,
  installRectMock,
  restoreRectMock,
  setOverlayRect,
  setTestRect,
} from "@/test/dnd";

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const categories = [makeCategory()];

const seedPlans = [
  makePlan({
    id: "p-q1",
    title: "紧急重要任务",
    importance: 3,
    urgency: 3,
    category_id: "cat-1",
    ddl: "2026-08-15",
  }),
  makePlan({ id: "p-q2", title: "重要不紧急任务", importance: 3, urgency: 1 }),
  makePlan({ id: "p-q3", title: "不重要紧急任务", importance: 1, urgency: 3 }),
  makePlan({ id: "p-q4", title: "不重要不紧急任务", importance: 1, urgency: 1 }),
  makePlan({ id: "p-done", title: "已完成任务", importance: 3, urgency: 3, status: "completed" }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MatrixPage />
    </MemoryRouter>,
  );
}

function quadrant(q: "q1" | "q2" | "q3" | "q4") {
  return within(screen.getByTestId(`quadrant-${q}`));
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

describe("MatrixPage rendering", () => {
  it("renders the four Eisenhower quadrants with labels", async () => {
    renderPage();

    expect(await screen.findByTestId("quadrant-q1")).toBeInTheDocument();
    expect(screen.getByText("重要紧急")).toBeInTheDocument();
    expect(screen.getByText("重要不紧急")).toBeInTheDocument();
    expect(screen.getByText("不重要紧急")).toBeInTheDocument();
    expect(screen.getByText("不重要不紧急")).toBeInTheDocument();
  });

  it("shows an empty-state placeholder in quadrants without plans", async () => {
    mockedApi.listPlans.mockResolvedValue([]);
    renderPage();

    // Now shows full-page empty state with icon and CTA button
    await screen.findByText("暂无计划");
    expect(screen.getByText("创建第一个计划，它将根据重要度与紧急度出现在对应象限")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建计划" })).toBeInTheDocument();
  });

  it("shows a loading skeleton while plans are being fetched", async () => {
    mockedApi.listPlans.mockReturnValue(new Promise(() => {})); // never resolves
    useAppStore.setState({ loading: true });
    renderPage();

    // Skeleton is rendered — verify by checking for the skeleton wrapper
    await screen.findByText("艾森豪威尔四象限");
    // The skeleton renders 4 min-h-40 sections with animate-pulse, check they exist
    const skeletonCards = document.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it("distributes active plans by importance/urgency and hides terminal ones", async () => {
    renderPage();
    await screen.findByTestId("quadrant-q1");

    expect(quadrant("q1").getByTestId("plan-card-p-q1")).toBeInTheDocument();
    expect(quadrant("q2").getByTestId("plan-card-p-q2")).toBeInTheDocument();
    expect(quadrant("q3").getByTestId("plan-card-p-q3")).toBeInTheDocument();
    expect(quadrant("q4").getByTestId("plan-card-p-q4")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-done")).not.toBeInTheDocument();
  });

  it("shows the category badge and formatted DDL on a card", async () => {
    renderPage();
    await screen.findByTestId("plan-card-p-q1");

    const card = quadrant("q1").getByTestId("plan-card-p-q1");
    expect(within(card).getByText("紧急重要任务")).toBeInTheDocument();
    expect(within(card).getByText("工作")).toBeInTheDocument();
    expect(within(card).getByText("2026-08-15")).toBeInTheDocument();
  });
});

describe("MatrixPage create flow", () => {
  it("creates a plan via the dialog and shows it in the matrix", async () => {
    const user = userEvent.setup();
    mockedApi.createPlan.mockResolvedValue(
      makePlan({ id: "new-1", title: "新计划", importance: 3, urgency: 3, ddl: "2026-08-20" }),
    );
    renderPage();
    await screen.findByTestId("quadrant-q1");

    await user.click(screen.getByRole("button", { name: "新建计划" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("标题"), "新计划");
    await user.type(within(dialog).getByLabelText("描述"), "这是描述");

    const sliders = within(dialog).getAllByRole("slider");
    sliders[0].focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() =>
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "新计划",
          description: "这是描述",
          importance: 3,
          urgency: 2,
        }),
      ),
    );
    expect(await screen.findByTestId("plan-card-new-1")).toBeInTheDocument();
  });

  it("creates a plan with half-step scores (2.5 at the quadrant threshold)", async () => {
    // 滑块 step=0.5，2.5 恰为象限阈值；后端必须接受小数（真实失败点在后端 serde，见 models.rs RED 测试）
    const user = userEvent.setup();
    mockedApi.createPlan.mockResolvedValue(
      makePlan({ id: "new-half", title: "临界计划", importance: 2.5, urgency: 2.5 }),
    );
    renderPage();
    await screen.findByTestId("quadrant-q1");

    await user.click(screen.getByRole("button", { name: "新建计划" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("标题"), "临界计划");

    const sliders = within(dialog).getAllByRole("slider");
    sliders[0].focus();
    await user.keyboard("{ArrowRight}"); // 重要度 2 → 2.5
    sliders[1].focus();
    await user.keyboard("{ArrowRight}"); // 紧急度 2 → 2.5
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() =>
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({ title: "临界计划", importance: 2.5, urgency: 2.5 }),
      ),
    );
  });

  it("rejects a submission with an empty title", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("quadrant-q1");

    await user.click(screen.getByRole("button", { name: "新建计划" }));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(within(dialog).getByText("标题不能为空")).toBeInTheDocument();
    expect(mockedApi.createPlan).not.toHaveBeenCalled();
  });

  it("selects a category and a DDL date in the form", async () => {
    const user = userEvent.setup();
    mockedApi.createPlan.mockResolvedValue(
      makePlan({ id: "new-2", title: "带分类计划", category_id: "cat-1", ddl: "2026-08-15" }),
    );
    renderPage();
    await screen.findByTestId("quadrant-q1");

    await user.click(screen.getByRole("button", { name: "新建计划" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("标题"), "带分类计划");
    await user.click(within(dialog).getByRole("combobox", { name: "分类" }));
    await user.click(await screen.findByRole("option", { name: "工作" }));

    await user.click(within(dialog).getByRole("button", { name: /选择日期/ }));
    const popover = await screen.findByTestId("ddl-popover");
    const day = within(popover).getByRole("button", { name: /August 15th, 2026/ });
    await user.click(day);

    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() =>
      expect(mockedApi.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({ title: "带分类计划", category_id: "cat-1", ddl: "2026-08-15" }),
      ),
    );
  });
});

describe("MatrixPage edit flow", () => {
  it("opens a prefilled dialog when a card is clicked and saves changes", async () => {
    const user = userEvent.setup();
    mockedApi.updatePlan.mockResolvedValue(
      makePlan({ id: "p-q4", title: "改名后的任务", importance: 1, urgency: 1 }),
    );
    renderPage();
    await screen.findByTestId("plan-card-p-q4");

    await user.click(screen.getByRole("button", { name: /编辑计划 不重要不紧急任务/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("标题")).toHaveValue("不重要不紧急任务");

    const title = within(dialog).getByLabelText("标题");
    await user.clear(title);
    await user.type(title, "改名后的任务");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-q4", title: "改名后的任务" }),
      ),
    );
  });
});

describe("MatrixPage delete flow", () => {
  it("deletes a plan after confirming the alert dialog", async () => {
    // 菜单关闭动画期间 Radix 会给新挂载的 dialog 打上 aria-hidden（jsdom 下不会恢复），
    // 因此 dialog 内部交互改用 testid 查询，并关闭 pointer-events 校验。
    const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
    mockedApi.deletePlan.mockResolvedValue(true);
    renderPage();
    await screen.findByTestId("plan-card-p-q4");

    const card = screen.getByTestId("plan-card-p-q4");
    await user.click(within(card).getByRole("button", { name: "计划操作" }));
    await user.click(await screen.findByRole("menuitem", { name: "删除" }));

    const confirm = await screen.findByTestId("delete-dialog");
    await user.click(within(confirm).getByTestId("delete-confirm"));

    await waitFor(() => expect(mockedApi.deletePlan).toHaveBeenCalledWith("p-q4"));
    await waitFor(() => expect(screen.queryByTestId("plan-card-p-q4")).not.toBeInTheDocument());
  });

  it("keeps the plan when deletion is cancelled", async () => {
    const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
    renderPage();
    await screen.findByTestId("plan-card-p-q4");

    const card = screen.getByTestId("plan-card-p-q4");
    await user.click(within(card).getByRole("button", { name: "计划操作" }));
    await user.click(await screen.findByRole("menuitem", { name: "删除" }));
    await user.click(await screen.findByTestId("delete-cancel"));

    expect(mockedApi.deletePlan).not.toHaveBeenCalled();
    expect(screen.getByTestId("plan-card-p-q4")).toBeInTheDocument();
  });
});

describe("MatrixPage global filters", () => {
  it("shows only plans of the selected category", async () => {
    useAppStore.setState({ selectedCategoryId: "cat-1" });
    renderPage();
    await screen.findByTestId("quadrant-q1");

    expect(screen.getByTestId("plan-card-p-q1")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-q2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-q3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-q4")).not.toBeInTheDocument();
  });

  it("shows completed plans when the status filter is set", async () => {
    useAppStore.setState({ selectedStatus: "completed" });
    renderPage();
    await screen.findByTestId("quadrant-q1");

    expect(screen.getByTestId("plan-card-p-done")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-q1")).not.toBeInTheDocument();
  });

  it("shows only plans due within the selected time range", async () => {
    const today = toDateInputValue(new Date());
    mockedApi.listPlans.mockResolvedValue([
      makePlan({ id: "p-today", title: "今日到期", importance: 3, urgency: 3, ddl: today }),
      makePlan({ id: "p-old", title: "旧任务", importance: 3, urgency: 3, ddl: "2020-01-01" }),
    ]);
    useAppStore.setState({ selectedTimeRange: "today" });
    renderPage();
    await screen.findByTestId("plan-card-p-today");

    expect(screen.getByTestId("plan-card-p-today")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-card-p-old")).not.toBeInTheDocument();
  });
});

describe("MatrixPage drag to adjust priority", () => {
  afterEach(restoreRectMock);

  it("drags a plan card from one quadrant to another and updates importance/urgency", async () => {
    mockedApi.updatePlan.mockResolvedValue(
      makePlan({ id: "p-q1", title: "紧急重要任务", importance: 3, urgency: 1 }),
    );
    installRectMock();
    // 2x2 quadrant layout; the card lives in q1, q2 is directly to the right.
    setTestRect("quadrant-q1", { x: 0, y: 0, width: 200, height: 200 });
    setTestRect("quadrant-q2", { x: 200, y: 0, width: 200, height: 200 });
    setTestRect("quadrant-q3", { x: 0, y: 200, width: 200, height: 200 });
    setTestRect("quadrant-q4", { x: 200, y: 200, width: 200, height: 200 });
    setTestRect("plan-card-p-q1", { x: 10, y: 10, width: 180, height: 80 });
    setOverlayRect({ x: 10, y: 10, width: 180, height: 80 });

    renderPage();
    await screen.findByTestId("plan-card-p-q1");

    const card = screen.getByTestId("plan-card-p-q1");
    await dragPointer(card, { x: 50, y: 50 }, { x: 250, y: 50 });

    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-q1", importance: 3, urgency: 1 }),
      ),
    );
  });

  it("keeps priority unchanged when the card is dropped outside any quadrant", async () => {
    mockedApi.updatePlan.mockResolvedValue(
      makePlan({ id: "p-q1", title: "紧急重要任务", importance: 3, urgency: 3 }),
    );
    installRectMock();
    setTestRect("quadrant-q1", { x: 0, y: 0, width: 200, height: 200 });
    setTestRect("quadrant-q2", { x: 200, y: 0, width: 200, height: 200 });
    setTestRect("quadrant-q3", { x: 0, y: 200, width: 200, height: 200 });
    setTestRect("quadrant-q4", { x: 200, y: 200, width: 200, height: 200 });
    setTestRect("plan-card-p-q1", { x: 10, y: 10, width: 180, height: 80 });
    setOverlayRect({ x: 10, y: 10, width: 180, height: 80 });

    renderPage();
    await screen.findByTestId("plan-card-p-q1");

    const card = screen.getByTestId("plan-card-p-q1");
    // Drop far outside the 2x2 grid: no droppable intersects, so over is null
    // and the drag resolves to a no-op.
    await dragPointer(card, { x: 50, y: 50 }, { x: 500, y: 500 });

    await new Promise((r) => setTimeout(r, 100));
    expect(mockedApi.updatePlan).not.toHaveBeenCalled();
  });
});

describe("MatrixPage status toggle", () => {
  it("marks a plan as completed from the card menu", async () => {
    const user = userEvent.setup();
    mockedApi.updatePlan.mockResolvedValue(
      makePlan({
        id: "p-q1",
        title: "紧急重要任务",
        importance: 3,
        urgency: 3,
        status: "completed",
      }),
    );
    renderPage();
    await screen.findByTestId("plan-card-p-q1");

    const card = screen.getByTestId("plan-card-p-q1");
    await user.click(within(card).getByRole("button", { name: "计划操作" }));
    await user.click(await screen.findByRole("menuitem", { name: "标记完成" }));

    await waitFor(() =>
      expect(mockedApi.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p-q1", status: "completed" }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId("plan-card-p-q1")).not.toBeInTheDocument());
  });
});
