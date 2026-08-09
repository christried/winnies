<script lang="ts" setup>
const toast = useToast();
const toasts = computed(() => toast.toasts.value);
</script>

<template>
  <div class="min-h-dvh bg-base-100 text-base-content">
    <div class="mx-auto flex max-w-180 flex-col gap-3.5 p-3.5">
      <slot />
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
            @click="toast.dismiss(t.id)"
          >
            <UiIcon name="close" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
