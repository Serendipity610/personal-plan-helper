import { create } from "zustand";
import type { Plan, Category, TagWorkflow, PlanStatus, TimeRange } from "@/types";
import { filterPlans } from "@/lib/filters";
import * as api from "@/lib/api";

// ── State shape ──────────────────────────────────────────────

export interface AppState {
  // Data
  plans: Plan[];
  categories: Category[];
  tagWorkflows: TagWorkflow[];

  // UI state — 全局筛选条件
  selectedCategoryId: string | null;
  selectedStatus: PlanStatus | "all";
  selectedTimeRange: TimeRange;
  loading: boolean;
  error: string | null;

  // ── Plan actions ──
  fetchPlans: (params?: { categoryId?: string; status?: string }) => Promise<void>;
  addPlan: (input: Parameters<typeof api.createPlan>[0]) => Promise<Plan>;
  editPlan: (input: Parameters<typeof api.updatePlan>[0]) => Promise<Plan>;
  removePlan: (id: string) => Promise<void>;

  // ── Category actions ──
  fetchCategories: () => Promise<void>;
  addCategory: (input: Parameters<typeof api.createCategory>[0]) => Promise<Category>;
  editCategory: (input: Parameters<typeof api.updateCategory>[0]) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;

  // ── Tag workflow actions ──
  fetchTagWorkflows: () => Promise<void>;
  addTagWorkflow: (input: Parameters<typeof api.createTagWorkflow>[0]) => Promise<TagWorkflow>;
  editTagWorkflow: (input: Parameters<typeof api.updateTagWorkflow>[0]) => Promise<TagWorkflow>;
  removeTagWorkflow: (id: string) => Promise<void>;

  // ── UI actions ──
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedStatus: (status: PlanStatus | "all") => void;
  setSelectedTimeRange: (range: TimeRange) => void;
  clearError: () => void;
}

// ── Store ────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  plans: [],
  categories: [],
  tagWorkflows: [],
  selectedCategoryId: null,
  selectedStatus: "all",
  selectedTimeRange: "all",
  loading: false,
  error: null,

  // ── Plans ────────────────────────────────────────────────

  fetchPlans: async (params) => {
    set({ loading: true, error: null });
    try {
      const plans = await api.listPlans(params);
      set({ plans });
    } catch (e) {
      set({ error: `加载计划失败: ${String(e)}` });
    } finally {
      set({ loading: false });
    }
  },

  addPlan: async (input) => {
    const plan = await api.createPlan(input);
    set({ plans: [plan, ...get().plans] });
    return plan;
  },

  editPlan: async (input) => {
    const plan = await api.updatePlan(input);
    set({
      plans: get().plans.map((p) => (p.id === plan.id ? plan : p)),
    });
    return plan;
  },

  removePlan: async (id) => {
    await api.deletePlan(id);
    set({ plans: get().plans.filter((p) => p.id !== id) });
  },

  // ── Categories ───────────────────────────────────────────

  fetchCategories: async () => {
    try {
      const categories = await api.listCategories();
      set({ categories });
    } catch (e) {
      set({ error: `加载分类失败: ${String(e)}` });
    }
  },

  addCategory: async (input) => {
    const category = await api.createCategory(input);
    set({ categories: [...get().categories, category] });
    return category;
  },

  editCategory: async (input) => {
    const category = await api.updateCategory(input);
    set({
      categories: get().categories.map((c) => (c.id === category.id ? category : c)),
    });
    return category;
  },

  removeCategory: async (id) => {
    await api.deleteCategory(id);
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },

  // ── Tag workflows ────────────────────────────────────────

  fetchTagWorkflows: async () => {
    try {
      const workflows = await api.listTagWorkflows();
      set({ tagWorkflows: workflows });
    } catch (e) {
      set({ error: `加载工作流失败: ${String(e)}` });
    }
  },

  addTagWorkflow: async (input) => {
    const workflow = await api.createTagWorkflow(input);
    set({ tagWorkflows: [...get().tagWorkflows, workflow] });
    return workflow;
  },

  editTagWorkflow: async (input) => {
    const workflow = await api.updateTagWorkflow(input);
    set({
      tagWorkflows: get().tagWorkflows.map((w) => (w.id === workflow.id ? workflow : w)),
    });
    return workflow;
  },

  removeTagWorkflow: async (id) => {
    await api.deleteTagWorkflow(id);
    set({ tagWorkflows: get().tagWorkflows.filter((w) => w.id !== id) });
  },

  // ── UI ──────────────────────────────────────────────────

  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
  clearError: () => set({ error: null }),
}));

// ── Selectors ────────────────────────────────────────────────

/** Derive the parsed steps array from a TagWorkflow's JSON steps field */
export function parseWorkflowSteps(workflow: TagWorkflow | null | undefined): string[] {
  if (!workflow) return [];
  try {
    return JSON.parse(workflow.steps) as string[];
  } catch {
    return [];
  }
}

/** 按全局筛选条件（分类/状态/时间段）过滤计划 */
export function selectFilteredPlans(
  state: Pick<AppState, "plans" | "selectedCategoryId" | "selectedStatus" | "selectedTimeRange">,
): Plan[] {
  return filterPlans(state.plans, {
    categoryId: state.selectedCategoryId,
    status: state.selectedStatus,
    timeRange: state.selectedTimeRange,
  });
}
