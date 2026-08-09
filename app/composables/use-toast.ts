/**
 * Notification that displays a short **message** about any **kind** (error/success/info)
 * of stuff that the user might otherwise miss
 */
export interface Toast {
  id: string;
  message: string;
  kind: "error" | "success" | "info";
}
const toasts = ref<Toast[]>([]);

/**
 * Composable function to build a toast "service" that feeds the toast ref with toasts that are either dismissed by themselves
 * (according to their time to live) or dismissed by the user by interacting with dismiss
 *
 * @returns The Toast composable plus the ref holding all toasts, the possibility to dismiss specific toasts
 * and methods to create new toasts of all kinds
 */
export function useToast() {
  function pushNewToast(message: string, kind: Toast["kind"], ttl: number | null) {
    const last = toasts.value.at(-1);
    if (last?.message === message && last.kind === kind)
      return;

    const id = crypto.randomUUID();
    toasts.value.push({ id, message, kind });
    if (ttl)
      setTimeout(dismiss, ttl, id);
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts: readonly(toasts),
    dismiss,
    error: (message: string) => pushNewToast(message, "error", null),
    success: (message: string) => pushNewToast(message, "success", 4000),
    info: (message: string) => pushNewToast(message, "info", 5000),
  };
}
