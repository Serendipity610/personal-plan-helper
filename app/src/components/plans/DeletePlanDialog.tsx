import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Plan } from "@/types";

interface DeletePlanDialogProps {
  plan: Plan | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (plan: Plan) => void;
}

export function DeletePlanDialog({ plan, onOpenChange, onConfirm }: DeletePlanDialogProps) {
  return (
    <AlertDialog open={plan !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>删除计划</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除计划「{plan?.title}」吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-cancel">取消</AlertDialogCancel>
          <AlertDialogAction
            data-testid="delete-confirm"
            className="bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
            onClick={() => plan && onConfirm(plan)}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
