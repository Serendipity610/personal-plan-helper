import { Settings2, Workflow, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_OPTIONS, TIME_RANGE_OPTIONS } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanStatus, TimeRange } from "@/types";

interface FilterBarProps {
  onManageClick: () => void;
  onWorkflowManageClick?: () => void;
}

export function FilterBar({ onManageClick, onWorkflowManageClick }: FilterBarProps) {
  const categories = useAppStore((s) => s.categories);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const selectedStatus = useAppStore((s) => s.selectedStatus);
  const selectedTimeRange = useAppStore((s) => s.selectedTimeRange);
  const setSelectedCategoryId = useAppStore((s) => s.setSelectedCategoryId);
  const setSelectedStatus = useAppStore((s) => s.setSelectedStatus);
  const setSelectedTimeRange = useAppStore((s) => s.setSelectedTimeRange);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedStatusLabel =
    selectedStatus === "active"
      ? "进行中"
      : STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.label;
  const selectedTimeRangeLabel = TIME_RANGE_OPTIONS.find(
    (option) => option.value === selectedTimeRange,
  )?.label;
  const hasActiveFilters =
    selectedCategoryId !== null || selectedStatus !== "all" || selectedTimeRange !== "all";

  function clearAllFilters() {
    setSelectedCategoryId(null);
    setSelectedStatus("all");
    setSelectedTimeRange("all");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedCategoryId ?? "all"}
          onValueChange={(v) => setSelectedCategoryId(v === "all" ? null : v)}
        >
          <SelectTrigger aria-label="筛选分类" className="h-8 w-28">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedStatus}
          onValueChange={(v) => setSelectedStatus(v as PlanStatus | "all")}
        >
          <SelectTrigger aria-label="筛选状态" className="h-8 w-28">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value === "active" ? "进行中" : option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTimeRange}
          onValueChange={(v) => setSelectedTimeRange(v as TimeRange)}
        >
          <SelectTrigger aria-label="筛选时间段" className="h-8 w-28">
            <SelectValue placeholder="全部时间" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onManageClick}
          aria-label="分类管理"
        >
          <Settings2 className="mr-1 h-3.5 w-3.5" />
          分类管理
        </Button>

        {onWorkflowManageClick && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onWorkflowManageClick}
            aria-label="工作流管理"
          >
            <Workflow className="mr-1 h-3.5 w-3.5" />
            工作流管理
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1" aria-label="已启用筛选">
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
              分类：{selectedCategory.name}
              <button
                type="button"
                className="rounded-sm hover:bg-accent"
                aria-label="移除分类筛选"
                onClick={() => setSelectedCategoryId(null)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedStatus !== "all" && selectedStatusLabel && (
            <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
              状态：{selectedStatusLabel}
              <button
                type="button"
                className="rounded-sm hover:bg-accent"
                aria-label="移除状态筛选"
                onClick={() => setSelectedStatus("all")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedTimeRange !== "all" && selectedTimeRangeLabel && (
            <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
              时间：{selectedTimeRangeLabel}
              <button
                type="button"
                className="rounded-sm hover:bg-accent"
                aria-label="移除时间筛选"
                onClick={() => setSelectedTimeRange("all")}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAllFilters}>
            清除全部
          </Button>
        </div>
      )}
    </div>
  );
}
