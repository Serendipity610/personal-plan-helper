import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDdl } from "@/lib/date";
import { getDdlStatus } from "@/lib/ddl";
import type { DdlStatus } from "@/lib/ddl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const DDL_BADGE_STYLES: Record<DdlStatus, string> = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  today: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  soon: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  normal: "",
};

import type { Category, Plan, PlanStatus, TagWorkflow } from "@/types";

export interface PlanCardActions {
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan, status: PlanStatus) => void;
}

interface PlanCardProps extends PlanCardActions {
  plan: Plan;
  category: Category | undefined;
  workflow?: TagWorkflow;
  onStepChange?: (plan: Plan, newIndex: number) => void;
}

interface PlanCardContentProps {
  plan: Plan;
  category: Category | undefined;
  actions?: PlanCardActions;
  workflowSteps?: string[];
  onStepChange?: (plan: Plan, newIndex: number) => void;
}

/** Parse JSON steps array from a TagWorkflow */
function parseSteps(workflow?: TagWorkflow): string[] {
  if (!workflow) return [];
  try {
    return JSON.parse(workflow.steps) as string[];
  } catch {
    return [];
  }
}

function PlanCardContent({ plan, category, actions, workflowSteps, onStepChange }: PlanCardContentProps) {
  const hasSteps = workflowSteps && workflowSteps.length > 0;
  const currentStep = hasSteps ? workflowSteps[plan.current_step_index] ?? "" : "";
  const isFirst = plan.current_step_index === 0;
  const isLast = hasSteps ? plan.current_step_index >= workflowSteps.length - 1 : true;

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{plan.title}</p>
        {actions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label="计划操作"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {plan.status === "active" ? (
                <>
                  <DropdownMenuItem onSelect={() => actions.onToggleStatus(plan, "completed")}>
                    标记完成
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.onToggleStatus(plan, "cancelled")}>
                    标记取消
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={() => actions.onToggleStatus(plan, "active")}>
                  重新激活
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => actions.onDelete(plan)}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {plan.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{plan.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {category && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${category.color}1f`, color: category.color }}
          >
            {category.name}
          </span>
        )}
        {plan.ddl && (() => {
          const ddlInfo = getDdlStatus(plan.ddl);
          return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDdl(plan.ddl)}
              {ddlInfo.status !== "normal" && (
                <span
                  className={cn(
                    "ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                    DDL_BADGE_STYLES[ddlInfo.status],
                  )}
                >
                  {ddlInfo.label}
                </span>
              )}
            </span>
          );
        })()}
      </div>
      {hasSteps && onStepChange && (
        <div className="mt-2 flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="上一步"
            disabled={isFirst}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStepChange(plan, plan.current_step_index - 1);
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-0 flex-1 text-center text-xs text-muted-foreground">
            {currentStep}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {plan.current_step_index + 1}/{workflowSteps.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="下一步"
            disabled={isLast}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStepChange(plan, plan.current_step_index + 1);
            }}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </>
  );
}

/** 矩阵中的可拖拽计划卡片；点击卡片进入编辑 */
export function PlanCard({ plan, category, workflow, onEdit, onDelete, onToggleStatus, onStepChange }: PlanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: plan.id });
  const workflowSteps = parseSteps(workflow);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`编辑计划 ${plan.title}`}
      data-testid={`plan-card-${plan.id}`}
      onClick={() => onEdit(plan)}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-colors",
        "hover:border-primary/40 hover:shadow",
        isDragging && "opacity-40",
      )}
    >
      <PlanCardContent
        plan={plan}
        category={category}
        actions={{ onEdit, onDelete, onToggleStatus }}
        workflowSteps={workflowSteps}
        onStepChange={onStepChange}
      />
    </div>
  );
}

/** 拖拽过程中的跟随卡片（静态渲染，不注册拖拽源） */
export function PlanCardOverlay({
  plan,
  category,
  workflow,
  onStepChange,
}: {
  plan: Plan;
  category: Category | undefined;
  workflow?: TagWorkflow;
  onStepChange?: (plan: Plan, newIndex: number) => void;
}) {
  const workflowSteps = parseSteps(workflow);

  return (
    <div className="w-64 rounded-lg border bg-card p-3 shadow-lg">
      <PlanCardContent
        plan={plan}
        category={category}
        workflowSteps={workflowSteps}
        onStepChange={onStepChange}
      />
    </div>
  );
}
