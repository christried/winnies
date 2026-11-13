<script lang="ts" setup>
import { formatDuration } from "~~/shared/utils/timer";

// First, before the await below: a provide after an await is lost.
const root = useTemplateRef<HTMLElement>("root");
const clock = provideSurfaceClock();
provideWinniesMotion({ root, interval: clock.interval });

const winnieStore = useWinnieStore();
const { currentWinnie } = storeToRefs(winnieStore);
const user = useCurrentUser();

// "callOnce" runs this during SSR only to avoid mismatches while hydrating
if (user.value)
  await callOnce("winnies:init", () => winnieStore.init());

// A layout cannot inject the clock it provides, so it reads its own.
const { now } = clock;
const { brand } = useAppConfig();
useHead({
  title: computed(() => {
    const winnie = currentWinnie.value;
    if (!winnie?.totalRunningSince)
      return brand.name;

    const seconds = elapsedSeconds(
      { accumulatedSeconds: winnie.totalAccumulatedSeconds, runningSince: winnie.totalRunningSince },
      now.value,
    );
    return `${formatDuration(seconds)} · ${brand.name}`;
  }),
});

useFavicon(() => ({
  running: currentWinnie.value?.totalRunningSince != null,
  complete: winnieStore.isComplete,
}));
</script>

<template>
  <div ref="root" class="min-h-dvh">
    <div class="mx-auto flex max-w-270 flex-col gap-2 p-4">
      <slot />
      <AppFooter />
    </div>
    <ParticleLayer />
  </div>
</template>
