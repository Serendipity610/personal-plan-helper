import type { Plan, Quadrant } from "@/types";

/** 重要度/紧急度判定象限的阈值 */
export const QUADRANT_THRESHOLD = 2.5;

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  q1: "重要紧急",
  q2: "重要不紧急",
  q3: "不重要紧急",
  q4: "不重要不紧急",
};

/** 根据 importance/urgency 计算所在象限 */
export function getQuadrant(importance: number, urgency: number): Quadrant {
  if (importance >= QUADRANT_THRESHOLD && urgency >= QUADRANT_THRESHOLD) return "q1";
  if (importance >= QUADRANT_THRESHOLD) return "q2";
  if (urgency >= QUADRANT_THRESHOLD) return "q3";
  return "q4";
}

/** 拖入某个象限时使用的代表性 (importance, urgency) 值 */
export function getQuadrantPoint(q: Quadrant): { importance: number; urgency: number } {
  switch (q) {
    case "q1":
      return { importance: 3, urgency: 3 };
    case "q2":
      return { importance: 3, urgency: 1 };
    case "q3":
      return { importance: 1, urgency: 3 };
    case "q4":
      return { importance: 1, urgency: 1 };
  }
}

/**
 * 拖拽落点解析：目标象限与当前象限不同时返回新的评分，否则返回 null。
 * null 也用于落点不在任何象限（拖回原处 / 拖到空白区域）。
 */
export function resolveQuadrantDrop(
  plan: Pick<Plan, "importance" | "urgency">,
  overQuadrant: Quadrant | null,
): { importance: number; urgency: number } | null {
  if (!overQuadrant) return null;
  if (getQuadrant(plan.importance, plan.urgency) === overQuadrant) return null;
  return getQuadrantPoint(overQuadrant);
}
