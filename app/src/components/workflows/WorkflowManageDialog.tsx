import { useState, type FormEvent } from "react";
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
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { TagWorkflow } from "@/types";

interface WorkflowManageDialogProps {
  onOpenChange: (open: boolean) => void;
}

export function WorkflowManageDialog({ onOpenChange }: WorkflowManageDialogProps) {
  const tagWorkflows = useAppStore((s) => s.tagWorkflows);
  const addTagWorkflow = useAppStore((s) => s.addTagWorkflow);
  const editTagWorkflow = useAppStore((s) => s.editTagWorkflow);
  const removeTagWorkflow = useAppStore((s) => s.removeTagWorkflow);

  // null = create mode; non-null = editing the workflow with that id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editingWorkflow = tagWorkflows.find((w) => w.id === editingId) ?? null;
  const isEdit = editingWorkflow !== null;

  function startCreate() {
    setEditingId(null);
    setName("");
    setSteps([""]);
    setError(null);
  }

  function startEdit(workflow: TagWorkflow) {
    setEditingId(workflow.id);
    setName(workflow.name);
    try {
      setSteps(JSON.parse(workflow.steps) as string[]);
    } catch {
      setSteps([""]);
    }
    setError(null);
  }

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index >= steps.length - 1) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("工作流名称不能为空");
      return;
    }

    const validSteps = steps.map((s) => s.trim() || `步骤 ${steps.indexOf(s) + 1}`);
    const stepsJson = JSON.stringify(validSteps);

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && editingWorkflow) {
        await editTagWorkflow({ id: editingWorkflow.id, name: trimmed, steps: stepsJson });
      } else {
        await addTagWorkflow({ name: trimmed, steps: stepsJson });
      }
      startCreate();
    } catch (err) {
      setError(`保存失败: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(workflow: TagWorkflow) {
    try {
      await removeTagWorkflow(workflow.id);
      if (editingId === workflow.id) startCreate();
    } catch {
      // deletion failure keeps current state
    }
  }

  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>工作流管理</DialogTitle>
          <DialogDescription>
            管理标签工作流模板：可自定义名称与步骤顺序。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {tagWorkflows.map((workflow) => {
              let stepCount = 0;
              try {
                stepCount = (JSON.parse(workflow.steps) as string[]).length;
              } catch {
                stepCount = 0;
              }
              return (
                <li
                  key={workflow.id}
                  data-testid={`workflow-row-${workflow.id}`}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                >
                  <span className="flex-1 truncate text-sm">{workflow.name}</span>
                  <span className="text-xs text-muted-foreground">{stepCount} 个步骤</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    aria-label={`编辑工作流 ${workflow.name}`}
                    onClick={() => startEdit(workflow)}
                  >
                    编辑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive"
                    aria-label={`删除工作流 ${workflow.name}`}
                    onClick={() => handleDelete(workflow)}
                  >
                    删除
                  </Button>
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="workflow-name">工作流名称</Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="工作流名称"
                aria-invalid={!!error}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>步骤列表</Label>
              <ul className="space-y-1">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <Input
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`步骤 ${index + 1}`}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-7 shrink-0"
                      aria-label="上移步骤"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-7 shrink-0"
                      aria-label="下移步骤"
                      disabled={index === steps.length - 1}
                      onClick={() => moveDown(index)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="移除步骤"
                      disabled={steps.length <= 1}
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                aria-label="添加步骤"
                onClick={addStep}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                添加步骤
              </Button>
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
