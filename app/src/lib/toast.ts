import { toast as sonnerToast } from "sonner";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

/** Unified toast helper — wraps sonner for consistent defaults */
export const toast = {
  success(message: string, options?: ToastOptions) {
    sonnerToast.success(message, options);
  },
  error(message: string) {
    sonnerToast.error(message, {
      duration: 5000,
    });
  },
  info(message: string) {
    sonnerToast(message);
  },
};

/**
 * Unified error-toast helper for background data-load failures.
 * Produces a single, consistently-formatted error toast from any catch block.
 * Use from store fetch methods and page-level data loaders.
 */
export function toastApiError(action: string, error: unknown): void {
  toast.error(`${action}失败: ${String(error)}`);
}
