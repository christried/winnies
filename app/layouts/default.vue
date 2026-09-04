<script lang="ts" setup>
import { formatDuration } from "~~/shared/utils/timer";
import AppFooter from "~/components/app-footer.vue";

const winnieStore = useWinnieStore();
const { currentWinnie } = storeToRefs(winnieStore);
const user = useCurrentUser();

// "callOnce" runs this during SSR only to avoid mismatches while hydrating
if (user.value)
  await callOnce("winnies:init", () => winnieStore.init());

const now = useTitleNow();
useHead({
  title: computed(() => {
    const winnie = currentWinnie.value;
    if (!winnie?.totalRunningSince)
      return "Winnies";

    const seconds = elapsedSeconds(
      { accumulatedSeconds: winnie.totalAccumulatedSeconds, runningSince: winnie.totalRunningSince },
      now.value,
    );
    return `${formatDuration(seconds)} · Winnies`;
  }),
});
</script>

<template>
  <div class="min-h-dvh bg-base-100 text-base-content">
    <div class="mx-auto flex max-w-270 flex-col gap-4 p-4">
      <slot />
      <AppFooter />
    </div>
  </div>
</template>
