import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import type { DashboardStats, CompletionTrendPoint, DistributionItem } from "@/types";

const mockToastApiError = vi.fn();

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  toastApiError: (...args: unknown[]) => mockToastApiError(...args),
}));

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createTagWorkflow: vi.fn(),
  listTagWorkflows: vi.fn(),
  updateTagWorkflow: vi.fn(),
  deleteTagWorkflow: vi.fn(),
  getDashboardStats: vi.fn(),
  getCompletionTrend: vi.fn(),
  getUrgencyDistribution: vi.fn(),
  getCategoryDistribution: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const mockStats: DashboardStats = {
  total_plans: 12,
  completed_plans: 5,
  completion_rate: 41.67,
  today_pending: 3,
  overdue_count: 2,
  week_change: 3,
};

const mockTrend: CompletionTrendPoint[] = [
  { date: "2026-08-01", count: 2 },
  { date: "2026-08-02", count: 1 },
  { date: "2026-08-03", count: 0 },
  { date: "2026-08-04", count: 3 },
  { date: "2026-08-05", count: 0 },
  { date: "2026-08-06", count: 1 },
  { date: "2026-08-07", count: 0 },
];

const mockUrgency: DistributionItem[] = [
  { key: "0", label: "紧急度 0", count: 2, color: "" },
  { key: "1", label: "紧急度 1", count: 3, color: "" },
  { key: "2", label: "紧急度 2", count: 4, color: "" },
  { key: "3", label: "紧急度 3", count: 2, color: "" },
  { key: "4", label: "紧急度 4", count: 1, color: "" },
];

const mockCategory: DistributionItem[] = [
  { key: "cat-1", label: "工作", count: 5, color: "#3B82F6" },
  { key: "cat-2", label: "学习", count: 3, color: "#10B981" },
  { key: "", label: "未分类", count: 4, color: "#6B7280" },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
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
  localStorage.clear();
  mockedApi.getDashboardStats.mockResolvedValue(mockStats);
  mockedApi.getCompletionTrend.mockResolvedValue(mockTrend);
  mockedApi.getUrgencyDistribution.mockResolvedValue(mockUrgency);
  mockedApi.getCategoryDistribution.mockResolvedValue(mockCategory);
});

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function assertAllCalledWithDays(expectedDays: number) {
  const today = todayLocal();
  expect(mockedApi.getDashboardStats).toHaveBeenLastCalledWith(today);
  expect(mockedApi.getCompletionTrend).toHaveBeenLastCalledWith(expectedDays, today);
  expect(mockedApi.getUrgencyDistribution).toHaveBeenLastCalledWith(expectedDays);
  expect(mockedApi.getCategoryDistribution).toHaveBeenLastCalledWith(expectedDays);
}

describe("DashboardPage rendering", () => {
  it("renders four stat cards with correct values", async () => {
    renderPage();

    // Total plans
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("总计划数")).toBeInTheDocument();
    expect(screen.getByText("较上周 +3")).toBeInTheDocument();

    // Completion rate
    expect(screen.getByText("41.7%")).toBeInTheDocument();
    expect(screen.getByText("完成率")).toBeInTheDocument();

    // Today pending
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("今日待办")).toBeInTheDocument();

    // Overdue
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("逾期")).toBeInTheDocument();
  });

  it("renders the category distribution pie chart", async () => {
    renderPage();

    await screen.findByText("总计划数");
    expect(screen.getByText("分类分布")).toBeInTheDocument();
  });

  it("renders the completion trend line chart", async () => {
    renderPage();

    await screen.findByText("总计划数");
    expect(screen.getByText("完成趋势")).toBeInTheDocument();
  });

  it("renders the urgency distribution bar chart", async () => {
    renderPage();

    await screen.findByText("总计划数");
    expect(screen.getByText("紧急度分布")).toBeInTheDocument();
  });

  it("shows period switcher buttons for trend chart", async () => {
    renderPage();

    await screen.findByText("总计划数");

    expect(screen.getByRole("button", { name: "周" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "月" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "季" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "年" })).toBeInTheDocument();
  });
});

describe("DashboardPage empty state", () => {
  it("shows first-run card and hides it after loading sample data", async () => {
    const makeSample = (id: string) => ({
      id,
      title: `示例 ${id}`,
      description: "示例计划",
      category_id: null,
      parent_id: null,
      importance: 2,
      urgency: 2,
      ddl: null,
      tag_workflow_id: null,
      current_step_index: 0,
      period_type: null,
      period_value: null,
      status: "active" as const,
      completed_at: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    });
    mockedApi.createPlan
      .mockResolvedValueOnce(makeSample("sample-1"))
      .mockResolvedValueOnce(makeSample("sample-2"))
      .mockResolvedValueOnce(makeSample("sample-3"));
    mockedApi.getDashboardStats.mockResolvedValue({
      total_plans: 0,
      completed_plans: 0,
      completion_rate: 0,
      today_pending: 0,
      overdue_count: 0,
      week_change: 0,
    });
    mockedApi.getCompletionTrend.mockResolvedValue([]);
    mockedApi.getUrgencyDistribution.mockResolvedValue([]);
    mockedApi.getCategoryDistribution.mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("开始管理你的计划")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "加载示例数据" }));

    expect(await screen.findByText("暂无数据")).toBeInTheDocument();
    expect(screen.queryByText("开始管理你的计划")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("pph:sample-plan-ids") ?? "[]")).toHaveLength(3);
  });

  it("shows empty state when there are no plans", async () => {
    mockedApi.getDashboardStats.mockResolvedValue({
      total_plans: 0,
      completed_plans: 0,
      completion_rate: 0,
      today_pending: 0,
      overdue_count: 0,
      week_change: 0,
    });
    mockedApi.getCompletionTrend.mockResolvedValue([]);
    mockedApi.getUrgencyDistribution.mockResolvedValue([]);
    mockedApi.getCategoryDistribution.mockResolvedValue([]);

    // The distribution mocks accept `days: number` now; vitest mock fn ignores extra args
    // but we ensure resolve types match.

    renderPage();

    expect(await screen.findByText("暂无数据")).toBeInTheDocument();
    expect(screen.getByText("开始管理你的计划")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建第一个计划" })).toBeInTheDocument();
  });
});

describe("DashboardPage period switching", () => {
  it("passes correct days to all chart APIs on period change", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("总计划数");

    // Default is week (7 days) — all three chart APIs receive 7
    assertAllCalledWithDays(7);

    // Switch to month — all three chart APIs receive 30
    await user.click(screen.getByRole("button", { name: "月" }));
    assertAllCalledWithDays(30);

    // Switch to quarter — all three chart APIs receive 90
    await user.click(screen.getByRole("button", { name: "季" }));
    assertAllCalledWithDays(90);

    // Switch to year — all three chart APIs receive 365
    await user.click(screen.getByRole("button", { name: "年" }));
    assertAllCalledWithDays(365);
  });
});

describe("DashboardPage error handling", () => {
  it("shows error state and single toast when API fails", async () => {
    mockedApi.getDashboardStats.mockRejectedValue(new Error("数据库错误"));

    renderPage();

    expect(await screen.findByText(/加载失败/)).toBeInTheDocument();
    expect(mockToastApiError).toHaveBeenCalledTimes(1);
    expect(mockToastApiError).toHaveBeenCalledWith("加载总览", expect.any(Error));
  });

  it("does not show error toast on successful load", async () => {
    renderPage();

    await screen.findByText("总计划数");
    expect(mockToastApiError).not.toHaveBeenCalled();
  });
});
