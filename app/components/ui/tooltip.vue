<!-- app/components/ui/tooltip.vue -->
<script setup lang="ts">
import type { CSSProperties } from "vue";
import type { TooltipTrigger } from "~/utils/tooltip";
import { bodyDialect } from "~/utils/motion/surface";
import { anchorPositioningSupported, TOOLTIP_DELAY_MS, tooltipPlacement } from "~/utils/tooltip";

// The handoff's tooltip (#311, 03-components.md `tooltip`, R10): a cocoa bubble over its trigger that a resting mouse or
// the keyboard's focus brings up. It has no wrapper: the default slot hands the caller a `trigger` to `v-bind` onto the
// one element, so a screen's layout classes never meet a new box. The bubble is a sibling of the trigger, never teleported
// (a teleported one would sit in the `inert` page behind a modal).
const props = defineProps<{
  /** What the bubble says; for an icon button, its label. */
  text: string;
}>();

/** Where the popover goes when CSS does not place it: `position: fixed` offsets from the viewport's top left. */
interface Corner {
  /** Pixels from the viewport's left edge. */
  left: number;
  /** Pixels from the viewport's top edge. */
  top: number;
}

const m = useWinniesMotion();
const id = useId();
const anchorName = `--tip-${id}`;

const popover = useTemplateRef<HTMLElement>("popover");
const bubble = useTemplateRef<HTMLElement>("bubble");

// `anchored` where CSS places the bubble, `fixed` where `tooltipPlacement` does. Read when the bubble shows, so a story can
// stub the support check before the component mounts and a browser's answer is never frozen at import.
const placement = ref<"anchored" | "fixed">();
const fixed = ref<Corner>();

let timer: ReturnType<typeof setTimeout> | undefined;
let animation: Animation | null = null;

const isOpen = () => !!popover.value?.matches(":popover-open");

/** Measures the bubble and puts the popover beside the trigger, for a browser that cannot do it with anchors. */
function place() {
  const trigger = document.querySelector<HTMLElement>(`[aria-describedby="${id}"]`);
  const el = popover.value;
  if (!trigger || !el)
    return;
  // P is B's size and carries no scale: R10's pop-in on the first frame must not shrink the measure, and `offsetWidth`
  // would round a bubble of 114.4px to 114 and let it sit 0.4px past the margin.
  const { width, height } = el.getBoundingClientRect();
  const { left, top } = tooltipPlacement(
    trigger.getBoundingClientRect(),
    { width, height },
    { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
  );
  fixed.value = { left, top };
}

/** Shows the bubble and plays R10. Nothing under Broadcast: the Overlay has no tooltip. */
function show() {
  const el = popover.value;
  if (!el || !bubble.value || isOpen() || bodyDialect() === "broadcast")
    return;
  placement.value = anchorPositioningSupported()
    ? "anchored"
    : "fixed";
  el.showPopover();
  if (placement.value === "fixed")
    place();
  // Only while shown, and not one listener per button: the Workspace has about 150.
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  // `tipIn` returns null under reduced motion, and the component then starts nothing of its own.
  animation = m.tipIn(bubble.value);
}

/** Hides the bubble and everything that waits for it. Safe to call when it is hidden. */
function hide() {
  clearTimeout(timer);
  timer = undefined;
  animation?.cancel();
  animation = null;
  document.removeEventListener("keydown", onKeydown, true);
  window.removeEventListener("scroll", hide, true);
  window.removeEventListener("resize", hide);
  if (isOpen())
    popover.value?.hidePopover();
}

/**
 * Esc takes the tooltip first. The capture listener on `document` runs before a modal's window listener, which skips a
 * prevented key, so the first Esc closes the bubble only and the second closes the modal. The trigger keeps its focus,
 * and the bubble stays hidden: only a new focus or a new pointer entry starts one.
 * @param event the key press
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape")
    return;
  event.preventDefault();
  event.stopPropagation();
  hide();
}

/**
 * Touch never hovers, so only a mouse or a pen starts the pause. A press hides the bubble and nothing restarts the timer
 * until the pointer has left and entered again: a menu or a modal is opening, and the bubble would sit on it.
 * @param event the pointer's entry
 */
function onPointerenter(event: PointerEvent) {
  if (event.pointerType !== "mouse" && event.pointerType !== "pen")
    return;
  clearTimeout(timer);
  timer = setTimeout(show, TOOLTIP_DELAY_MS);
}

/**
 * A mouse click's focus is not `:focus-visible`, so a click never shows the bubble; the keyboard's focus does, at once.
 * @param event the focus event, whose `currentTarget` is the trigger
 */
function onFocus(event: FocusEvent) {
  if ((event.currentTarget as HTMLElement | null)?.matches(":focus-visible"))
    show();
}

const trigger: TooltipTrigger = {
  "aria-describedby": id,
  "style": { "anchor-name": anchorName },
  "onPointerenter": onPointerenter,
  "onPointerleave": hide,
  "onPointerdown": hide,
  "onFocus": onFocus,
  "onBlur": hide,
};

// A label that changes while the bubble is up (Start timer, Pause timer) changes its size: the fixed path measures again.
watch(() => props.text, async () => {
  await nextTick();
  if (isOpen() && placement.value === "fixed")
    place();
});

onBeforeUnmount(hide);

/**
 * The popover's own style. P is B's exact size (no padding, B is its only child): `position-area` places it above the
 * trigger, `flip-block` moves it below where there is no room, and the margin is the 10px gap, which flips with it.
 */
const style = computed((): CSSProperties => fixed.value && placement.value === "fixed"
  ? {
      position: "fixed",
      left: `${fixed.value.left}px`,
      top: `${fixed.value.top}px`,
      zIndex: "var(--z-tooltip)",
    }
  : {
      positionAnchor: anchorName,
      positionArea: "top",
      positionTryFallbacks: "flip-block",
      marginBlock: "var(--space-2-5)",
      // Insets resolve against the area `position-area` picked, which spans the viewport: the 8px margin of the handoff.
      insetInline: "var(--space-2)",
      zIndex: "var(--z-tooltip)",
    });
</script>

<template>
  <slot :trigger="trigger" />

  <!--
    P, the popover: positioned, never drawn. The UA's popover box is reset (`inset`, `margin`, `padding`, `border`,
    `background`, `overflow`: `position-area` needs `inset: auto`, and `overflow: auto` would clip the pop-in). No
    `display` on it: an author `display` would override the UA's `:not(:popover-open)` rule and the bubble would always
    show. `translate: 50% 100%` cancels B's rest position, `m.tipIn`'s last keyframe (an engine recipe built for a bubble
    placed by its bottom centre), so B rests exactly where P was placed. It takes no pointer: a click goes through it.
  -->
  <div
    :id="id"
    ref="popover"
    popover="manual"
    role="tooltip"
    data-tooltip
    :data-placement="placement"
    class="pointer-events-none [inset:auto] m-0 w-max max-w-[440px] [translate:50%_100%] overflow-visible border-0 bg-transparent p-0"
    :style="style"
  >
    <!-- B, the bubble: looks and animates. The radius is the prototype's 12px, which no token is. -->
    <span
      ref="bubble"
      data-bubble
      class="block w-max max-w-full [transform:translate(-50%,-100%)] rounded-[12px] bg-(--tooltip-bg) px-3 py-1.5 text-center font-body text-xs leading-[1.4] [font-weight:var(--font-weight-strong)] [text-wrap:pretty] text-(--tooltip-text)"
    >
      {{ text }}
    </span>
  </div>
</template>
