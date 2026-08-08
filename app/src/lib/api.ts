// ============================================================
// Tauri invoke 封装层 — 所有后端命令的类型安全调用
// ============================================================

import { safeInvoke } from "@/lib/bridge";
import type {
  Category,
  TagWorkflow,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagWorkflowRequest,
  UpdateTagWorkflowRequest,
} from "@/types";

// ---- Plans ----

/** 创建计划 */
export async function createPlan(request: CreatePlanRequest): Promise<Plan> {
  return safeInvoke("create_plan", { request });
}

/** 获取单个计划 */
export async function getPlan(id: string): Promise<Plan> {
  return safeInvoke("get_plan", { id });
}

/** 更新计划 — nullable 字段传 null 表示清空，不传表示保持不变 */
export async function updatePlan(request: UpdatePlanRequest): Promise<Plan> {
  return safeInvoke("update_plan", { request });
}

/** 删除计划 */
export async function deletePlan(id: string): Promise<boolean> {
  return safeInvoke("delete_plan", { id });
}

/** 列出计划（可选按状态和分类筛选） */
export async function listPlans(params?: {
  status?: string;
  categoryId?: string;
}): Promise<Plan[]> {
  return safeInvoke("list_plans", {
    status: params?.status ?? null,
    categoryId: params?.categoryId ?? null,
  });
}

// ---- Categories ----

/** 创建分类 */
export async function createCategory(request: CreateCategoryRequest): Promise<Category> {
  return safeInvoke("create_category", { request });
}

/** 列出所有分类 */
export async function listCategories(): Promise<Category[]> {
  return safeInvoke("list_categories");
}

/** 更新分类 */
export async function updateCategory(request: UpdateCategoryRequest): Promise<Category> {
  return safeInvoke("update_category", { request });
}

/** 删除分类 */
export async function deleteCategory(id: string): Promise<boolean> {
  return safeInvoke("delete_category", { id });
}

// ---- Tag Workflows ----

/** 创建标签工作流 */
export async function createTagWorkflow(request: CreateTagWorkflowRequest): Promise<TagWorkflow> {
  return safeInvoke("create_tag_workflow", { request });
}

/** 更新标签工作流 */
export async function updateTagWorkflow(request: UpdateTagWorkflowRequest): Promise<TagWorkflow> {
  return safeInvoke("update_tag_workflow", { request });
}

/** 删除标签工作流 */
export async function deleteTagWorkflow(id: string): Promise<boolean> {
  return safeInvoke("delete_tag_workflow", { id });
}

/** 列出所有标签工作流 */
export async function listTagWorkflows(): Promise<TagWorkflow[]> {
  return safeInvoke("list_tag_workflows");
}

// ---- Aggregates (Dashboard) ----

import type {
  DashboardStats,
  CompletionTrendPoint,
  DistributionItem,
} from "@/types";

/** 获取看板统计卡片数据 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return safeInvoke("get_dashboard_stats");
}

/** 获取近 N 天每日完成趋势 */
export async function getCompletionTrend(
  days: number,
): Promise<CompletionTrendPoint[]> {
  return safeInvoke("get_completion_trend", { days });
}

/** 获取紧急度分布（按时间范围 days 过滤） */
export async function getUrgencyDistribution(
  days: number,
): Promise<DistributionItem[]> {
  return safeInvoke("get_urgency_distribution", { days });
}

/** 获取分类分布（按时间范围 days 过滤） */
export async function getCategoryDistribution(
  days: number,
): Promise<DistributionItem[]> {
  return safeInvoke("get_category_distribution", { days });
}
