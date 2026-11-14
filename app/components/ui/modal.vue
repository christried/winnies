<script lang="ts" setup>
import { nextFocusIndex } from "~/utils/focus-trap";

const props = defineProps<{
  /** Heading text */
  title: string;
  /** Text on the confirm button, e.g. "Create". Cancel is always present. */
  actionLabel: string;
  /**
   * The action is running. The action button is busy (it ignores presses and shows `busyLabel`), Cancel and the close
   * button are disabled, and Esc and a click on the scrim do nothing. The caller locks its own field (`readonly`): the
   * modal does not know its slot. The exposed `close()` still closes it, because the callers close from inside their request.
   */
  pending?: boolean;
  /** Shown on the action button while `pending`, e.g. "Creating…". */
  busyLabel: string;
  /** When action is destructive, render button in other colour than primary */
  destructive?: boolean;
}>();

const emit = defineEmits<{
  /**
   * Confirm button pressed. Does NOT close the modal — that is the parent's job once
   * the mutation resolves. open and close are passed to parent using defineExpose below
   */
  action: [];
}>();

const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const card = useTemplateRef<HTMLElement>("card");
const titleId = useId();

// The content is mounted only while `shown`. The <dialog> itself stays open until R07 has played: a native `close()`
// takes it out of the top layer at once, and the leave would play on nothing. So `close()` flips the flag, the
// Transition plays the leave, and `finish` closes the dialog after it.
const shown = ref(false);

// The scrim and the card are both inside the Transition's element: the helper waits for every animation the recipe
// creates in that subtree. Under reduced motion the engine creates none and both hooks end at once.
/**
 * The two elements R06 and R07 animate.
 * @param el the Transition's element
 * @returns the scrim and the card
 */
function parts(el: HTMLElement) {
  return [
    el.querySelector<HTMLElement>("[data-scrim]")!,
    el.querySelector<HTMLElement>("[data-card]")!,
  ] as const;
}
const hooks = useMotionTransition({
  enter: (m, el) => m.modalIn(...parts(el)),
  leave: (m, el) => m.modalOut(...parts(el)),
});

const TABBABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), "
  + "textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";

/**
 * The card's stops in document order. The close button is last in the DOM, so it is last here too.
 * @returns the tabbable elements that are rendered
 */
function tabbables(): HTMLElement[] {
  return [
    ...card.value?.querySelectorAll<HTMLElement>(TABBABLE) ?? [],
  ]
    .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
}

/** Where the focus lands when the modal opens: the field that asks for it, else the safe action, else the first stop. */
function focusInitial() {
  const root = card.value;
  if (!root)
    return;
  const target = root.querySelector<HTMLElement>("[autofocus]")
    ?? (props.destructive
      ? root.querySelector<HTMLElement>("[data-modal-cancel]")
      : null)
    ?? tabbables()[0];
  target?.focus();
}

/**
 * Esc and Tab, for as long as the modal is open. Esc is ours because the browser's close watcher lets a second Esc close
 * a dialog whose page refused the first (Esc is no user activation), so a busy modal would close on the second press.
 * A prevented keydown stops the native close altogether. Tab is ours because a native modal's Tab can leave for the
 * browser's own UI. The listener is on the window and not on the dialog: after a busy request the focus can be on
 * `<body>`, where a dialog listener never sees the key.
 * @param event the key press
 */
function onKeydown(event: KeyboardEvent) {
  // An inner handler that took the key wins.
  if (event.defaultPrevented)
    return;
  if (event.key === "Escape") {
    event.preventDefault();
    requestClose();
    return;
  }
  if (event.key !== "Tab")
    return;
  event.preventDefault();
  const stops = tabbables();
  stops[nextFocusIndex(stops.length, stops.indexOf(document.activeElement as HTMLElement), event.shiftKey)]?.focus();
}

/** Every way of closing a person has: Esc, the scrim, Cancel and the close button. None works while busy. */
function requestClose() {
  if (props.pending)
    return;
  close();
}

/** Programmatic, so it never looks at `pending`: the callers close the modal from inside their request. */
function close() {
  if (!shown.value)
    return;
  shown.value = false;
}

/** Opens the dialog, then mounts the content and moves the focus into it. */
async function open() {
  const el = dialog.value;
  if (!el || shown.value)
    return;
  // `showModal` first and the content after: R06 starts when the frame is inserted, and an animation on a
  // `display: none` subtree is not reliably listed. So the dialog's own focusing steps find nothing, and `focusInitial` does it.
  if (!el.open)
    el.showModal();
  shown.value = true;
  window.addEventListener("keydown", onKeydown);
  await nextTick();
  focusInitial();
}

/** After the leave: the native close restores the focus to what held it when `showModal` ran, the trigger. */
function finish() {
  // Opened again during the leave: the dialog stays.
  if (shown.value)
    return;
  window.removeEventListener("keydown", onKeydown);
  dialog.value?.close();
}

/** The dialog closed some way we did not start. Idempotent after `finish`. */
function onNativeClose() {
  // `finish` closed it and it was opened again before this event ran.
  if (dialog.value?.open)
    return;
  shown.value = false;
  window.removeEventListener("keydown", onKeydown);
}

onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

defineExpose({ open, close });
</script>

<template>
  <!-- No `display` on the dialog: it would override the UA's `dialog:not([open]) { display: none }`. The grid is the frame's. -->
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-0 h-full max-h-none w-full max-w-none overflow-auto border-0 bg-transparent p-0 text-text backdrop:bg-transparent"
    @cancel.prevent="requestClose"
    @close="onNativeClose"
  >
    <Transition
      :css="false"
      v-bind="hooks"
      @after-leave="finish"
    >
      <div v-if="shown" class="relative grid min-h-full place-items-center p-4">
        <div
          data-scrim
          aria-hidden="true"
          class="absolute inset-0 bg-(--color-scrim)"
          @mousedown.prevent
          @click="requestClose"
        />
        <!-- The prototype's card: 520px, radius 40, 26px 28px 28px. Header and close button share the first row. The close
             button is last in the DOM, so last in the tab order (07-accessibility.md), and the grid puts it top right. -->
        <div
          ref="card"
          data-card
          :aria-busy="pending || undefined"
          class="relative grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-4 rounded-[40px] bg-surface px-7 pt-6.5 pb-7 shadow-raised-lg"
        >
          <h2
            :id="titleId"
            class="col-start-1 row-start-1 m-0 min-w-0 [font-family:var(--font-display)] text-[25px] leading-[1.4] [font-weight:var(--font-weight-display)] [text-wrap:pretty] [overflow-wrap:anywhere]"
          >
            {{ title }}
          </h2>
          <div class="col-span-2 row-start-2 flex min-w-0 flex-col gap-2 text-md leading-body [text-wrap:pretty] text-text-muted">
            <slot />
          </div>
          <div class="col-span-2 row-start-3 flex justify-end gap-2.5">
            <UiButton
              data-modal-cancel
              variant="ghost"
              type="button"
              :disabled="pending"
              @click="requestClose"
            >
              Cancel
            </UiButton>
            <UiButton
              :variant="destructive ? 'danger' : 'primary'"
              :busy="pending"
              :busy-label="busyLabel"
              @click="emit('action')"
            >
              {{ actionLabel }}
            </UiButton>
          </div>
          <UiIconButton
            class="col-start-2 row-start-1 self-start"
            icon="close"
            label="Close"
            variant="ghost"
            size="sm"
            :disabled="pending"
            @click="requestClose"
          />
        </div>
      </div>
    </Transition>
  </dialog>
</template>
