// ============================================================
// 快速创建计划 — 文本解析器
// ============================================================
// 解析 "分类：【优先级标签】标题" 格式的输入文本，
// 提取已知分类、四个明确优先级标签，解析失败时完整保留原始标题。
// ============================================================

/** 优先级标签 → 象限代表性评分映射 */
export const PRIORITY_TAGS: Record<string, { importance: number; urgency: number }> = {
  重要紧急: { importance: 3, urgency: 3 },
  重要不紧急: { importance: 3, urgency: 1 },
  不重要紧急: { importance: 1, urgency: 3 },
  不重要不紧急: { importance: 1, urgency: 1 },
};

export interface ParsedQuickInput {
  /** 匹配到的分类 ID，未匹配则为 null */
  categoryId: string | null;
  /** 匹配到的优先级评分，未匹配则为 null */
  priority: { importance: number; urgency: number } | null;
  /** 去除分类前缀与优先级标签后的实际标题（已 trim） */
  title: string;
}

/** 解析格式字符串中表示分类与标题分隔的全角冒号 */
const CATEGORY_SEPARATOR = "：";

/** 优先级标签包裹符号 */
const TAG_OPEN = "【";
const TAG_CLOSE = "】";

/**
 * 从快速输入文本中解析分类、优先级与标题。
 *
 * 解析策略（best-effort）：
 * 1. 查找第一个全角冒号 `：`，其前部分作为候选分类名精确匹配已知分类；
 *    匹配失败 → 整体作为标题。
 * 2. 在剩余正文中查找开头的 `【标签】`，标签内容精确匹配四个优先级标签；
 *    匹配失败 → 整个正文保留为标题。
 * 3. trim 最终标题。
 *
 * @param input    用户原始输入
 * @param categories  已知分类列表
 * @returns 解析结果
 */
export function parseQuickCaptureInput(
  input: string,
  categories: { id: string; name: string }[],
): ParsedQuickInput {
  const trimmed = input.trim();

  let remaining = trimmed;
  let categoryId: string | null = null;

  // ── Step 1: extract category prefix ──────────────────────
  const sepIdx = trimmed.indexOf(CATEGORY_SEPARATOR);
  if (sepIdx > 0) {
    const candidateName = trimmed.slice(0, sepIdx);
    const matched = categories.find((c) => c.name === candidateName);
    if (matched) {
      categoryId = matched.id;
      remaining = trimmed.slice(sepIdx + 1);
    }
  }

  // ── Step 2: extract priority tag ─────────────────────────
  let priority: ParsedQuickInput["priority"] = null;

  if (remaining.startsWith(TAG_OPEN)) {
    const closeIdx = remaining.indexOf(TAG_CLOSE, TAG_OPEN.length);
    if (closeIdx > TAG_OPEN.length) {
      const tagContent = remaining.slice(TAG_OPEN.length, closeIdx);
      const point = PRIORITY_TAGS[tagContent];
      if (point) {
        priority = { ...point };
        remaining = remaining.slice(closeIdx + TAG_CLOSE.length);
      }
    }
  }

  // ── Step 3: derive title ──────────────────────────────────
  const title = remaining.trim();

  return { categoryId, priority, title };
}
