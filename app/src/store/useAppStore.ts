import { create } from "zustand";
import type { Plan, Category, TagWorkflow, PlanStatus, TimeRange } from "@/types";
import { filterPlans } from "@/lib/filters";
import * as api from "@/lib/api";
import { toast, toastApiError } from "@/lib/toast";

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
      toastApiError("加载计划", e);
    } finally {
      set({ loading: false });
    }
  },

  addPlan: async (input) => {
    try {
      const plan = await api.createPlan(input);
      set({ plans: [plan, ...get().plans] });
      toast.success("计划创建成功");
      return plan;
    } catch (e) {
      toast.error(`创建计划失败: ${String(e)}`);
      throw e;
    }
  },

  editPlan: async (input) => {
    try {
      const plan = await api.updatePlan(input);
      set({
        plans: get().plans.map((p) => (p.id === plan.id ? plan : p)),
      });
      toast.success("计划更新成功");
      return plan;
    } catch (e) {
      toast.error(`更新计划失败: ${String(e)}`);
      throw e;
    }
  },

  removePlan: async (id) => {
    try {
      await api.deletePlan(id);
      set({ plans: get().plans.filter((p) => p.id !== id) });
      toast.success("计划已删除");
    } catch (e) {
      toast.error(`删除计划失败: ${String(e)}`);
      throw e;
    }
  },

  // ── Categories ───────────────────────────────────────────

  fetchCategories: async () => {
    try {
      const categories = await api.listCategories();
      set({ categories });
    } catch (e) {
      set({ error: `加载分类失败: ${String(e)}` });
      toastApiError("加载分类", e);
    }
  },

  addCategory: async (input) => {
    try {
      const category = await api.createCategory(input);
      set({ categories: [...get().categories, category] });
      toast.success("分类创建成功");
      return category;
    } catch (e) {
      toast.error(`创建分类失败: ${String(e)}`);
      throw e;
    }
  },

  editCategory: async (input) => {
    try {
      const category = await api.updateCategory(input);
      set({
        categories: get().categories.map((c) => (c.id === category.id ? category : c)),
      });
      toast.success("分类更新成功");
      return category;
    } catch (e) {
      toast.error(`更新分类失败: ${String(e)}`);
      throw e;
    }
  },

  removeCategory: async (id) => {
    try {
      await api.deleteCategory(id);
      set({
        categories: get().categories.filter((c) => c.id !== id),
        // 后端删除时已将引用计划的 category_id 置空，本地同步避免残留失效引用
        plans: get().plans.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)),
      });
      toast.success("分类已删除");
    } catch (e) {
      toast.error(`删除分类失败: ${String(e)}`);
      throw e;
    }
  },

  // ── Tag workflows ────────────────────────────────────────

  fetchTagWorkflows: async () => {
    try {
      const workflows = await api.listTagWorkflows();
      set({ tagWorkflows: workflows });
    } catch (e) {
      set({ error: `加载工作流失败: ${String(e)}` });
      toastApiError("加载工作流", e);
    }
  },

  addTagWorkflow: async (input) => {
    try {
      const workflow = await api.createTagWorkflow(input);
      set({ tagWorkflows: [...get().tagWorkflows, workflow] });
      toast.success("工作流创建成功");
      return workflow;
    } catch (e) {
      toast.error(`创建工作流失败: ${String(e)}`);
      throw e;
    }
  },

  editTagWorkflow: async (input) => {
    try {
      const workflow = await api.updateTagWorkflow(input);
      set({
        tagWorkflows: get().tagWorkflows.map((w) => (w.id === workflow.id ? workflow : w)),
      });
      toast.success("工作流更新成功");
      return workflow;
    } catch (e) {
      toast.error(`更新工作流失败: ${String(e)}`);
      throw e;
    }
  },

  removeTagWorkflow: async (id) => {
    try {
      await api.deleteTagWorkflow(id);
      set({ tagWorkflows: get().tagWorkflows.filter((w) => w.id !== id) });
      toast.success("工作流已删除");
    } catch (e) {
      toast.error(`删除工作流失败: ${String(e)}`);
      throw e;
    }
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
