import { useState, type FormEvent } from "react";
import { CalendarIcon, X } from "lucide-react";
import { toPlanFormValues, validatePlanForm, type PlanFormValues, type PeriodType } from "@/lib/planForm";
import { fromDateInputValue, toDateInputValue, formatDdl } from "@/lib/date";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Plan } from "@/types";

interface PlanFormDialogProps {
  onOpenChange: (open: boolean) => void;
  /** 传入计划表示编辑模式；null 表示新建 */
  plan: Plan | null;
}

const DEFAULT_VALUES: PlanFormValues = {
  title: "",
  description: "",
  categoryId: null,
  importance: 2,
  urgency: 2,
  ddl: null,
  periodType: null,
  periodValue: "",
};

export function PlanFormDialog({ onOpenChange, plan }: PlanFormDialogProps) {
  const categories = useAppStore((s) => s.categories);
  const addPlan = useAppStore((s) => s.addPlan);
  const editPlan = useAppStore((s) => s.editPlan);

  // 父组件仅在打开时挂载本对话框，状态直接从 plan 惰性初始化，天然实现表单重置
  const [values, setValues] = useState<PlanFormValues>(() =>
    plan ? toPlanFormValues(plan) : DEFAULT_VALUES,
  );
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = plan !== null;

  function set<K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validatePlanForm(values);
    setErrors(validation);
    if (validation.title) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description,
        category_id: values.categoryId,
        importance: values.importance,
        urgency: values.urgency,
        ddl: values.ddl,
        period_type: values.periodType ?? null,
        period_value: values.periodType ? values.periodValue || null : null,
      };
      if (isEdit && plan) {
        await editPlan({ id: plan.id, ...payload });
      } else {
        await addPlan(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(`保存失败: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑计划" : "新建计划"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改计划信息后保存。" : "填写计划信息，重要度与紧急度将决定其所在的象限。"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-title">标题</Label>
            <Input
              id="plan-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="计划标题"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">描述</Label>
            <Textarea
              id="plan-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="补充说明（可选）"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-category">分类</Label>
            <Select
              value={values.categoryId ?? "none"}
              onValueChange={(v) => set("categoryId", v === "none" ? null : v)}
            >
              <SelectTrigger id="plan-category" className="w-full" aria-label="分类">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                重要度
                <span className="ml-1 text-muted-foreground">{values.importance} 分</span>
              </Label>
              <Slider
                min={0}
                max={4}
                step={0.5}
                value={[values.importance]}
                onValueChange={([v]) => set("importance", v)}
                aria-label="重要度"
              />
            </div>
            <div className="space-y-2">
              <Label>
                紧急度
                <span className="ml-1 text-muted-foreground">{values.urgency} 分</span>
              </Label>
              <Slider
                min={0}
                max={4}
                step={0.5}
                value={[values.urgency]}
                onValueChange={([v]) => set("urgency", v)}
                aria-label="紧急度"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>DDL</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {values.ddl ? formatDdl(values.ddl) : "选择日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" data-testid="ddl-popover">
                <Calendar
                  mode="single"
                  selected={values.ddl ? fromDateInputValue(values.ddl) : undefined}
                  onSelect={(date) => set("ddl", date ? toDateInputValue(date) : null)}
                  autoFocus
                />
                {values.ddl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="mt-2 w-full"
                    onClick={() => set("ddl", null)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    清除日期
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-period-type">计划周期</Label>
            <Select
              value={values.periodType ?? "none"}
              onValueChange={(v) =>
                set("periodType", v === "none" ? null : (v as PeriodType))
              }
            >
              <SelectTrigger id="plan-period-type" className="w-full" aria-label="计划周期">
                <SelectValue placeholder="选择周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                <SelectItem value="daily">日度</SelectItem>
                <SelectItem value="monthly">月度</SelectItem>
                <SelectItem value="quarterly">季度</SelectItem>
                <SelectItem value="yearly">年度</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {values.periodType && (
            <div className="space-y-2">
              <Label htmlFor="plan-period-value">周期值</Label>
              <Input
                id="plan-period-value"
                value={values.periodValue}
                onChange={(e) => set("periodValue", e.target.value)}
                placeholder="如 2026-08、2026-Q3、2026"
              />
            </div>
          )}

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
