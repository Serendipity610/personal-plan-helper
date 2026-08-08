import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Grid3X3,
  Columns3,
  Calendar,
  List,
  Plus,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: "navigation" | "action";
  onSelect: () => void;
  keywords?: string[];
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
  { to: "/list", label: "列表", icon: <List className="h-4 w-4" /> },
  { to: "/dashboard", label: "总览", icon: <LayoutDashboard className="h-4 w-4" /> },
];

export function CommandPalette({ open, onOpenChange, onCreatePlan }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [
      // Actions
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
      // Navigation
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

    if (!query.trim()) return items;

    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.keywords?.some((kw) => kw.toLowerCase().includes(lower)),
    );
  }, [query, navigate, onOpenChange, onCreatePlan]);

  // Clamp selected index
  const safeIndex = Math.max(0, Math.min(selectedIndex, filteredItems.length - 1));

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
        case "Enter":
          e.preventDefault();
          if (filteredItems.length > 0) {
            filteredItems[safeIndex]?.onSelect();
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredItems, safeIndex, onOpenChange],
  );

  const navItems = filteredItems.filter((i) => i.group === "navigation");
  const actionItems = filteredItems.filter((i) => i.group === "action");

  return (
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
            placeholder="搜索页面或执行命令..."
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
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">操作</div>
                  {actionItems.map((item) => (
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
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {navItems.length > 0 && (
                <div>
                  {actionItems.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">导航</div>
                  )}
                  {navItems.map((item) => (
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
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
