import type { ToastKind } from "~/utils/toast-timer";

/**
 * Notification that displays a short **message** about any **kind** (error/success/info)
 * of stuff that the user might otherwise miss
 */
export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  /**
   * For stories and tests: the milliseconds before `UiToast` dismisses it, `null` for never. `useToast` never sets it, so the
   * time of its kind (`TOAST_TTL`) applies.
   */
  ttl?: number | null;
}
const toasts = ref<Toast[]>([]);

/**
 * Composable function to build a toast "service" that feeds the toast ref with toasts. The toasts are dismissed by
 * `UiToast` itself, after the time of their kind (`TOAST_TTL`), or by the user by interacting with dismiss
 *
 * @returns The Toast composable plus the ref holding all toasts, the possibility to dismiss specific toasts
 * and methods to create new toasts of all kinds
 */
export function useToast() {
  function pushNewToast(message: string, kind: Toast["kind"]) {
    const last = toasts.value.at(-1);
    if (last?.message === message && last.kind === kind)
      return;

    toasts.value.push({
      id: crypto.randomUUID(),
      message,
      kind,
    });
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts: readonly(toasts),
    dismiss,
    error: (message: string) => pushNewToast(message, "error"),
    success: (message: string) => pushNewToast(message, "success"),
    info: (message: string) => pushNewToast(message, "info"),
  };
}
