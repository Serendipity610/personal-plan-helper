import {
  addDays,
  addMonths,
  addYears,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { Plan, PlanSortKey, PlanStatus, SortDirection, TimeRange } from "@/types";
import { formatDdl, fromDateInputValue } from "@/lib/date";

export type { PlanSortKey, SortDirection, TimeRange };

// ── 选项（供筛选栏复用） ──────────────────────────────────────

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季" },
  { value: "year", label: "本年" },
];

export const STATUS_OPTIONS: { value: PlanStatus | "all"; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "活跃" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

// ── 时间段筛选 ────────────────────────────────────────────────

export interface TimeRangeBounds {
  start: Date;
  end: Date;
}

/** 计算时间段 [start, end)；"all" 返回 null 表示不过滤 */
export function timeRangeBounds(range: TimeRange, now: Date = new Date()): TimeRangeBounds | null {
  switch (range) {
    case "all":
      return null;
    case "today": {
      const start = startOfDay(now);
      return { start, end: addDays(start, 1) };
    }
    case "week": {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return { start, end: addDays(start, 7) };
    }
    case "month": {
      const start = startOfMonth(now);
      return { start, end: addMonths(start, 1) };
    }
    case "quarter": {
      const start = startOfQuarter(now);
      return { start, end: addMonths(start, 3) };
    }
    case "year": {
      const start = startOfYear(now);
      return { start, end: addYears(start, 1) };
    }
  }
}

/** 计划是否落在时间段内：以 DDL 日期判定，无 DDL 的计划不匹配具体时间段 */
export function planMatchesTimeRange(
  plan: Plan,
  range: TimeRange,
  now: Date = new Date(),
): boolean {
  const bounds = timeRangeBounds(range, now);
  if (!bounds) return true;
  if (!plan.ddl) return false;
  const ddlDate = fromDateInputValue(formatDdl(plan.ddl));
  return ddlDate >= bounds.start && ddlDate < bounds.end;
}

// ── 组合筛选 ──────────────────────────────────────────────────

export interface PlanFilters {
  categoryId: string | null;
  status: PlanStatus | "all";
  timeRange: TimeRange;
}

export function filterPlans(plans: Plan[], filters: PlanFilters, now: Date = new Date()): Plan[] {
  return plans.filter((plan) => {
    if (filters.categoryId !== null && plan.category_id !== filters.categoryId) return false;
    if (filters.status !== "all" && plan.status !== filters.status) return false;
    if (!planMatchesTimeRange(plan, filters.timeRange, now)) return false;
    return true;
  });
}

// ── 排序 ──────────────────────────────────────────────────────

export function sortPlans(plans: Plan[], key: PlanSortKey, direction: SortDirection): Plan[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...plans].sort((a, b) => {
    if (key === "ddl") {
      if (a.ddl === null && b.ddl === null) return 0;
      if (a.ddl === null) return 1;
      if (b.ddl === null) return -1;
      return a.ddl < b.ddl ? -factor : a.ddl > b.ddl ? factor : 0;
    }
    const av = key === "created_at" ? a.created_at : a[key];
    const bv = key === "created_at" ? b.created_at : b[key];
    return av < bv ? -factor : av > bv ? factor : 0;
  });
}
