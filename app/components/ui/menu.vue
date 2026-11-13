<!-- app/components/ui/menu.vue -->
<script setup lang="ts">
import { fallbackPlacement, initialIndex, isTypeAheadKey, moveIndex, typeAheadIndex } from "~/utils/menu-nav";

// The handoff's raised popover (#313, 03-components.md `menu`): a `role="menu"` of `UiMenuItem`s that opens from its
// trigger with R04, closes with R05, moves the focus by the keys of 07-accessibility.md (arrows, Home and End, a letter,
// Esc) and gives it back to the trigger. The caller draws the trigger and binds `trigger` onto it.
const props = withDefaults(defineProps<{
  /** Which edge of the trigger the menu lines up with: `start` is the left edge (the Winnie picker), `end` the right edge. */
  align?: "start" | "end";
  /** 340px wide instead of 260px (the picker, as the prototype has it). */
  wide?: boolean;
  /** A first line that is text, not an item: every key skips it. */
  heading?: string;
  /** `false` forces the placement fallback; absent means the browser's support for anchor positioning decides. */
  anchored?: boolean;
}>(), {
  align: "end",
  wide: false,
  heading: undefined,
  anchored: undefined,
});

/** The fixed offsets of a menu placed without anchor positioning. */
interface Placement {
  /** Pixels from the viewport's top edge. */
  top: number;
  /** Pixels from the viewport's left edge. */
  left: number;
}

/** What `close` is told. */
interface CloseOptions {
  /** The trigger takes the focus before anything else happens. */
  focusTrigger: boolean;
}

const id = useId();
const triggerId = `${id}-trigger`;

const popover = useTemplateRef<HTMLElement>("popover");
const panel = useTemplateRef<HTMLElement>("panel");

// The content is mounted only while `shown`. The popover stays in the top layer until R05 has played: a native
// `hidePopover()` takes it out at once and the leave would play on nothing. So `close()` flips the flag, the Transition
// plays the leave, and `finish` hides the popover after it. `popover="manual"`, so the browser's own Esc and light
// dismiss never hide it early: both, and Tab, are ours.
const shown = ref(false);

// Where the wrapper goes in a browser without anchor positioning: set by `open()` after it measured the panel.
const fixed = ref<Placement | null>(null);

// The gap between trigger and menu is the prototype's 12px, `--space-3`, which the margin below spells as the token.
const GAP = 12;

const hooks = useMotionTransition({
  enter: (m, el) => m.menuIn(el),
  leave: (m, el) => m.menuOut(el),
});

/**
 * The wrapper's placement. The popover's UA box is reset in the class, and its `margin: auto` with it: the margin here is
 * the gap, applied inside the area `position-area` picks next to the anchor. `flip-block` moves it above the trigger
 * where there is no room below.
 */
const placement = computed(() => fixed.value
  ? `position-area:none;margin:0;top:${fixed.value.top}px;left:${fixed.value.left}px`
  : `position-anchor:--${id};position-area:${props.align === "start"
    ? "bottom span-right"
    : "bottom span-left"};position-try-fallbacks:flip-block;margin-block:var(--space-3)`);

// R04's origin is at the trigger (the prototype): 20% for a menu on the trigger's left edge, 90% for one on its right.
const origin = computed(() => props.align === "start"
  ? "20% 0"
  : "90% 0");

// The trigger element the caller drew, found by the id the slot handed out.
const triggerEl = () => document.getElementById(triggerId);

/**
 * Every item in DOM order, the disabled ones too: the keys skip them by flag, and the flags have to line up with them.
 * @returns the item buttons of the open panel
 */
function items() {
  return [
    ...panel.value?.querySelectorAll<HTMLElement>("[role=\"menuitem\"]") ?? [],
  ];
}
const enabledOf = (list: HTMLElement[]) => list.map(el => !el.matches(":disabled"));

/**
 * Moves the focus to the item at `index`; -1 leaves it where it is.
 * @param list the menu's items
 * @param index the one to focus
 */
function focusItem(list: HTMLElement[], index: number) {
  if (index >= 0)
    list[index]?.focus();
}

/**
 * Esc, anywhere: the menu closes and the trigger has the focus. On the window and not on the panel, because the focus
 * can be on the trigger or on `<body>` while the menu is open (a pointer click on a disabled item).
 * @param event the key press
 */
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented)
    return;
  event.preventDefault();
  close({ focusTrigger: true });
}

/**
 * A press outside the menu and its trigger closes it and leaves the focus where the press put it. The trigger is its own
 * toggle: its click closes the menu, so a press on it is ignored here, or the click would open it again.
 * @param event the press
 */
function onPointerdown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (!target || panel.value?.contains(target) || triggerEl()?.contains(target))
    return;
  close({ focusTrigger: false });
}

