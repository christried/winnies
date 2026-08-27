<script lang="ts" setup>
import { useWinnieStore } from "~/stores/winnies";

const winnieStore = useWinnieStore();
const { data: session } = await useAuth();

// "callOnce" runs this during SSR only to avoid mismatches while hydrating
if (session.value)
  await callOnce("winnies:init", () => winnieStore.init());
</script>

<template>
  <div class="min-h-dvh bg-base-100 text-base-content">
    <div class="mx-auto flex max-w-270 flex-col gap-3.5 p-3.5">
      <slot />
    </div>
  </div>
</template>
