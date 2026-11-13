<script setup lang="ts">
// The Shared View speaks Broadcast (spec #257 § 5).
useDialect("broadcast");

const root = useTemplateRef<HTMLElement>("root");
const clock = provideSurfaceClock();
provideWinniesMotion({ root, interval: clock.interval });
const { toasts, dismiss } = useToast();
</script>

<template>
  <div ref="root" class="min-h-dvh">
    <div class="mx-auto flex max-w-180 flex-col gap-3 p-4">
      <slot />
      <AppFooter />
    </div>
    <ParticleLayer />
    <UiToastStack :toasts="toasts" @dismiss="dismiss" />
  </div>
</template>
