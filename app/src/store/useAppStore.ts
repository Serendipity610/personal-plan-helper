import { create } from "zustand";
import type { Plan, Category, TagWorkflow, PlanStatus } from "@/types";
import * as api from "@/lib/api";

// ── State shape ──────────────────────────────────────────────

interface AppState {
  // Data
  plans: Plan[];
  categories: Category[];
  tagWorkflows: TagWorkflow[];

  // UI state
  selectedCategoryId: string | null;
  selectedStatus: PlanStatus | "all";
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
  clearError: () => void;
}

// ── Store ────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  plans: [],
  categories: [],
  tagWorkflows: [],
  selectedCategoryId: null,
  selectedStatus: "all",
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

/** Map importance + urgency (0-4 each) to an Eisenhower quadrant */
export function getQuadrant(importance: number, urgency: number): 1 | 2 | 3 | 4 {
  if (importance >= 2.5 && urgency >= 2.5) return 1; // 重要紧急
  if (importance >= 2.5 && urgency < 2.5) return 2; // 重要不紧急
  if (importance < 2.5 && urgency >= 2.5) return 3; // 不重要紧急
  return 4; // 不重要不紧急
}

/** Get a human-readable label for a quadrant */
export function getQuadrantLabel(q: 1 | 2 | 3 | 4): string {
  switch (q) {
    case 1:
      return "重要紧急";
    case 2:
      return "重要不紧急";
    case 3:
      return "不重要紧急";
    case 4:
      return "不重要不紧急";
  }
}
