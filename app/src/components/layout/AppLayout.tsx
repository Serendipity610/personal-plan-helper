import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Grid3X3,
  Columns3,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/matrix", label: "四象限", icon: Grid3X3 },
  { to: "/kanban", label: "看板", icon: Columns3 },
  { to: "/calendar", label: "日历", icon: Calendar },
  { to: "/list", label: "列表", icon: List },
  { to: "/dashboard", label: "总览", icon: LayoutDashboard },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

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
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  collapsed && "justify-center px-2",
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">工作计划管理</h1>
          <div className="flex items-center gap-2">{/* Placeholder for future actions */}</div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
