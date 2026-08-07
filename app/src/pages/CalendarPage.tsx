import { useState, useEffect, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  startOfYear,
  addDays,
  addMonths,
  addQuarters,
  addYears,
  subMonths,
  subQuarters,
  subYears,
  getQuarter,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { filterPlans } from "@/lib/filters";
import { getDdlStatus } from "@/lib/ddl";
import { formatDdl } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import type { Plan } from "@/types";
import type { DdlStatus } from "@/lib/ddl";

type ViewMode = "day" | "month" | "quarter" | "year";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "日" },
  { value: "month", label: "月" },
  { value: "quarter", label: "季" },
  { value: "year", label: "年" },
];

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const DDL_BADGE_STYLES: Record<DdlStatus, string> = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  today: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  soon: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  normal: "",
};

// ── Helpers ───────────────────────────────────────────────────

function plansByDdlDate(plans: Plan[]): Map<string, Plan[]> {
  const map = new Map<string, Plan[]>();
  for (const plan of plans) {
    const dateStr = formatDdl(plan.ddl);
    if (!dateStr) continue;
    const existing = map.get(dateStr);
    if (existing) {
      existing.push(plan);
    } else {
      map.set(dateStr, [plan]);
    }
  }
  return map;
}

function plansByMonth(plans: Plan[]): Map<string, Plan[]> {
  const map = new Map<string, Plan[]>();
  for (const plan of plans) {
    const dateStr = formatDdl(plan.ddl);
    if (!dateStr) continue;
    const monthKey = dateStr.slice(0, 7); // YYYY-MM
    const existing = map.get(monthKey);
    if (existing) {
      existing.push(plan);
    } else {
      map.set(monthKey, [plan]);
    }
  }
  return map;
}

function plansByQuarter(plans: Plan[]): Map<string, Plan[]> {
  const map = new Map<string, Plan[]>();
  for (const plan of plans) {
    const dateStr = formatDdl(plan.ddl);
    if (!dateStr) continue;
    const y = Number(dateStr.slice(0, 4));
    const m = Number(dateStr.slice(5, 7));
    const q = Math.ceil(m / 3);
    const qKey = `${y}-Q${q}`;
    const existing = map.get(qKey);
    if (existing) {
      existing.push(plan);
    } else {
      map.set(qKey, [plan]);
    }
  }
  return map;
}

function getDaysInMonthGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

// ── Sub-components ────────────────────────────────────────────

function PeriodTabs({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          role="tab"
          aria-selected={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === mode.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function PeriodNav({
  label,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  onLabelClick,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  onLabelClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev} aria-label={prevLabel}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        type="button"
        data-testid="period-title"
        className={cn("min-w-[120px] text-center text-sm font-semibold", onLabelClick && "cursor-pointer hover:text-primary")}
        onClick={onLabelClick}
      >
        {label}
      </button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext} aria-label={nextLabel}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function DdlBadge({ ddl, now }: { ddl: string | null; now: Date }) {
  const info = getDdlStatus(ddl, now);
  if (info.status === "normal") return null;
  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        DDL_BADGE_STYLES[info.status],
      )}
    >
      {info.label}
    </span>
  );
}

function PlanListItem({ plan, now }: { plan: Plan; now: Date }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="flex-1 truncate">{plan.title}</span>
      <DdlBadge ddl={plan.ddl} now={now} />
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────

function DayView({ plans, date, now }: { plans: Plan[]; date: Date; now: Date }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayPlans = useMemo(() => {
    const byDate = plansByDdlDate(plans);
    return (byDate.get(dateStr) ?? []).sort((a, b) => {
      if (!a.ddl) return 1;
      if (!b.ddl) return -1;
      return a.ddl.localeCompare(b.ddl);
    });
  }, [plans, dateStr]);

  return (
    <div data-testid="day-view" className="space-y-2">
      {dayPlans.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">当天无计划</p>
      ) : (
        dayPlans.map((plan) => <PlanListItem key={plan.id} plan={plan} now={now} />)
      )}
    </div>
  );
}

