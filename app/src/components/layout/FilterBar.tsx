import { Settings2 } from "lucide-react";
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
}

export function FilterBar({ onManageClick }: FilterBarProps) {
  const categories = useAppStore((s) => s.categories);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const selectedStatus = useAppStore((s) => s.selectedStatus);
  const selectedTimeRange = useAppStore((s) => s.selectedTimeRange);
  const setSelectedCategoryId = useAppStore((s) => s.setSelectedCategoryId);
  const setSelectedStatus = useAppStore((s) => s.setSelectedStatus);
  const setSelectedTimeRange = useAppStore((s) => s.setSelectedTimeRange);

  return (
    <div className="flex items-center gap-2">
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
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedTimeRange} onValueChange={(v) => setSelectedTimeRange(v as TimeRange)}>
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
    </div>
  );
}
