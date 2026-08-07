import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import MatrixPage from "@/pages/MatrixPage";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory } from "@/test/fixtures";

vi.mock("@/lib/api", () => ({
  listPlans: vi.fn(),
  listCategories: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const categories = [
  makeCategory({ id: "cat-work", name: "工作计划", color: "#3B82F6", is_default: true }),
  makeCategory({ id: "cat-custom", name: "旅行计划", color: "#10B981", is_default: false }),
];

const plans = [
  makePlan({ id: "p1", title: "写周报", category_id: "cat-work", status: "active" }),
  makePlan({ id: "p2", title: "读论文", category_id: "cat-work", status: "active" }),
  makePlan({ id: "p3", title: "订酒店", category_id: "cat-custom", status: "active" }),
  makePlan({ id: "p4", title: "已完成的旅行", category_id: "cat-custom", status: "completed" }),
  makePlan({ id: "p5", title: "无分类任务", category_id: null, status: "active" }),
];

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/matrix"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="matrix" element={<MatrixPage />} />
        </Route>
      </Routes>
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
  mockedApi.listPlans.mockResolvedValue(plans);
  mockedApi.listCategories.mockResolvedValue(categories);
});

describe("AppLayout sidebar categories", () => {
  it("shows categories with active plan count badges", async () => {
    renderLayout();

    expect(await screen.findByTestId("sidebar-category-all")).toHaveTextContent("4");
    const work = await screen.findByTestId("sidebar-category-cat-work");
    expect(work).toHaveTextContent("工作计划");
    expect(work).toHaveTextContent("2");
    const custom = screen.getByTestId("sidebar-category-cat-custom");
    expect(custom).toHaveTextContent("旅行计划");
    expect(custom).toHaveTextContent("1");
  });

  it("selects a category on click and toggles back to all on second click", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-cat-work");

    await user.click(screen.getByTestId("sidebar-category-cat-work"));
    expect(useAppStore.getState().selectedCategoryId).toBe("cat-work");

    await user.click(screen.getByTestId("sidebar-category-cat-work"));
    expect(useAppStore.getState().selectedCategoryId).toBeNull();
  });

  it("resets the filter via the 全部 entry", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ selectedCategoryId: "cat-custom" });
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    await user.click(screen.getByTestId("sidebar-category-all"));
    expect(useAppStore.getState().selectedCategoryId).toBeNull();
  });
});

describe("AppLayout global filter bar", () => {
  it("filters by status from the header select", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    await user.click(screen.getByRole("combobox", { name: "筛选状态" }));
    await user.click(await screen.findByRole("option", { name: "已完成" }));

    expect(useAppStore.getState().selectedStatus).toBe("completed");
  });

  it("filters by time range from the header select", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    await user.click(screen.getByRole("combobox", { name: "筛选时间段" }));
    await user.click(await screen.findByRole("option", { name: "本周" }));

    expect(useAppStore.getState().selectedTimeRange).toBe("week");
  });

  it("filters by category from the header select", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    await user.click(screen.getByRole("combobox", { name: "筛选分类" }));
    await user.click(await screen.findByRole("option", { name: "旅行计划" }));

    expect(useAppStore.getState().selectedCategoryId).toBe("cat-custom");
  });
});

describe("AppLayout category management dialog", () => {
  async function openManageDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /分类管理/ }));
    return await screen.findByRole("dialog");
  }

  it("lists categories and disables delete for default ones", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    const dialog = await openManageDialog(user);
    expect(within(dialog).getByText("工作计划")).toBeInTheDocument();
    expect(within(dialog).getByText("旅行计划")).toBeInTheDocument();

    const workRow = within(dialog).getByTestId("category-row-cat-work");
    expect(within(workRow).getByText("默认")).toBeInTheDocument();
    expect(within(workRow).getByRole("button", { name: "删除分类 工作计划" })).toBeDisabled();

    const customRow = within(dialog).getByTestId("category-row-cat-custom");
    expect(within(customRow).getByRole("button", { name: "删除分类 旅行计划" })).not.toBeDisabled();
  });

  it("adds a new category with a custom name and color", async () => {
    const user = userEvent.setup();
    mockedApi.createCategory.mockResolvedValue(
      makeCategory({ id: "cat-new", name: "健身计划", color: "#EC4899", is_default: false }),
    );
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    const dialog = await openManageDialog(user);
    await user.type(within(dialog).getByLabelText("分类名称"), "健身计划");
    await user.click(within(dialog).getByRole("button", { name: "颜色 #EC4899" }));
    await user.click(within(dialog).getByRole("button", { name: "新增" }));

    await waitFor(() =>
      expect(mockedApi.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: "健身计划", color: "#EC4899" }),
      ),
    );
    expect(await within(dialog).findByTestId("category-row-cat-new")).toBeInTheDocument();
  });

  it("rejects an empty category name", async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    const dialog = await openManageDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "新增" }));

    expect(within(dialog).getByText("分类名称不能为空")).toBeInTheDocument();
    expect(mockedApi.createCategory).not.toHaveBeenCalled();
  });

  it("edits an existing category", async () => {
    const user = userEvent.setup();
    mockedApi.updateCategory.mockResolvedValue(
      makeCategory({ id: "cat-custom", name: "旅行清单", color: "#10B981", is_default: false }),
    );
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    const dialog = await openManageDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "编辑分类 旅行计划" }));

    const nameInput = within(dialog).getByLabelText("分类名称");
    expect(nameInput).toHaveValue("旅行计划");
    await user.clear(nameInput);
    await user.type(nameInput, "旅行清单");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(mockedApi.updateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cat-custom", name: "旅行清单" }),
      ),
    );
  });

  it("deletes a custom category", async () => {
    const user = userEvent.setup();
    mockedApi.deleteCategory.mockResolvedValue(true);
    renderLayout();
    await screen.findByTestId("sidebar-category-all");

    const dialog = await openManageDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "删除分类 旅行计划" }));

    await waitFor(() => expect(mockedApi.deleteCategory).toHaveBeenCalledWith("cat-custom"));
    await waitFor(() =>
      expect(within(dialog).queryByTestId("category-row-cat-custom")).not.toBeInTheDocument(),
    );
  });

  it("deletes a referenced category and detaches its plans", async () => {
    const user = userEvent.setup();
    mockedApi.deleteCategory.mockResolvedValue(true);
    renderLayout();
    await screen.findByTestId("plan-card-p3");

    const dialog = await openManageDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "删除分类 旅行计划" }));

    await waitFor(() => expect(mockedApi.deleteCategory).toHaveBeenCalledWith("cat-custom"));
    // 引用该分类的计划被置空，不再渲染分类徽标
    await waitFor(() =>
      expect(useAppStore.getState().plans.find((p) => p.id === "p3")?.category_id).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("sidebar-category-cat-custom")).not.toBeInTheDocument(),
    );
    const card = screen.getByTestId("plan-card-p3");
    expect(within(card).queryByText("旅行计划")).not.toBeInTheDocument();
  });
});
