import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import * as api from "@/lib/api";
import { makePlan, makeCategory } from "@/test/fixtures";

vi.mock("@/lib/api", () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  listPlans: vi.fn(),
  listCategories: vi.fn(),
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
