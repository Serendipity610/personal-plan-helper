import type { Plan } from "@/types";
import { formatDdl } from "@/lib/date";

export type PeriodType = "daily" | "monthly" | "quarterly" | "yearly" | null;

export interface PlanFormValues {
  title: string;
  description: string;
  categoryId: string | null;
  importance: number;
  urgency: number;
  ddl: string | null;
  periodType: PeriodType;
  periodValue: string;
  tagWorkflowId: string | null;
}

export function toPlanFormValues(plan: Plan): PlanFormValues {
  return {
    title: plan.title,
    description: plan.description,
    categoryId: plan.category_id,
    importance: plan.importance,
    urgency: plan.urgency,
    ddl: formatDdl(plan.ddl) || null,
    periodType: (plan.period_type as PeriodType) ?? null,
    periodValue: plan.period_value ?? "",
    tagWorkflowId: plan.tag_workflow_id ?? null,
  };
}

export function validatePlanForm(values: PlanFormValues): { title?: string } {
  const errors: { title?: string } = {};
  if (!values.title.trim()) {
    errors.title = "标题不能为空";
  }
  return errors;
}
