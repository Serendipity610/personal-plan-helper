import { fromDateInputValue, formatDdl } from "@/lib/date";
import { differenceInCalendarDays, startOfDay } from "date-fns";

export type DdlStatus = "overdue" | "today" | "soon" | "normal";

export interface DdlInfo {
  status: DdlStatus;
  /** 距离今天的天数：负数=已逾期，0=今天到期，正数=剩余天数 */
  daysDiff: number;
  /** UI 展示用的中文标签，normal 状态为空字符串 */
  label: string;
}

/**
 * 根据 DDL 和当前时间计算提醒状态。
 * 比较基于日期（忽略时间），以自然日计算天数差。
 */
export function getDdlStatus(ddl: string | null, now: Date = new Date()): DdlInfo {
  if (!ddl) {
    return { status: "normal", daysDiff: 0, label: "" };
  }

  const dateStr = formatDdl(ddl);
  if (!dateStr) {
    return { status: "normal", daysDiff: 0, label: "" };
  }

  const ddlDate = startOfDay(fromDateInputValue(dateStr));
  const today = startOfDay(now);
  const daysDiff = differenceInCalendarDays(ddlDate, today);

  if (daysDiff < 0) {
    return { status: "overdue", daysDiff, label: `已逾期 ${Math.abs(daysDiff)} 天` };
  }
  if (daysDiff === 0) {
    return { status: "today", daysDiff: 0, label: "今天截止" };
  }
  if (daysDiff <= 3) {
    return { status: "soon", daysDiff, label: "即将到期" };
  }
  return { status: "normal", daysDiff, label: "" };
}
