import { useEffect, useMemo, useState, useCallback } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { FilterBar } from "@/components/layout/FilterBar";
import { CategoryManageDialog } from "@/components/categories/CategoryManageDialog";
import { WorkflowManageDialog } from "@/components/workflows/WorkflowManageDialog";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { PlanFormDialog } from "@/components/plans/PlanFormDialog";
import { useTheme } from "@/hooks/useTheme";
import type { Plan } from "@/types";
import {
  LayoutDashboard,
  Grid3X3,
  Columns3,
  Calendar,
  List,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/matrix", label: "四象限", icon: Grid3X3, shortcut: "1" },
  { to: "/kanban", label: "看板", icon: Columns3, shortcut: "2" },
  { to: "/calendar", label: "日历", icon: Calendar, shortcut: "3" },
  { to: "/list", label: "列表", icon: List, shortcut: "4" },
  { to: "/dashboard", label: "总览", icon: LayoutDashboard, shortcut: "5" },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [workflowManageOpen, setWorkflowManageOpen] = useState(false);

  // Shared global dialogs for keyboard shortcuts
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sharedPlanFormOpen, setSharedPlanFormOpen] = useState(false);
  const [sharedEditingPlan, setSharedEditingPlan] = useState<Plan | null>(null);

  const plans = useAppStore((s) => s.plans);
  const categories = useAppStore((s) => s.categories);
  const selectedCategoryId = useAppStore((s) => s.selectedCategoryId);
  const setSelectedCategoryId = useAppStore((s) => s.setSelectedCategoryId);
  const fetchPlans = useAppStore((s) => s.fetchPlans);
  const fetchCategories = useAppStore((s) => s.fetchCategories);
  const fetchTagWorkflows = useAppStore((s) => s.fetchTagWorkflows);

  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchCategories();
    fetchTagWorkflows();
  }, [fetchPlans, fetchCategories, fetchTagWorkflows]);

  // ── Global create-plan helper ──────────────────────────────
  const openCreateDialog = useCallback(() => {
    setSharedEditingPlan(null);
    setSharedPlanFormOpen(true);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+N — 快速创建计划 (global, works on all pages)
      if (ctrl && e.key === "n") {
        e.preventDefault();
        setSharedEditingPlan(null);
        setSharedPlanFormOpen((prev) => !prev);
        return;
      }

      // Ctrl+K — 命令面板
      if (ctrl && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+1~5 — 切换视图
      if (ctrl && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < navItems.length) {
          navigate(navItems[idx].to);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // ── Listen for custom events dispatched by other components ──
  useEffect(() => {
    function handleQuickCreate() {
      openCreateDialog();
    }
    function handleCommandPalette() {
      setCommandPaletteOpen(true);
    }
    window.addEventListener("quick-create-plan", handleQuickCreate);
    window.addEventListener("command-palette", handleCommandPalette);
    return () => {
      window.removeEventListener("quick-create-plan", handleQuickCreate);
      window.removeEventListener("command-palette", handleCommandPalette);
    };
  }, [openCreateDialog]);

  // 侧栏徽标：统计各分类下活跃计划数（不受当前筛选影响，保持稳定）
  const activeCountByCategory = useMemo(() => {
    const counts = new Map<string | null, number>();
    for (const plan of plans) {
      if (plan.status !== "active") continue;
      counts.set(plan.category_id, (counts.get(plan.category_id) ?? 0) + 1);
    }
    return counts;
  }, [plans]);

  const totalActive = useMemo(() => plans.filter((p) => p.status === "active").length, [plans]);

  function toggleCategory(id: string | null) {
    setSelectedCategoryId(selectedCategoryId === id ? null : id);
  }

  const sidebarItem =
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-muted/40 transition-all duration-300",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Logo / Title */}
        <div className="flex h-14 items-center justify-between border-b px-3">
          {!collapsed && (
            <span className="text-sm font-semibold truncate">Personal Plan Helper</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0", collapsed && "mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  sidebarItem,
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  collapsed && "justify-center px-2",
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && (
                <kbd className="ml-auto hidden text-[0.6rem] text-muted-foreground/60 lg:inline">
                  Ctrl+{item.shortcut}
                </kbd>
              )}
            </NavLink>
          ))}

          {/* Category filter section */}
          {!collapsed && (
            <div className="px-3 pb-1 pt-3 text-xs font-medium text-muted-foreground">分类</div>
          )}
          <button
            type="button"
            data-testid="sidebar-category-all"
            onClick={() => toggleCategory(null)}
            className={cn(
              sidebarItem,
              "w-full text-muted-foreground",
              selectedCategoryId === null && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">全部</span>
                <span className="text-xs tabular-nums">{totalActive}</span>
              </>
            )}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              data-testid={`sidebar-category-${category.id}`}
              onClick={() => toggleCategory(category.id)}
              className={cn(
                sidebarItem,
                "w-full text-muted-foreground",
                selectedCategoryId === category.id && "bg-accent text-accent-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{category.name}</span>
                  <span className="text-xs tabular-nums">
                    {activeCountByCategory.get(category.id) ?? 0}
                  </span>
                </>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar with global filters */}
        <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
          <h1 className="text-lg font-semibold whitespace-nowrap">工作计划管理</h1>
          <div className="flex items-center gap-2">
            <FilterBar
              onManageClick={() => setManageOpen(true)}
              onWorkflowManageClick={() => setWorkflowManageOpen(true)}
            />
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        {/* Page content with transition animation */}
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
          },
        }}
      />

      {manageOpen && <CategoryManageDialog onOpenChange={setManageOpen} />}
      {workflowManageOpen && <WorkflowManageDialog onOpenChange={setWorkflowManageOpen} />}

      {/* Global command palette (Ctrl+K) — key forces remount on open to reset state */}
      <CommandPalette
        key={String(commandPaletteOpen)}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onCreatePlan={openCreateDialog}
      />

      {/* Global quick-create dialog (Ctrl+N) — works on all pages */}
      {sharedPlanFormOpen && (
        <PlanFormDialog onOpenChange={setSharedPlanFormOpen} plan={sharedEditingPlan} />
      )}
    </div>
  );
}
