import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore, selectFilteredPlans } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory } from "@/test/fixtures";

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const mockedApi = vi.mocked(api);

describe("useAppStore plan actions", () => {
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
  });

  it("addPlan prepends the created plan", async () => {
    const created = makePlan({ id: "new-1", title: "新计划" });
    mockedApi.createPlan.mockResolvedValue(created);

    const result = await useAppStore.getState().addPlan({ title: "新计划" });

    expect(result).toEqual(created);
    expect(useAppStore.getState().plans).toEqual([created]);
  });

  it("editPlan replaces the matching plan in place", async () => {
    const existing = makePlan({ id: "p1", title: "旧标题" });
    const updated = makePlan({ id: "p1", title: "新标题" });
    useAppStore.setState({ plans: [existing] });
    mockedApi.updatePlan.mockResolvedValue(updated);

    await useAppStore.getState().editPlan({ id: "p1", title: "新标题" });

    expect(useAppStore.getState().plans).toEqual([updated]);
  });

  it("removePlan deletes the plan and drops it from state", async () => {
    useAppStore.setState({ plans: [makePlan({ id: "p1" }), makePlan({ id: "p2" })] });
    mockedApi.deletePlan.mockResolvedValue(true);

    await useAppStore.getState().removePlan("p1");

    expect(mockedApi.deletePlan).toHaveBeenCalledWith("p1");
    expect(useAppStore.getState().plans.map((p) => p.id)).toEqual(["p2"]);
  });

  it("fetchPlans loads plans into state", async () => {
    const plans = [makePlan({ id: "p1" })];
    mockedApi.listPlans.mockResolvedValue(plans);

    await useAppStore.getState().fetchPlans();

    expect(useAppStore.getState().plans).toEqual(plans);
    expect(useAppStore.getState().loading).toBe(false);
  });

  it("fetchPlans records an error when the api fails", async () => {
    mockedApi.listPlans.mockRejectedValue(new Error("db down"));

    await useAppStore.getState().fetchPlans();

    expect(useAppStore.getState().error).toContain("db down");
    expect(useAppStore.getState().plans).toEqual([]);
  });

  it("fetchCategories loads categories into state", async () => {
    const categories = [makeCategory()];
    mockedApi.listCategories.mockResolvedValue(categories);

    await useAppStore.getState().fetchCategories();

    expect(useAppStore.getState().categories).toEqual(categories);
  });
});

describe("useAppStore category actions", () => {
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
  });

  it("addCategory appends the created category", async () => {
    const created = makeCategory({ id: "new-cat", name: "旅行计划" });
    mockedApi.createCategory.mockResolvedValue(created);

    const result = await useAppStore.getState().addCategory({ name: "旅行计划", color: "#10B981" });

    expect(result).toEqual(created);
    expect(useAppStore.getState().categories).toEqual([created]);
  });

  it("editCategory replaces the matching category in place", async () => {
    const existing = makeCategory({ id: "cat-1", name: "旧分类" });
    const updated = makeCategory({ id: "cat-1", name: "新分类" });
    useAppStore.setState({ categories: [existing] });
    mockedApi.updateCategory.mockResolvedValue(updated);

    await useAppStore.getState().editCategory({ id: "cat-1", name: "新分类" });

    expect(useAppStore.getState().categories).toEqual([updated]);
  });

  it("removeCategory deletes the category and drops it from state", async () => {
    useAppStore.setState({
      categories: [makeCategory({ id: "cat-1" }), makeCategory({ id: "cat-2" })],
    });
    mockedApi.deleteCategory.mockResolvedValue(true);

    await useAppStore.getState().removeCategory("cat-1");

    expect(mockedApi.deleteCategory).toHaveBeenCalledWith("cat-1");
    expect(useAppStore.getState().categories.map((c) => c.id)).toEqual(["cat-2"]);
  });

  it("removeCategory clears category_id on referencing plans", async () => {
    useAppStore.setState({
      categories: [makeCategory({ id: "cat-1" })],
      plans: [
        makePlan({ id: "p1", category_id: "cat-1" }),
        makePlan({ id: "p2", category_id: "cat-2" }),
      ],
    });
    mockedApi.deleteCategory.mockResolvedValue(true);

    await useAppStore.getState().removeCategory("cat-1");

    expect(useAppStore.getState().categories).toEqual([]);
    expect(useAppStore.getState().plans.map((p) => [p.id, p.category_id])).toEqual([
      ["p1", null],
      ["p2", "cat-2"],
    ]);
  });
});

describe("useAppStore global filters", () => {
  beforeEach(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    useAppStore.setState({
      plans: [
        makePlan({ id: "a", category_id: "c1", status: "active", ddl: today }),
        makePlan({ id: "b", category_id: "c2", status: "completed", ddl: today }),
        makePlan({ id: "c", category_id: "c1", status: "active", ddl: null }),
      ],
      categories: [],
      tagWorkflows: [],
      selectedCategoryId: null,
      selectedStatus: "all",
      selectedTimeRange: "all",
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("setSelectedTimeRange updates the time range", () => {
    useAppStore.getState().setSelectedTimeRange("week");
    expect(useAppStore.getState().selectedTimeRange).toBe("week");
  });

  it("selectFilteredPlans applies the category filter", () => {
    useAppStore.setState({ selectedCategoryId: "c1" });
    expect(selectFilteredPlans(useAppStore.getState()).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("selectFilteredPlans applies the status filter", () => {
    useAppStore.setState({ selectedStatus: "completed" });
    expect(selectFilteredPlans(useAppStore.getState()).map((p) => p.id)).toEqual(["b"]);
  });

  it("selectFilteredPlans applies the time range filter", () => {
    useAppStore.setState({ selectedTimeRange: "today" });
    expect(selectFilteredPlans(useAppStore.getState()).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("selectFilteredPlans combines all filters", () => {
    useAppStore.setState({
      selectedCategoryId: "c1",
      selectedStatus: "active",
      selectedTimeRange: "today",
    });
    expect(selectFilteredPlans(useAppStore.getState()).map((p) => p.id)).toEqual(["a"]);
  });
});
