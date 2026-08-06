// ============================================================
// 数据模型类型定义 — 与 Rust models.rs 保持同步
// ============================================================

/** 计划分类 */
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

/** 标签工作流模板 */
export interface TagWorkflow {
  id: string;
  name: string;
  steps: string; // JSON 字符串数组，如 '["步骤1","步骤2"]'
  created_at: string;
}

/** 计划/任务主实体 */
export interface Plan {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  parent_id: string | null;
  importance: number; // 0-4
  urgency: number; // 0-4
  ddl: string | null; // ISO 8601
  tag_workflow_id: string | null;
  current_step_index: number;
  period_type: "daily" | "monthly" | "quarterly" | "yearly" | null;
  period_value: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

/** 操作日志 */
export interface PlanLog {
  id: string;
  plan_id: string;
  action: string;
  detail: string;
  created_at: string;
}

// ============================================================
// 请求 DTO — 与 Rust models.rs 的 request structs 保持同步
// ============================================================

/** 创建计划请求 */
export interface CreatePlanRequest {
  title: string;
  description?: string;
  category_id?: string | null;
  parent_id?: string | null;
  importance?: number;
  urgency?: number;
  ddl?: string | null;
  tag_workflow_id?: string | null;
  current_step_index?: number;
  period_type?: string | null;
  period_value?: string | null;
  status?: string;
}

/** 更新计划请求 */
export interface UpdatePlanRequest {
  id: string;
  title?: string;
  description?: string;
  category_id?: string | null;
  parent_id?: string | null;
  importance?: number;
  urgency?: number;
  ddl?: string | null;
  tag_workflow_id?: string | null;
  current_step_index?: number;
  period_type?: string | null;
  period_value?: string | null;
  status?: string;
}

/** 创建分类请求 */
export interface CreateCategoryRequest {
  name: string;
  color: string;
  icon?: string;
  sort_order?: number;
}

/** 创建工作流请求 */
export interface CreateTagWorkflowRequest {
  name: string;
  steps: string; // JSON array string
}

// ============================================================
// 辅助类型
// ============================================================

/** 艾森豪威尔矩阵象限 */
export type Quadrant = "q1" | "q2" | "q3" | "q4";

/** 根据 importance/urgency 计算所在象限 */
export function getQuadrant(
  importance: number,
  urgency: number
): Quadrant {
  if (importance >= 2 && urgency >= 2) return "q1"; // 重要且紧急
  if (importance >= 2 && urgency < 2) return "q2"; // 重要不紧急
  if (importance < 2 && urgency >= 2) return "q3"; // 不重要紧急
  return "q4"; // 不重要不紧急
}