function MonthView({
  plans,
  date,
  onDayClick,
}: {
  plans: Plan[];
  date: Date;
  onDayClick?: (date: Date) => void;
}) {
  const days = useMemo(() => getDaysInMonthGrid(date), [date]);
  const ddlMap = useMemo(() => plansByDdlDate(plans), [plans]);

  return (
    <div data-testid="month-view">
      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {wd}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 border-t border-l">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPlans = ddlMap.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, date);
          const isTodayDate = isToday(day);

          return (
            <button
              key={key}
              data-testid={`calendar-day-${key}`}
              type="button"
              onClick={() => onDayClick?.(day)}
              className={cn(
                "flex min-h-[3rem] flex-col items-center border-r border-b p-1 transition-colors hover:bg-accent",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isTodayDate && "bg-accent/50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isTodayDate && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              {dayPlans.length > 0 && (
                <span
                  data-testid="plan-indicator"
                  className="mt-0.5 flex flex-wrap justify-center gap-0.5"
                >
                  {dayPlans.slice(0, 3).map((plan) => (
                    <span
                      key={plan.id}
                      className="block h-1 w-1 rounded-full bg-primary"
                    />
                  ))}
                  {dayPlans.length > 3 && (
                    <span className="text-[0.6rem] leading-none text-muted-foreground">
                      +{dayPlans.length - 3}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuarterView({
  plans,
  date,
  onMonthClick,
}: {
  plans: Plan[];
  date: Date;
  onMonthClick?: (date: Date) => void;
}) {
  const quarterStart = startOfQuarter(date);
  const months = [0, 1, 2].map((i) => addMonths(quarterStart, i));
  const monthMap = useMemo(() => plansByMonth(plans), [plans]);

  return (
    <div data-testid="quarter-view" className="grid grid-cols-3 gap-4">
      {months.map((m) => {
        const monthKey = format(m, "yyyy-MM");
        const count = monthMap.get(monthKey)?.length ?? 0;
        return (
          <button
            key={monthKey}
            data-testid={`quarter-month-${format(m, "M")}`}
            type="button"
            onClick={() => onMonthClick?.(m)}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <span className="text-sm font-medium">{format(m, "M月", { locale: zhCN })}</span>
            <span className="text-2xl font-bold">{count}</span>
            <span className="text-xs text-muted-foreground">个计划</span>
          </button>
        );
      })}
    </div>
  );
}

function YearView({
  plans,
  date,
  onQuarterClick,
}: {
  plans: Plan[];
  date: Date;
  onQuarterClick?: (date: Date) => void;
}) {
  const yearStart = startOfYear(date);
  const quarters = [0, 1, 2, 3].map((i) => addMonths(yearStart, i * 3));
  const quarterMap = useMemo(() => plansByQuarter(plans), [plans]);

  return (
    <div data-testid="year-view" className="grid grid-cols-4 gap-4">
      {quarters.map((qStart, i) => {
        const qKey = `${format(qStart, "yyyy")}-Q${i + 1}`;
        const count = quarterMap.get(qKey)?.length ?? 0;
        return (
          <button
            key={qKey}
            data-testid={`year-quarter-${i + 1}`}
            type="button"
            onClick={() => onQuarterClick?.(qStart)}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <span className="text-sm font-medium">Q{i + 1}</span>
            <span className="text-2xl font-bold">{count}</span>
            <span className="text-xs text-muted-foreground">个计划</span>
          </button>
        );
      })}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const rawPlans = useAppStore((s) => s.plans);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const selectedStatus = useAppStore((s) => s.selectedStatus);
  const selectedTimeRange = useAppStore((s) => s.selectedTimeRange);
  const loading = useAppStore((s) => s.loading);
  const fetchPlans = useAppStore((s) => s.fetchPlans);
  const fetchCategories = useAppStore((s) => s.fetchCategories);

  // Filter plans in useMemo to avoid infinite re-render loops from selector returning new arrays
  const plans = useMemo(
    () =>
      filterPlans(rawPlans, {
        categoryId: selectedCategoryId,
        status: selectedStatus,
        timeRange: selectedTimeRange,
      }),
    [rawPlans, selectedCategoryId, selectedStatus, selectedTimeRange],
  );

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Store the initial "now" for consistent DDL calculations during the session
  const [now] = useState(new Date());

  useEffect(() => {
    fetchPlans();
    fetchCategories();
  }, [fetchPlans, fetchCategories]);

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      switch (viewMode) {
        case "day":
          return addDays(d, -1);
        case "month":
          return subMonths(d, 1);
        case "quarter":
          return subQuarters(d, 1);
        case "year":
          return subYears(d, 1);
      }
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      switch (viewMode) {
        case "day":
          return addDays(d, 1);
        case "month":
          return addMonths(d, 1);
        case "quarter":
          return addQuarters(d, 1);
        case "year":
          return addYears(d, 1);
      }
    });
  }, [viewMode]);

  // Drill-down handlers
  const handleQuarterMonthClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("month");
  }, []);

  const handleYearQuarterClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("quarter");
  }, []);

  const handleMonthDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  }, []);

  // Period label
  const periodLabel = useMemo(() => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "yyyy年M月d日", { locale: zhCN });
      case "month":
        return format(currentDate, "yyyy年M月", { locale: zhCN });
      case "quarter": {
        const q = getQuarter(currentDate);
        return `${format(currentDate, "yyyy")}年Q${q}`;
      }
      case "year":
        return `${format(currentDate, "yyyy")}年`;
    }
  }, [viewMode, currentDate]);

  const navLabels = useMemo(() => {
    switch (viewMode) {
      case "day":
        return { prev: "上一天", next: "下一天" };
      case "month":
        return { prev: "上一月", next: "下一月" };
      case "quarter":
        return { prev: "上一季", next: "下一季" };
      case "year":
        return { prev: "上一年", next: "下一年" };
    }
  }, [viewMode]);

  // ── Loading state ──
  if (loading && plans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">日历视图</h2>
          <PeriodTabs value={viewMode} onChange={setViewMode} />
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  // ── Empty state ──
  if (!loading && plans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">日历视图</h2>
          <PeriodTabs value={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="mb-4 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">暂无计划</p>
          <p className="mt-1 text-sm">创建计划后即可在此查看日历视图</p>
          <Button className="mt-4" onClick={() => { setEditingPlan(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />
            创建计划
          </Button>
        </div>
        {formOpen && <PlanFormDialog onOpenChange={setFormOpen} plan={editingPlan} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">日历视图</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setEditingPlan(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />
            新建计划
          </Button>
          <PeriodTabs value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-center">
        <PeriodNav
          label={periodLabel}
          onPrev={handlePrev}
          onNext={handleNext}
          prevLabel={navLabels.prev}
          nextLabel={navLabels.next}
          onLabelClick={
            viewMode !== "day"
              ? undefined
              : () => {
                  setViewMode("month");
                }
          }
        />
      </div>

      {/* View content */}
      <div>
        {viewMode === "day" && <DayView plans={plans} date={currentDate} now={now} />}
        {viewMode === "month" && (
          <MonthView plans={plans} date={currentDate} onDayClick={handleMonthDayClick} />
        )}
        {viewMode === "quarter" && (
          <QuarterView plans={plans} date={currentDate} onMonthClick={handleQuarterMonthClick} />
        )}
        {viewMode === "year" && (
          <YearView plans={plans} date={currentDate} onQuarterClick={handleYearQuarterClick} />
        )}
      </div>

      {formOpen && <PlanFormDialog onOpenChange={setFormOpen} plan={editingPlan} />}
    </div>
  );
}
