<script setup lang="ts">
// No import at all, on purpose: `useSurfaceClock` is an app composable, `computed` a Vue API and `UiIcon` a component
// of app/components. Storybook has to resolve all three as Nuxt does (stories/storybook/auto-imports.stories.ts).
const clock = useSurfaceClock();
const iso = computed(() => new Date(clock.now.value).toISOString());
// Set by Storybook as Nuxt sets it for the app (.storybook/nuxt/import-meta.ts).
const dev = import.meta.dev;
</script>

<template>
  <section
    aria-label="Auto-imports"
    style="display:flex;flex-direction:column;gap:12px;padding:24px"
  >
    <h1
      style="display:inline-block;align-self:flex-start;margin:0;padding:4px 16px;border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font-family:var(--font-display);font-weight:var(--font-weight-display);font-size:var(--text-4xl)"
    >
      Auto-imports
    </h1>
    <div
      data-cell
      style="display:flex;align-items:center;gap:12px;align-self:flex-start;padding:8px 16px;border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text)"
    >
      <UiIcon name="check" />
      <output style="font:800 var(--text-xs)/1.3 ui-monospace,Menlo,monospace">{{ iso }}</output>
      <span
        data-dev
        style="font:800 var(--text-xs)/1.3 ui-monospace,Menlo,monospace"
      >{{ dev }}</span>
    </div>
  </section>
</template>
