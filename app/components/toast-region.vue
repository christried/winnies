<script lang="ts" setup>
const { toasts, dismiss } = useToast();
</script>

<template>
  <div
    class="toast toast-end z-50"
    aria-live="polite"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
      class="alert"
      :class="{
        'alert-error': t.kind === 'error',
        'alert-success': t.kind === 'success',
        'alert-info': t.kind === 'info',
      }"
    >
      <span>{{ t.message }}</span>
      <button
        class="btn btn-ghost btn-xs"
        aria-label="Dismiss"
        @click="dismiss(t.id)"
      >
        <UiIcon name="close" />
      </button>
    </div>
  </div>
</template>
