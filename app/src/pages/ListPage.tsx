import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Ellipsis,
  List,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDdl } from "@/lib/date";
import { filterPlans, sortPlans, type PlanSortKey, type SortDirection } from "@/lib/filters";
import { QUADRANT_LABELS, getQuadrantPoint } from "@/lib/quadrant";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { DeletePlanDialog } from "@/components/plans/DeletePlanDialog";
import { PlanInlineEdit } from "@/components/plans/PlanInlineEdit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Plan, PlanStatus, Quadrant as QuadrantType } from "@/types";

const SORT_COLUMNS: { key: PlanSortKey; label: string }[] = [
  { key: "importance", label: "重要度" },
  { key: "urgency", label: "紧急度" },
  { key: "ddl", label: "DDL" },
  { key: "created_at", label: "创建时间" },
];

const STATUS_LABELS: Record<PlanStatus, string> = {
  active: "活跃",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_STYLES: Record<PlanStatus, string> = {
  active: "bg-blue-500/10 text-blue-600",
  completed: "bg-green-500/10 text-green-600",
  cancelled: "bg-muted text-muted-foreground",
};

const QUADRANT_OPTIONS: QuadrantType[] = ["q1", "q2", "q3", "q4"];

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-muted/40 px-3 py-2">
        <Skeleton className="h-6 w-full" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-3 py-3 last:border-0">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function ListPage() {
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

  const [sort, setSort] = useState<{ key: PlanSortKey; direction: SortDirection }>({
    key: "created_at",
    direction: "desc",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCategories();
  }, [fetchPlans, fetchCategories]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filteredPlans = useMemo(
    () =>
      filterPlans(plans, {
        categoryId: selectedCategoryId,
        status: selectedStatus,
        timeRange: selectedTimeRange,
      }),
    [plans, selectedCategoryId, selectedStatus, selectedTimeRange],
  );

  const sorted = useMemo(
    () => sortPlans(filteredPlans, sort.key, sort.direction),
    [filteredPlans, sort],
  );

  const allSelected = sorted.length > 0 && sorted.every((p) => selected.has(p.id));

  function handleSort(key: PlanSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
        : { key, direction: "desc" },
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((p) => p.id)));
  }

  async function batchSetStatus(status: PlanStatus) {
    setBusy(true);
    try {
      await Promise.all([...selected].map((id) => editPlan({ id, status })));
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  function openCreateDialog() {
    setEditingPlan(null);
    setFormOpen(true);
  }

  function openEditDialog(plan: Plan) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  async function handleConfirmDelete(plan: Plan) {
    setDeletingPlan(null);
    try {
      await removePlan(plan.id);
    } catch {
      // keep current state
    }
  }

  // ── Inline action handlers ──────────────────────────────

  async function handleSaveTitle(plan: Plan, newTitle: string) {
    await editPlan({ id: plan.id, title: newTitle });
  }

  async function handleToggleStatus(plan: Plan) {
    // Cancelled plans should not be silently resurrected via toggle
    if (plan.status === "cancelled") return;
    const nextStatus: PlanStatus =
      plan.status === "active" ? "completed" : "active";
    try {
      await editPlan({ id: plan.id, status: nextStatus });
    } catch {
      // store handled toast — suppress unhandled rejection
    }
  }

  async function handleChangeCategory(plan: Plan, categoryId: string | null) {
    try {
      await editPlan({ id: plan.id, category_id: categoryId });
    } catch {
      // store handled toast — suppress unhandled rejection
    }
  }

  async function handleChangeQuadrant(plan: Plan, quadrant: QuadrantType) {
    const point = getQuadrantPoint(quadrant);
    try {
      await editPlan({ id: plan.id, importance: point.importance, urgency: point.urgency });
    } catch {
      // store handled toast — suppress unhandled rejection
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">列表视图</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <div data-testid="batch-bar" className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">已选 {selected.size} 项</span>
              <Button size="sm" onClick={() => batchSetStatus("completed")} disabled={busy}>
                标记完成
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => batchSetStatus("cancelled")}
                disabled={busy}
                aria-label="标记取消"
              >
                标记取消
              </Button>
            </div>
          )}
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            新建计划
          </Button>
        </div>
      </div>

      {loading && plans.length === 0 ? (
        <ListSkeleton />
      ) : sorted.length === 0 && plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <List className="mb-4 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">暂无计划</p>
          <p className="mt-1 text-sm">创建第一个计划，管理你的待办事项</p>
          <Button className="mt-4" onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            创建计划
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <List className="mb-4 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">无匹配结果</p>
          <p className="mt-1 text-sm">尝试调整筛选条件查看其他计划</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 font-medium">标题</th>
                <th className="px-3 py-2 font-medium">分类</th>
                {SORT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 font-medium"
                    aria-sort={
                      sort.key === col.key
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      aria-label={`按${col.label}排序`}
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        sort.key === col.key ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {col.label}
                      {sort.key === col.key ? (
                        sort.direction === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUp className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((plan) => {
                const category = categoryById.get(plan.category_id ?? "");
                return (
                  <tr
                    key={plan.id}
                    data-testid={`plan-row-${plan.id}`}
                    className={cn(
                      "border-b last:border-0",
                      selected.has(plan.id) && "bg-accent/40",
                    )}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`选择 ${plan.title}`}
                        checked={selected.has(plan.id)}
                        onChange={() => toggleSelect(plan.id)}
                      />
                    </td>
                    {/* ── Title: inline editable ────────────── */}
                    <td className="max-w-64 px-3 py-2">
                      <PlanInlineEdit
                        value={plan.title}
                        onSave={(newTitle) => handleSaveTitle(plan, newTitle)}
                      />
                    </td>
                    {/* ── Category: quick menu ──────────────── */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 font-normal"
                            aria-label={`更换分类: ${plan.title}`}
                          >
                            {category ? (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${category.color}1f`,
                                  color: category.color,
                                }}
                              >
                                {category.name}
                                <ChevronDown className="ml-0.5 h-3 w-3" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                未分类
                                <ChevronDown className="h-3 w-3" />
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onSelect={() => handleChangeCategory(plan, null)}>
                            <span className="text-muted-foreground">无分类</span>
                            {!plan.category_id && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {categories.map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onSelect={() => handleChangeCategory(plan, c.id)}
                            >
                              <span
                                className="inline-flex items-center gap-1.5"
                                style={{ color: c.color }}
                              >
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: c.color }}
                                />
                                {c.name}
                              </span>
                              {plan.category_id === c.id && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    {/* ── Importance & Urgency: quadrant quick menu ── */}
                    <td className="px-3 py-2 tabular-nums" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-1 font-normal tabular-nums"
                            aria-label={`象限快捷操作: ${plan.title}`}
                          >
                            {plan.importance}
                            <ChevronDown className="ml-0.5 h-3 w-3 opacity-40" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {QUADRANT_OPTIONS.map((q) => {
                            const point = getQuadrantPoint(q);
                            const isCurrent =
                              plan.importance === point.importance &&
                              plan.urgency === point.urgency;
                            return (
                              <DropdownMenuItem
                                key={q}
                                onSelect={() => handleChangeQuadrant(plan, q)}
                              >
                                <span>
                                  {QUADRANT_LABELS[q]}
                                  <span className="ml-1.5 text-xs text-muted-foreground">
                                    (重要 {point.importance} · 紧急 {point.urgency})
                                  </span>
                                </span>
                                {isCurrent && <Check className="ml-auto h-4 w-4" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{plan.urgency}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDdl(plan.ddl) || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDdl(plan.created_at)}</td>
                    {/* ── Status: clickable toggle ───────────── */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          STATUS_STYLES[plan.status],
                        )}
                        aria-label={`切换状态: ${STATUS_LABELS[plan.status]}`}
                        onClick={() => handleToggleStatus(plan)}
                      >
                        {STATUS_LABELS[plan.status]}
                      </button>
                    </td>
                    {/* ── Actions: more details + delete ──────── */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1"
                          aria-label={`更多详情: ${plan.title}`}
                          onClick={() => openEditDialog(plan)}
                        >
                          <Ellipsis className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          aria-label={`删除 ${plan.title}`}
                          onClick={() => setDeletingPlan(plan)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
