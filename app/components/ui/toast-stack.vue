<!-- app/components/ui/toast-stack.vue -->
<script setup lang="ts">
import type { Toast } from "~/composables/use-toast";

// The bottom-right stack of toasts (#315; 03-components.md, `toast-stack`). It plays R08 on a toast it adds, and R09 plus the
// engine's FLIP on the rest when one leaves. The parent owns the list and removes a toast when it is asked to: the stack
// never changes its prop.
const props = defineProps<{
  /** The toasts, oldest first: the newest is last, so lowest. */
  toasts: readonly Toast[];
}>();

const emit = defineEmits<{
  /** A toast asked to go, by the button or by its time. The parent removes it from `toasts`. */
  dismiss: [id: string];
}>();

const m = useWinniesMotion();
const root = useTemplateRef<HTMLElement>("root");

// Why a mirror: a toast the parent removes is gone from the DOM at once, and R09 would play on nothing. The stack renders
// `shown`, which keeps a leaving toast until its leave has ended. A toast already there at mount does not animate in.
const shown = ref<Toast[]>([...props.toasts]);
const leaving = new Set<string>();

/**
 * The toasts that stay, as the engine's FLIP wants them. A leaving toast is left out: the engine's transform on its own
 * element would fight the leave.
 * @returns the pairs of id and element, in document order
 */
function rows(): [string, HTMLElement][] {
  return [
    ...(root.value?.querySelectorAll<HTMLElement>("[data-toast-id]") ?? []),
  ]
    .map(el => [el.dataset.toastId!, el] as [string, HTMLElement])
    .filter(([id]) => !leaving.has(id));
}

const el = (id: string) => root.value?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`) ?? null;

// A slide of an earlier FLIP still running would add its offset to the next one's measure: the next FLIP reads the layout
// position, so the old slide is ended first. Only the slide: the enter's own animations stay.
const SLIDE = /^translateY\(-?[\d.]+px\)$/;
/**
 * Ends the slides of an earlier FLIP that still run on a toast.
 * @param target the toast's element
 */
function endSlides(target: HTMLElement) {
  for (const a of target.getAnimations()) {
    const [first] = (a.effect as KeyframeEffect).getKeyframes();
    if (typeof first?.transform === "string" && SLIDE.test(first.transform))
      a.cancel();
  }
}

/**
 * Shows a toast the parent added and plays R08 on it, with the shake of R33 when it is an error.
 * @param toast the new toast
 */
async function enter(toast: Toast) {
  shown.value.push(toast);
  await nextTick();
  m.toastIn(el(toast.id), toast.kind === "error");
}

/**
 * Plays R09 on a toast the parent removed, takes it out of the DOM, and slides the others into the space it leaves.
 * @param id the toast's id
 */
async function retire(id: string) {
  leaving.add(id);
  await m.toastOut(el(id));
  // The leaver is still in the DOM, so this is the layout the eye saw.
  const prev = m.capture(rows());
  shown.value = shown.value.filter(t => t.id !== id);
  leaving.delete(id);
  await nextTick();
  rows().forEach(([, row]) => endSlides(row));
  m.flip(prev, rows(), 1);
}

watch(() => props.toasts.map(t => t.id), (ids) => {
  const wanted = new Set(ids);
  for (const toast of props.toasts) {
    if (!shown.value.some(s => s.id === toast.id))
      void enter(toast);
  }
  for (const { id } of shown.value) {
    if (!wanted.has(id) && !leaving.has(id))
      void retire(id);
  }
}, { flush: "post" });
</script>

<template>
  <div
    ref="root"
    data-toast-stack
    class="pointer-events-none fixed end-4 bottom-4 z-(--z-toast) flex w-[min(var(--toast-w),calc(100vw-2rem))] flex-col items-end gap-2.5"
  >
    <UiToast
      v-for="t in shown"
      :key="t.id"
      :data-toast-id="t.id"
      :kind="t.kind"
      :ttl="t.ttl"
      class="pointer-events-auto"
      @dismiss="emit('dismiss', t.id)"
    >
      {{ t.message }}
    </UiToast>
  </div>
</template>
