<!-- app/components/ui/play-toggle.vue -->
<script setup lang="ts">
import { playToggleView } from "~/utils/play-toggle";

// The handoff's play / pause toggle (03-components.md, `play-toggle`; R25 and A06 in 04-motion-and-sound.md). It composes
// `UiIconButton`, which is `UiButton`'s icon-only form: the press, the jelly, the lift, the busy spinner, the click guard
// and the focus ring live there once. This draws the icon in the slot, so the toggle owns the element R25's morph needs.
// No screen uses it yet: R3's rows and the Winnie card swap their icon buttons for it.
const props = withDefaults(defineProps<{
  /** The Challenge's timer runs. The parent holds it: the toggle only emits. */
  running?: boolean;
  /** The Challenge is Won: the toggle is disabled, named "Won", and never shows as running. */
  won?: boolean;
  /** A request is in flight: the spinner replaces the icon, presses are ignored, the toggle stays focusable. */
  busy?: boolean;
  /** Stops focus, click and Enter or Space. */
  disabled?: boolean;
}>(), {
  running: false,
  won: false,
  busy: false,
  disabled: false,
});

const emit = defineEmits<{
  /** `next` (the opposite of `running`: true means start), asked for by a click, Enter or Space. Asked for, not done: `running` changes only if the parent takes it. */
  toggle: [next: boolean];
}>();

// No `pressed`: the name changes with the state ("Start", "Pause"), so `aria-pressed` would announce it twice. The words
// are the component's own copy (`row.labels` in 06-copy.md), never a prop.
const view = computed(() => playToggleView(props.running, props.won));

const vLoop = useLoopDirective();
const m = useWinniesMotion();
const icon = useTemplateRef<HTMLElement>("icon");
const ring = useTemplateRef<HTMLElement>("ring");

// R25 plays when the running state changes, not on the click, so a start from outside (a shortcut, another tab's sync)
// morphs too. A first render draws its end state: the watcher is not `immediate`. Both recipes return null under reduced
// motion, and then `v-loop` starts nothing either, so there is no branch of our own. While `busy` the button draws
// neither the icon nor the ring: the morph finds no element and does nothing, and no `ringIn` plays then.
watch(() => view.value.running, async (on) => {
  m.morph(icon.value);
  if (!on)
    return;
  // `v-loop` starts the ring's loop in a post-render hook, and an animation created later wins on `opacity` while it
  // runs: `ringIn` is created after it, or the loop would cover it.
  await nextTick();
  m.ringIn(ring.value);
}, { flush: "post" });

/**
 * A press. `UiButton` swallows a busy or disabled one before it gets here, so this only asks for the opposite state.
 */
function onClick() {
  emit("toggle", !view.value.running);
}
</script>

<template>
  <UiIconButton
    :label="view.label"
    :variant="view.variant"
    :busy="busy"
    :disabled="disabled || view.locked"
    @click="onClick"
  >
    <span
      ref="icon"
      data-icon
      class="inline-flex"
    >
      <UiIcon
        :name="view.icon"
        size="lg"
        :weight="500"
        fill
      />
    </span>
    <!-- A06: the ring breathes while the timer runs. The inset, the 26px blur and the 6px spread are the prototype's
         literals (WinniesWorkspace.dc.html, the row's glow) with no token. At rest, in reduced motion and in the server's
         render, it is the static ring at half opacity. It sits inside the button, so it lifts and jellies with it, and its
         pictures are drawn outside its own box, so the disc is never covered. -->
    <span
      v-if="view.running"
      ref="ring"
      v-loop="'ring'"
      data-ring
      aria-hidden="true"
      class="pointer-events-none absolute -inset-1.5 rounded-round opacity-50 [box-shadow:0_0_0_var(--border-ring)_var(--color-running-ring),0_0_26px_6px_var(--color-accent)]"
    />
  </UiIconButton>
</template>
