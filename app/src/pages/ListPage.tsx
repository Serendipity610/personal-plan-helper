import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDdl } from "@/lib/date";
import { filterPlans, sortPlans, type PlanSortKey, type SortDirection } from "@/lib/filters";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import type { PlanStatus } from "@/types";

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

  const [sort, setSort] = useState<{ key: PlanSortKey; direction: SortDirection }>({
    key: "created_at",
    direction: "desc",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">列表视图</h2>
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
      </div>

      {loading && filteredPlans.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">暂无计划</p>
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
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${plan.title}`}
                        checked={selected.has(plan.id)}
                        onChange={() => toggleSelect(plan.id)}
                      />
                    </td>
                    <td className="max-w-64 truncate px-3 py-2 font-medium">{plan.title}</td>
                    <td className="px-3 py-2">
                      {category && (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${category.color}1f`, color: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{plan.importance}</td>
                    <td className="px-3 py-2 tabular-nums">{plan.urgency}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDdl(plan.ddl) || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDdl(plan.created_at)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_STYLES[plan.status],
                        )}
                      >
                        {STATUS_LABELS[plan.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
