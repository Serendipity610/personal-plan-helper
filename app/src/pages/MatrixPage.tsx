import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUADRANT_LABELS, getQuadrant, resolveQuadrantDrop } from "@/lib/quadrant";
import { filterPlans } from "@/lib/filters";
import { useAppStore } from "@/store/useAppStore";
import { PlanCard, PlanCardOverlay } from "@/components/plans/PlanCard";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { DeletePlanDialog } from "@/components/plans/DeletePlanDialog";
import { Button } from "@/components/ui/button";
import type { Plan, PlanStatus, Quadrant } from "@/types";

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];

const QUADRANT_ACCENTS: Record<Quadrant, string> = {
  q1: "border-l-4 border-red-400",
  q2: "border-l-4 border-blue-400",
  q3: "border-l-4 border-amber-400",
  q4: "border-l-4 border-green-400",
};

interface QuadrantDropzoneProps {
  quadrant: Quadrant;
  children: ReactNode;
}

function QuadrantDropzone({ quadrant, children }: QuadrantDropzoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `quadrant-${quadrant}`,
    data: { quadrant },
  });

  return (
    <section
      ref={setNodeRef}
      data-testid={`quadrant-${quadrant}`}
      className={cn(
        "min-h-40 rounded-lg border bg-card p-3 transition-colors",
        QUADRANT_ACCENTS[quadrant],
        isOver && "bg-accent ring-2 ring-primary/50",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{QUADRANT_LABELS[quadrant]}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyQuadrant() {
  return <p className="py-8 text-center text-sm text-muted-foreground">暂无计划</p>;
}

export default function MatrixPage() {
  const plans = useAppStore((s) => s.plans);
  const categories = useAppStore((s) => s.categories);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const selectedStatus = useAppStore((s) => s.selectedStatus);
  const selectedTimeRange = useAppStore((s) => s.selectedTimeRange);
  const loading = useAppStore((s) => s.loading);
  const fetchPlans = useAppStore((s) => s.fetchPlans);
  const fetchCategories = useAppStore((s) => s.fetchCategories);
  const editPlan = useAppStore((s) => s.editPlan);
  const removePlan = useAppStore((s) => s.removePlan);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [draggedPlan, setDraggedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCategories();
  }, [fetchPlans, fetchCategories]);

  // 全局筛选：四象限本质是执行视图，状态为"全部"时仅展示活跃计划
  const activePlans = useMemo(() => {
    const effectiveStatus = selectedStatus === "all" ? "active" : selectedStatus;
    return filterPlans(plans, {
      categoryId: selectedCategoryId,
      status: effectiveStatus,
      timeRange: selectedTimeRange,
    });
  }, [plans, selectedCategoryId, selectedStatus, selectedTimeRange]);

  const plansByQuadrant = useMemo(() => {
    const buckets: Record<Quadrant, Plan[]> = { q1: [], q2: [], q3: [], q4: [] };
    for (const plan of activePlans) {
      buckets[getQuadrant(plan.importance, plan.urgency)].push(plan);
    }
    return buckets;
  }, [activePlans]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function openCreateDialog() {
    setEditingPlan(null);
    setFormOpen(true);
  }

  function openEditDialog(plan: Plan) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggedPlan(plans.find((p) => p.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedPlan(null);
    const plan = plans.find((p) => p.id === event.active.id);
    const overQuadrant = event.over?.data.current?.quadrant as Quadrant | undefined;
    if (!plan) return;
    const drop = resolveQuadrantDrop(plan, overQuadrant ?? null);
    if (!drop) return;
    editPlan({ id: plan.id, importance: drop.importance, urgency: drop.urgency }).catch(() => {
      // 保存失败由 store 保持原状态，无需额外处理
    });
  }

  async function handleToggleStatus(plan: Plan, status: PlanStatus) {
    try {
      await editPlan({ id: plan.id, status });
    } catch {
      // 保持原状态
    }
  }

  async function handleConfirmDelete(plan: Plan) {
    setDeletingPlan(null);
    try {
      await removePlan(plan.id);
    } catch {
      // 保持原状态
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">艾森豪威尔四象限</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          新建计划
        </Button>
      </div>

      {loading && plans.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-2">
            {QUADRANT_ORDER.map((quadrant) => {
              const quadrantPlans = plansByQuadrant[quadrant];
              return (
                <QuadrantDropzone key={quadrant} quadrant={quadrant}>
                  {quadrantPlans.length === 0 ? (
                    <EmptyQuadrant />
                  ) : (
                    quadrantPlans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        category={categoryById.get(plan.category_id ?? "")}
                        onEdit={openEditDialog}
                        onDelete={setDeletingPlan}
                        onToggleStatus={handleToggleStatus}
                      />
                    ))
                  )}
                </QuadrantDropzone>
              );
            })}
          </div>
          <DragOverlay>
            {draggedPlan ? (
              <PlanCardOverlay
                plan={draggedPlan}
                category={categoryById.get(draggedPlan.category_id ?? "")}
              />
            ) : null}
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
