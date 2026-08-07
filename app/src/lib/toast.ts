import { toast as sonnerToast } from "sonner";

/** Unified toast helper — wraps sonner for consistent defaults */
export const toast = {
  success(message: string) {
    sonnerToast.success(message);
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
