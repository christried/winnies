<script setup lang="ts">
// The Overlay's own layout: the page renders into an OBS browser source, so the root carries no class, padding,
// min-height or background, and the page lands where it did before this layout existed. It exists to hold the
// surface's motion instance and particle layer (#300).
const root = useTemplateRef<HTMLElement>("root");
const clock = provideSurfaceClock();
provideWinniesMotion({ root, interval: clock.interval });
</script>

<template>
  <div ref="root">
    <slot />
    <ParticleLayer />
  </div>
</template>
