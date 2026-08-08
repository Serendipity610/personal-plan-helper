import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useAppStore, parseWorkflowSteps } from "@/store/useAppStore";
import { PlanCard, PlanCardOverlay } from "@/components/plans/PlanCard";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { DeletePlanDialog } from "@/components/plans/DeletePlanDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Plan } from "@/types";

/** Group plans by step index (or null for unbound) */
interface ColumnData {
  key: string;
  title: string;
  plans: Plan[];
}

/** A single droppable kanban column */
function KanbanColumn({ col }: { col: ColumnData }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] flex-col rounded-lg border bg-muted/30 ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">{col.title}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
          {col.plans.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 p-2 overflow-y-auto">
        {col.plans.map((plan) => (
          <KanbanPlanCard key={plan.id} plan={plan} />
        ))}
        {col.plans.length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            暂无计划
          </p>
        )}
      </div>
    </div>
  );
}

/** Plan card within kanban (not directly draggable — the column is droppable, cards are dragged from PlanCard's useDraggable) */
function KanbanPlanCard({ plan }: { plan: Plan }) {
  const categories = useAppStore((s) => s.categories);
  const tagWorkflows = useAppStore((s) => s.tagWorkflows);
  const editPlan = useAppStore((s) => s.editPlan);

  const category = categories.find((c) => c.id === plan.category_id);
  const workflow = plan.tag_workflow_id
    ? tagWorkflows.find((w) => w.id === plan.tag_workflow_id) ?? undefined
    : undefined;

  return (
    <PlanCard
      plan={plan}
      category={category}
      workflow={workflow}
      onEdit={() => {}}
      onDelete={() => {}}
      onToggleStatus={() => {}}
      onStepChange={(p, newIndex) => editPlan({ id: p.id, current_step_index: newIndex })}
    />
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(200px, 1fr))" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-muted/30">
          <div className="border-b px-3 py-2">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2 p-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function KanbanPage() {
  const plans = useAppStore((s) => s.plans);
  const categories = useAppStore((s) => s.categories);
  const tagWorkflows = useAppStore((s) => s.tagWorkflows);
  const editPlan = useAppStore((s) => s.editPlan);
  const removePlan = useAppStore((s) => s.removePlan);
  const loading = useAppStore((s) => s.loading);
  const fetchPlans = useAppStore((s) => s.fetchPlans);
  const fetchTagWorkflows = useAppStore((s) => s.fetchTagWorkflows);

  // Track user's explicit selection; derive effective ID (auto-first when unset)
  const [userSelectedWorkflowId, setUserSelectedWorkflowId] = useState<string | null>(null);
  const selectedWorkflowId: string | null =
    userSelectedWorkflowId ?? tagWorkflows[0]?.id ?? null;
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchTagWorkflows();
  }, [fetchPlans, fetchTagWorkflows]);

  const selectedWorkflow = useMemo(
    () => tagWorkflows.find((wf) => wf.id === selectedWorkflowId) ?? null,
    [tagWorkflows, selectedWorkflowId],
  );

  const steps = useMemo(() => parseWorkflowSteps(selectedWorkflow), [selectedWorkflow]);

  // Build columns
  const columns = useMemo((): ColumnData[] => {
    const activePlans = plans.filter((p) => p.status === "active");

    if (!selectedWorkflow) {
      // No workflow selected — show all unbound plans in one column
      const unbound = activePlans.filter((p) => !p.tag_workflow_id);
      return [{ key: "unclassified", title: "未分类", plans: unbound }];
    }

    const cols: ColumnData[] = steps.map((step, index) => ({
      key: `step-${index}`,
      title: step,
      plans: activePlans.filter(
        (p) => p.tag_workflow_id === selectedWorkflow.id && p.current_step_index === index,
      ),
    }));

    // Add 未分类 column for plans with no workflow binding
    const unbound = activePlans.filter((p) => !p.tag_workflow_id);
    cols.push({ key: "unclassified", title: "未分类", plans: unbound });

    return cols;
  }, [plans, selectedWorkflow, steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const plan = plans.find((p) => p.id === event.active.id);
    setActivePlan(plan ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActivePlan(null);
    const { active, over } = event;
    if (!over) return;

    const planId = String(active.id);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const overId = String(over.id);

    // Parse target column from droppable id
    if (overId.startsWith("step-")) {
      const newStep = parseInt(overId.replace("step-", ""), 10);
      if (newStep !== plan.current_step_index || plan.tag_workflow_id !== selectedWorkflow?.id) {
        try {
          await editPlan({
            id: plan.id,
            tag_workflow_id: selectedWorkflow?.id ?? null,
            current_step_index: newStep,
          });
        } catch {
          // Drag fails silently, store keeps current state
        }
      }
    } else if (overId === "unclassified") {
      // Drop into unclassified — detach workflow
      if (plan.tag_workflow_id !== null) {
        try {
          await editPlan({
            id: plan.id,
            tag_workflow_id: null,
            current_step_index: 0,
          });
        } catch {
          // Drag fails silently
        }
      }
    }
  }

  function getCategory(id: string | null) {
    if (!id) return undefined;
    return categories.find((c) => c.id === id);
  }

  function handleStepChange(plan: Plan, newIndex: number) {
    editPlan({ id: plan.id, current_step_index: newIndex });
  }

  async function handleConfirmDelete(plan: Plan) {
    setDeletingPlan(null);
    try {
      await removePlan(plan.id);
    } catch {
      // keep current state
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">看板视图</h2>
        <div className="flex items-center gap-2">
          <select
            aria-label="选择工作流"
            value={selectedWorkflowId ?? ""}
            onChange={(e) => setUserSelectedWorkflowId(e.target.value || null)}
            className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {tagWorkflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
          <Button onClick={() => { setEditingPlan(null); setFormOpen(true); }} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            新建计划
          </Button>
        </div>
      </div>

      {loading && plans.length === 0 ? (
        <KanbanSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 7)}, minmax(200px, 1fr))` }}
          >
            {columns.map((col) => (
              <KanbanColumn key={col.key} col={col} />
            ))}
          </div>

          <DragOverlay>
            {activePlan && (
              <PlanCardOverlay
                plan={activePlan}
                category={getCategory(activePlan.category_id)}
                workflow={selectedWorkflow ?? undefined}
                onStepChange={handleStepChange}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {formOpen && <PlanFormDialog onOpenChange={setFormOpen} plan={editingPlan} />}
      <DeletePlanDialog
        plan={deletingPlan}
        onOpenChange={(open) => !open && setDeletingPlan(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
