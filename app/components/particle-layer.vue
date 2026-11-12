<script lang="ts" setup>
// The surface's one particle layer (handoff 04-motion-and-sound, rule 7). The engine appends particles to it as plain
// DOM nodes, so Vue renders nothing inside. It is static and the same on the server and in the browser, and it carries
// no background, overflow, transform, filter, will-change or isolation, which would clip or shrink the fixed box.
const surface = useWinniesSurface();

/**
 * Hands the layer to the engine once it is mounted, and takes it away (null) when it unmounts.
 *
 * @param el the layer element, or null
 */
function attach(el: unknown) {
  surface.layer.value = el as HTMLElement | null;
}
</script>

<template>
  <div
    :ref="attach"
    data-particle-layer
    aria-hidden="true"
    class="pointer-events-none fixed inset-0"
    style="z-index: var(--z-confetti)"
  />
</template>
