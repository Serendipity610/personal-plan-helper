import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PlanInlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PlanInlineEdit({
  value,
  onSave,
  onEditStart,
  onEditEnd,
  disabled = false,
  className,
}: PlanInlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const firstRender = useRef(true);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Return focus to display element after exiting edit mode.
  // Skip the first render — on mount, editing is already false and we
  // must not steal focus from wherever the user (or browser) left it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!editing && displayRef.current) {
      displayRef.current.focus();
    }
  }, [editing]);

  const enterEdit = useCallback(() => {
    if (disabled || editing || saving) return;
    setDraft(value);
    setError(null);
    setEditing(true);
    onEditStart?.();
  }, [disabled, editing, saving, value, onEditStart]);

  const exitEdit = useCallback(() => {
    setEditing(false);
    setSaving(false);
    setError(null);
    onEditEnd?.();
  }, [onEditEnd]);

  const cancel = useCallback(() => {
    setDraft(value);
    exitEdit();
  }, [value, exitEdit]);

  const doSave = useCallback(async () => {
    // Guard against re-entrancy: when saving=true the input is disabled,
    // which triggers blur in real browsers — handleBlur would call doSave
    // again without this check.
    if (saving) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      setError("标题不能为空");
      return;
    }

    // No change — just exit
    if (trimmed === value) {
      exitEdit();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      exitEdit();
    } catch (e) {
      setError(`保存失败: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }, [saving, draft, value, onSave, exitEdit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [doSave, cancel],
  );

  const handleBlur = useCallback(() => {
    doSave();
  }, [doSave]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      if (error) setError(null);
    },
    [error],
  );

  if (!editing) {
    return (
      <span
        ref={displayRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "block max-w-64 truncate cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-default hover:bg-transparent",
          className,
        )}
        onClick={enterEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            enterEdit();
          }
        }}
        aria-label={`编辑 "${value}"`}
      >
        {value}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <input
        ref={inputRef}
        type="text"
        className={cn(
          "w-full rounded border bg-background px-1.5 py-0.5 text-sm font-medium",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-destructive" : "border-input",
        )}
        value={draft}
        onChange={handleDraftChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={saving}
        aria-label="编辑标题"
        aria-invalid={!!error}
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
