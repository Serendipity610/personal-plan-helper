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
  /** 预置分类（工作计划等）：不可删除但可编辑 */
  is_default: boolean;
  created_at: string;
}

/** 标签工作流模板 */
export interface TagWorkflow {
  id: string;
  name: string;
  steps: string; // JSON 字符串数组，如 '["步骤1","步骤2"]'
  created_at: string;
}

/** 计划状态 */
export type PlanStatus = "active" | "completed" | "cancelled";

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
  status: PlanStatus;
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

/** 更新分类请求 */
export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

/** 创建工作流请求 */
export interface CreateTagWorkflowRequest {
  name: string;
  steps: string; // JSON array string
}

/** 更新工作流请求 */
export interface UpdateTagWorkflowRequest {
  id: string;
  name?: string;
  steps?: string;
}

// ============================================================
// 辅助类型
// ============================================================

/** 艾森豪威尔矩阵象限 */
export type Quadrant = "q1" | "q2" | "q3" | "q4";

/** 全局筛选的时间段 */
export type TimeRange = "all" | "today" | "week" | "month" | "quarter" | "year";

/** 列表视图的可排序列 */
export type PlanSortKey = "importance" | "urgency" | "ddl" | "created_at";

/** 排序方向 */
export type SortDirection = "asc" | "desc";

// ============================================================
// 看板数据类型 — 与 Rust aggregates.rs 保持同步
// ============================================================

/** 看板统计卡片数据 */
export interface DashboardStats {
  total_plans: number;
  completed_plans: number;
  completion_rate: number;
  today_pending: number;
  overdue_count: number;
  week_change: number;
}

/** 每日完成趋势数据点 */
export interface CompletionTrendPoint {
  date: string;
  count: number;
}

/** 分布数据项（紧急度分布、分类分布共用） */
export interface DistributionItem {
  key: string;
  label: string;
  count: number;
  color: string;
}

/** 看板时间段 */
export type DashboardPeriod = "week" | "month" | "quarter" | "year";
