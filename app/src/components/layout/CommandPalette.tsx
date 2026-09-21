import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Grid3X3, Columns3, Calendar, List, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDdl } from "@/lib/date";
import { getDdlStatus } from "@/lib/ddl";
import { useAppStore } from "@/store/useAppStore";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import type { Plan, PlanStatus } from "@/types";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: "navigation" | "action" | "plan";
  onSelect: () => void;
  keywords?: string[];
  plan?: Plan;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePlan: () => void;
}

const NAV_ITEMS = [
  { to: "/matrix", label: "四象限", icon: <Grid3X3 className="h-4 w-4" /> },
  { to: "/kanban", label: "看板", icon: <Columns3 className="h-4 w-4" /> },
  { to: "/calendar", label: "日历", icon: <Calendar className="h-4 w-4" /> },
  { to: "/list", label: "全部计划", icon: <List className="h-4 w-4" /> },
  { to: "/dashboard", label: "数据总览", icon: <LayoutDashboard className="h-4 w-4" /> },
];

const STATUS_LABELS: Record<PlanStatus, string> = {
  active: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

function isOverdue(plan: Plan): boolean {
  return plan.status === "active" && getDdlStatus(plan.ddl).status === "overdue";
}

export function CommandPalette({ open, onOpenChange, onCreatePlan }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const navigate = useNavigate();
  const plans = useAppStore((s) => s.plans);
  const categories = useAppStore((s) => s.categories);
  const tagWorkflows = useAppStore((s) => s.tagWorkflows);
  const editPlan = useAppStore((s) => s.editPlan);

  useEffect(() => {
    function handleExternalOpen() {
      onOpenChange(true);
    }
    window.addEventListener("pph:open-command-palette", handleExternalOpen);
    return () => window.removeEventListener("pph:open-command-palette", handleExternalOpen);
  }, [onOpenChange]);

  // 每次打开时清空上一次的搜索状态（渲染期调整状态，避免 effect 级联渲染）
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  const openPlanForm = useCallback(
    (plan: Plan | null) => {
      setEditingPlan(plan);
      setPlanFormOpen(true);
      onOpenChange(false);
    },
    [onOpenChange],
  );

  const filteredItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [
      {
        id: "create-plan",
        label: "新建计划",
        icon: <Plus className="h-4 w-4" />,
        group: "action",
        onSelect: () => {
          onOpenChange(false);
          onCreatePlan();
        },
        keywords: ["创建", "添加", "new", "create"],
      },
      ...NAV_ITEMS.map((item) => ({
        id: `nav-${item.to}`,
        label: item.label,
        icon: item.icon,
        group: "navigation" as const,
        onSelect: () => {
          onOpenChange(false);
          navigate(item.to);
        },
        keywords: [item.label],
      })),
    ];

    const trimmed = query.trim();
    if (!trimmed) return items;

    const lower = trimmed.toLowerCase();
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const workflowById = new Map(tagWorkflows.map((workflow) => [workflow.id, workflow]));
    const statusMatch = (plan: Plan) =>
      (lower.includes("完成") && plan.status === "completed") ||
      (lower.includes("取消") && plan.status === "cancelled") ||
      (lower.includes("逾期") && isOverdue(plan));

    const planItems: CommandItem[] = plans
      .filter((plan) => {
        const category = plan.category_id ? categoryById.get(plan.category_id)?.name : "";
        const workflow = plan.tag_workflow_id ? workflowById.get(plan.tag_workflow_id)?.name : "";
        return (
          [plan.title, plan.description, category, workflow].some((value) =>
            value?.toLowerCase().includes(lower),
          ) || statusMatch(plan)
        );
      })
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return b.updated_at.localeCompare(a.updated_at);
      })
      .map((plan) => ({
        id: `plan-${plan.id}`,
        label: plan.title,
        icon: <Search className="h-4 w-4" />,
        group: "plan" as const,
        plan,
        onSelect: () => openPlanForm(plan),
      }));

    const matchingFixedItems = items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.keywords?.some((keyword) => keyword.toLowerCase().includes(lower)),
    );
    if (planItems.length === 0 && matchingFixedItems.length === 0) {
      return [
        {
          id: "create-from-query",
          label: `以当前文本新建计划：${trimmed}`,
          icon: <Plus className="h-4 w-4" />,
          group: "action",
          onSelect: () => openPlanForm(null),
        },
      ];
    }
    return [...matchingFixedItems, ...planItems];
  }, [query, plans, categories, tagWorkflows, navigate, onOpenChange, onCreatePlan, openPlanForm]);

  const safeIndex = Math.max(0, Math.min(selectedIndex, Math.max(filteredItems.length - 1, 0)));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter": {
          e.preventDefault();
          const item = filteredItems[safeIndex];
          if (!item) break;
          if (e.ctrlKey && item.plan) {
            if (item.plan.status === "active" || item.plan.status === "completed") {
              const nextStatus: PlanStatus =
                item.plan.status === "completed" ? "active" : "completed";
              void editPlan({ id: item.plan.id, status: nextStatus });
            }
          } else {
            item.onSelect();
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredItems, safeIndex, onOpenChange, editPlan],
  );

  const navItems = filteredItems.filter((item) => item.group === "navigation");
  const actionItems = filteredItems.filter((item) => item.group === "action");
  const planItems = filteredItems.filter((item) => item.group === "plan");

  const renderItem = (item: CommandItem) => (
    <button
      key={item.id}
      role="option"
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors",
        safeIndex === filteredItems.indexOf(item)
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      onClick={() => item.onSelect()}
      onMouseEnter={() => setSelectedIndex(filteredItems.indexOf(item))}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-sm border bg-muted/50">
        {item.plan?.category_id &&
        categories.find((category) => category.id === item.plan?.category_id) ? (
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: categories.find((category) => category.id === item.plan?.category_id)
                ?.color,
            }}
          />
        ) : (
          item.icon
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate">{item.label}</span>
        {item.plan && (
          <span className="block truncate text-xs text-muted-foreground">
            {STATUS_LABELS[item.plan.status]} ·{" "}
            {item.plan.category_id
              ? (categories.find((category) => category.id === item.plan?.category_id)?.name ??
                "无分类")
              : "无分类"}
            {item.plan.ddl ? ` · 截止 ${formatDdl(item.plan.ddl)}` : ""}
          </span>
        )}
      </span>
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 gap-0" aria-describedby="command-palette-desc">
          <DialogHeader className="sr-only">
            <DialogTitle>命令面板</DialogTitle>
          </DialogHeader>
          <div id="command-palette-desc" className="sr-only">
            搜索命令、导航页面或执行操作
          </div>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              className="flex h-11 w-full border-0 bg-transparent px-0 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="搜索计划、页面或执行命令..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2" role="listbox">
            {filteredItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">无匹配结果</p>
            ) : (
              <>
                {actionItems.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      操作
                    </div>
                    {actionItems.map(renderItem)}
                  </div>
                )}
                {planItems.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      计划
                    </div>
                    {planItems.map(renderItem)}
                  </div>
                )}
                {navItems.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      导航
                    </div>
                    {navItems.map(renderItem)}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {planFormOpen && (
        <PlanFormDialog
          onOpenChange={(nextOpen) => {
            setPlanFormOpen(nextOpen);
            if (!nextOpen) setEditingPlan(null);
          }}
          plan={editingPlan}
          defaultTitle={query.trim() || undefined}
        />
      )}
    </>
  );
}
