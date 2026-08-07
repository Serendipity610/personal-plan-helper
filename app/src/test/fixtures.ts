import type { Plan, Category } from "@/types";

export function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    title: "测试计划",
    description: "",
    category_id: null,
    parent_id: null,
    importance: 1,
    urgency: 1,
    ddl: null,
    tag_workflow_id: null,
    current_step_index: 0,
    period_type: null,
    period_value: null,
    status: "active",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "工作",
    color: "#ef4444",
    icon: "briefcase",
    sort_order: 1,
    is_default: false,
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}