/** Measures the panel and puts the wrapper beside the trigger, for a browser that cannot do it with anchors. */
function place() {
  const trigger = triggerEl();
  const el = panel.value;
  if (!trigger || !el)
    return;
  // `offsetWidth` and `offsetHeight` are layout sizes: R04's scale on the first frame must not shrink the measure.
  fixed.value = fallbackPlacement(
    trigger.getBoundingClientRect(),
    { width: el.offsetWidth, height: el.offsetHeight },
    { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    props.align,
    GAP,
  );
}

/** Opens the popover, mounts the panel, and puts the focus on the marked item, else the first, else the panel itself. */
async function open() {
  if (shown.value)
    return;
  // `showPopover` first and the content after: R04 starts when the panel is inserted, and an animation on a
  // `display: none` subtree is not reliably listed.
  if (popover.value && !popover.value.matches(":popover-open"))
    popover.value.showPopover();
  shown.value = true;
  window.addEventListener("keydown", onWindowKeydown);
  document.addEventListener("pointerdown", onPointerdown);
  await nextTick();
  const el = panel.value;
  if (!el)
    return;
  // Closed and opened again before the leave began: the same panel is still there, and `close` made it inert.
  el.inert = false;
  if (!(props.anchored ?? CSS.supports("position-area", "bottom"))) {
    place();
    await nextTick();
  }
  const list = items();
  const index = initialIndex(enabledOf(list), list.map(el => el.getAttribute("aria-current") === "true"));
  // An empty or all-disabled menu has no item to take the focus: the panel does, so Esc still reaches it.
  (index >= 0
    ? list[index]
    : el)?.focus();
}

/**
 * Closes the menu. With `focusTrigger` the trigger takes the focus FIRST, before anything the choice goes on to do: a
 * Rename that focuses its input afterwards would lose the focus to a later one, and a modal that Delete opens returns
 * its focus to whatever held it when it opened, which must be the trigger.
 * @param options whether the trigger takes the focus
 */
function close(options: CloseOptions) {
  if (!shown.value)
    return;
  if (options.focusTrigger)
    triggerEl()?.focus();
  if (panel.value)
    panel.value.inert = true;
  shown.value = false;
  removeListeners();
}

/** After the leave: R05 has played, so the popover leaves the top layer. Nothing here touches the focus. */
function finish() {
  // Opened again during the leave: the popover stays.
  if (shown.value)
    return;
  if (popover.value?.matches(":popover-open"))
    popover.value.hidePopover();
}

/** Takes the window's Esc and the document's pointerdown off again: on a close, and on an unmount in the middle of the leave. */
function removeListeners() {
  window.removeEventListener("keydown", onWindowKeydown);
  document.removeEventListener("pointerdown", onPointerdown);
}

/**
 * A choice. In the capture phase, so it runs before the item's own handler. A press on the heading, a separator or the
 * padding is no choice.
 * @param event the click, at its target
 */
function onChoose(event: MouseEvent) {
  if ((event.target as Element | null)?.closest("[role=\"menuitem\"]"))
    close({ focusTrigger: true });
}

/**
 * The keys of a menu: arrows, Home, End and a letter move the focus, Tab leaves. Enter and Space are the item's own click.
 * @param event the key press, from the focused item or the panel
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    // Not prevented: the Tab goes on from the trigger, which has the focus by now (07-accessibility.md, Focus order).
    close({ focusTrigger: true });
    return;
  }
  const list = items();
  const enabled = enabledOf(list);
  const from = list.indexOf(document.activeElement as HTMLElement);
  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    focusItem(list, moveIndex(enabled, from, event.key));
    return;
  }
  if (isTypeAheadKey(event.key, { ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey })) {
    event.preventDefault();
    const labels = list.map(el => el.querySelector("[data-menu-label]")?.textContent ?? "");
    focusItem(list, typeAheadIndex(labels, enabled, from, event.key));
  }
}

/**
 * The trigger's ArrowDown, which the platform's menu buttons have and 07-accessibility.md asks for. Enter and Space are its click.
 * @param event the key press on the trigger
 */
function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowDown")
    return;
  event.preventDefault();
  void open();
}

// What the caller binds onto its trigger (`UiIconButton` or `UiButton`, `v-bind="trigger"`): the id the panel is named
// by, the popup's state, and the anchor the menu is placed against. `style` is inline, as it always was: the tooltip
// (#311) joins its own anchor name with this one.
const trigger = computed(() => ({
  "id": triggerId,
  "aria-haspopup": "menu",
  "aria-expanded": shown.value
    ? "true"
    : "false",
  "aria-controls": id,
  "style": `anchor-name: --${id}`,
  "onClick": () => shown.value
    ? close({ focusTrigger: true })
    : void open(),
  "onKeydown": onTriggerKeydown,
}));

// A caller that deletes its own row (a Challenge's Delete) unmounts the menu in the middle of the leave.
onBeforeUnmount(removeListeners);
</script>

<template>
  <div class="inline-block">
    <!-- The caller draws the trigger and binds `trigger` onto it. -->
    <slot name="trigger" :trigger="trigger" />

    <!-- No `display` on the wrapper: it would override the UA's `:popover-open` rule. The box reset is the UA popover's. -->
    <div
      :id="id"
      ref="popover"
      popover="manual"
      class="[inset:auto] m-0 w-fit overflow-visible border-0 bg-transparent p-0"
      :style="placement"
    >
      <Transition
        :css="false"
        v-bind="hooks"
        @after-leave="finish"
      >
        <div
          v-if="shown"
          ref="panel"
          role="menu"
          :aria-labelledby="triggerId"
          tabindex="-1"
          class="flex max-h-[min(70vh,26rem)] max-w-[calc(100vw-2rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-xl bg-surface-raised p-2 font-body text-text shadow-popover outline-none"
          :class="wide ? 'w-[340px]' : 'w-[260px]'"
          :style="{ transformOrigin: origin }"
          @keydown="onKeydown"
          @click.capture="onChoose"
        >
          <div
            v-if="heading"
            role="presentation"
            class="flex-none px-3.5 pt-2 pb-1.5 text-xs [font-weight:var(--font-weight-heavy)] text-text-muted"
          >
            {{ heading }}
          </div>
          <slot />
        </div>
      </Transition>
    </div>
  </div>
</template>
