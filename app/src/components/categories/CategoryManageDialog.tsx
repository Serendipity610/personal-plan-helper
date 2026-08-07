import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category } from "@/types";

const CATEGORY_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#64748B",
];

interface CategoryManageDialogProps {
  onOpenChange: (open: boolean) => void;
}

export function CategoryManageDialog({ onOpenChange }: CategoryManageDialogProps) {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const editCategory = useAppStore((s) => s.editCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);

  // null 表示新增模式；非 null 为正在编辑的分类 id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editingCategory = categories.find((c) => c.id === editingId) ?? null;
  const isEdit = editingCategory !== null;

  function startCreate() {
    setEditingId(null);
    setName("");
    setColor(CATEGORY_COLORS[0]);
    setError(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("分类名称不能为空");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && editingCategory) {
        await editCategory({ id: editingCategory.id, name: trimmed, color });
      } else {
        await addCategory({ name: trimmed, color, sort_order: categories.length });
      }
      startCreate();
    } catch (err) {
      setError(`保存失败: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    try {
      await removeCategory(category.id);
      if (editingId === category.id) startCreate();
    } catch {
      // 删除失败由 store 保持原状态
    }
  }

  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>分类管理</DialogTitle>
          <DialogDescription>
            管理计划分类：可自定义名称与颜色；默认分类不可删除。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {categories.map((category) => (
              <li
                key={category.id}
                data-testid={`category-row-${category.id}`}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 truncate text-sm">{category.name}</span>
                {category.is_default && <Badge variant="secondary">默认</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  aria-label={`编辑分类 ${category.name}`}
                  onClick={() => startEdit(category)}
                >
                  编辑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-destructive"
                  aria-label={`删除分类 ${category.name}`}
                  disabled={category.is_default}
                  onClick={() => handleDelete(category)}
                >
                  删除
                </Button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">分类名称</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="分类名称"
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`颜色 ${hex}`}
                  onClick={() => setColor(hex)}
                  className={cn(
                    "h-6 w-6 rounded-full ring-offset-2 transition-transform",
                    color === hex && "scale-110 ring-2 ring-ring",
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                关闭
              </Button>
              <Button type="submit" disabled={submitting}>
                {isEdit ? "保存" : "新增"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
