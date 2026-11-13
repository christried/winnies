<!-- app/components/ui/toast.vue -->
<script setup lang="ts">
import type { MaterialIconName } from "~/utils/material-icons";
import type { ToastKind, ToastTimer } from "~/utils/toast-timer";
import { createToastTimer, TOAST_TTL } from "~/utils/toast-timer";

// The handoff's toast card (#315; 03-components.md, `toast`, and the prototype's card where the reference CSS differs). It is a
// plain card that animates nothing: `UiToastStack` plays R08 and R09, because only the stack knows when a toast arrives or
// leaves. It owns the one thing the stack cannot, the countdown, so hover and focus can pause it.
const props = defineProps<{
  /** The variant: the icon, the live-region role and how long it stays. */
  kind: ToastKind;
  /** Milliseconds before it asks to be dismissed. Left out, the time of its `kind` (`TOAST_TTL`); `null` stays until dismissed. Read once, at mount. */
  ttl?: number | null;
}>();

const emit = defineEmits<{
  /** The dismiss button was pressed or the time ran out, at most once per toast. It only asks: the parent removes the toast. */
  dismiss: [];
}>();

// The kind reads by icon shape and colour, never by colour alone.
interface Disc {
  /** The glyph in the disc. */
  icon: MaterialIconName;
  /** The disc's colours. */
  classes: string;
}
const DISCS: Record<ToastKind, Disc> = {
  success: { icon: "check", classes: "bg-won text-on-accent" },
  info: { icon: "info", classes: "bg-ready text-on-accent" },
  error: { icon: "error", classes: "bg-danger-surface text-danger-text" },
};
const disc = computed(() => DISCS[props.kind]);

// The Cherry ring is a second shadow beside the popover's: one declaration, so it is an inline style.
const RING = "box-shadow: var(--shadow-popover), 0 0 0 var(--border-ring) var(--color-danger)";

const root = useTemplateRef<HTMLElement>("root");

let timer: ToastTimer | undefined;
let dismissed = false;
let hovered = false;
let focused = false;

/** Asks the parent to remove the toast: from the button or from the countdown, once. */
function dismiss() {
  if (dismissed)
    return;
  dismissed = true;
  timer?.stop();
  emit("dismiss");
}

// The timer is time, not motion: it runs under reduced motion too. Browser only, so the server renders no timer.
onMounted(() => {
  const ms = props.ttl === undefined
    ? TOAST_TTL[props.kind]
    : props.ttl;
  if (ms !== null)
    timer = createToastTimer(ms, dismiss);
});
onBeforeUnmount(() => timer?.stop());

/** Holds the countdown while the pointer or the focus is on the toast, and lets it run when neither is. */
function syncTimer() {
  if (hovered || focused)
    timer?.pause();
  else
    timer?.resume();
}

/**
 * Notes where the pointer is.
 * @param over true when it entered the toast, false when it left
 */
function onPointer(over: boolean) {
  hovered = over;
  syncTimer();
}

/** Notes that the focus is on the toast. */
function onFocusIn() {
  focused = true;
  syncTimer();
}

/**
 * Notes that the focus left the toast, unless it only moved to another of the toast's own controls: then it stays held.
 * @param event the focusout event
 */
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && root.value?.contains(event.relatedTarget))
    return;
  focused = false;
  syncTimer();
}
</script>

<template>
  <div
    ref="root"
    :role="kind === 'error' ? 'alert' : 'status'"
    :data-kind="kind"
    class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-surface-raised py-2.5 ps-3 pe-2 text-sm leading-[1.4] font-strong text-text"
    :class="kind !== 'error' && 'shadow-popover'"
    :style="kind === 'error' ? RING : undefined"
    @pointerenter="onPointer(true)"
    @pointerleave="onPointer(false)"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <span
      class="flex size-9 items-center justify-center rounded-round"
      :class="disc.classes"
    >
      <UiIcon
        :name="disc.icon"
        size="md"
        fill
        :weight="600"
      />
    </span>
    <div class="min-w-0 [text-wrap:pretty] [overflow-wrap:anywhere]">
      <slot />
    </div>
    <UiIconButton
      icon="close"
      label="Dismiss"
      variant="ghost"
      size="sm"
      @click="dismiss"
    />
  </div>
</template>
