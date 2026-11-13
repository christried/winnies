<script lang="ts" setup>
const { toasts, dismiss } = useToast();
</script>

<template>
  <div
    class="fixed end-4 bottom-4 z-50 flex flex-col gap-2"
    aria-live="polite"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
    >
      <span>{{ t.message }}</span>
      <UiIconButton
        size="sm"
        variant="ghost"
        icon="close"
        label="Dismiss"
        @click="dismiss(t.id)"
      />
    </div>
  </div>
</template>
