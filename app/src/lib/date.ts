/** 将 Date 转换为本地时区的 YYYY-MM-DD 字符串 */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 将 YYYY-MM-DD 字符串解析为本地时区的 Date */
export function fromDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 将数据库中存储的 DDL（YYYY-MM-DD 或 ISO 时间戳）规范化为 YYYY-MM-DD。
 * 无效输入返回空字符串。
 */
export function formatDdl(iso: string | null): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return toDateInputValue(date);
}
