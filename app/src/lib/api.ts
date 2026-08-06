// ============================================================
// Tauri invoke 封装层 — 所有后端命令的类型安全调用
// ============================================================

import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  TagWorkflow,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateCategoryRequest,
  CreateTagWorkflowRequest,
} from "@/types";

// ---- Plans ----

/** 创建计划 */
export async function createPlan(
  request: CreatePlanRequest
): Promise<Plan> {
  return invoke("create_plan", { request });
}

/** 获取单个计划 */
export async function getPlan(id: string): Promise<Plan> {
  return invoke("get_plan", { id });
}

/** 更新计划 */
export async function updatePlan(
  request: UpdatePlanRequest
): Promise<Plan> {
  return invoke("update_plan", { request });
}

/** 删除计划 */
export async function deletePlan(id: string): Promise<boolean> {
  return invoke("delete_plan", { id });
}

/** 列出计划（可选按状态筛选） */
export async function listPlans(
  status?: "active" | "completed" | "cancelled"
): Promise<Plan[]> {
  return invoke("list_plans", { status: status ?? null });
}

// ---- Categories ----

/** 创建分类 */
export async function createCategory(
  request: CreateCategoryRequest
): Promise<Category> {
  return invoke("create_category", { request });
}

/** 列出所有分类 */
export async function listCategories(): Promise<Category[]> {
  return invoke("list_categories");
}

// ---- Tag Workflows ----

/** 创建标签工作流 */
export async function createTagWorkflow(
  request: CreateTagWorkflowRequest
): Promise<TagWorkflow> {
  return invoke("create_tag_workflow", { request });
}

/** 列出所有标签工作流 */
export async function listTagWorkflows(): Promise<TagWorkflow[]> {
  return invoke("list_tag_workflows");
}
