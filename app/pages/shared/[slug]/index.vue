<script setup lang="ts">
definePageMeta({ layout: "shared" });

const route = useRoute();

const shareUrl = computed(() => `${useRequestURL().origin}/shared/${route.params.slug}`);

const { data: shared, error } = await useFetch(`/api/share/${route.params.slug}`, {
  lazy: true,
});

useHead({
  meta: [
    { name: "robots", content: "noindex, nofollow" },
  ],
});

const clock = useServerClock();
watch(shared, (value) => {
  if (value)
    clock.sync(new Date(value.serverNow).getTime());
}, { immediate: true });

const now = useNow();

const challenges = computed(() => sortChallenges(shared.value?.winnie.challenges ?? []));
const isComplete = computed(() => isWinnieComplete(challenges.value));

useFavicon(() => ({
  running: shared.value?.winnie.totalRunningSince != null,
  complete: isComplete.value,
}));

// Poll the same endpoint the initial load used.
const { lastUpdated, failing, gone } = useSharedPoll<NonNullable<typeof shared.value>>(
  route.params.slug as string,
  (data) => {
    shared.value = data;
  },
  isComplete,
);

const freshness = computed(() => {
  if (failing.value)
    return "Reconnecting…";

  const seconds = Math.floor((now.value - lastUpdated.value) / 1000);

  if (seconds < 5)
    return "Updated just now";

  if (seconds < 60)
    return `Updated ${seconds}s ago`;

  return `Updated ${Math.floor(seconds / 60)}m ago`;
});
</script>

<template>
  <div v-if="error || gone" class="flex flex-col items-center gap-2 py-16">
    <p class="font-semibold">
      This Winnie doesn't exist. Does it? Did it?
    </p>
    <p>
      The link may have been deleted by its owner.
    </p>
  </div>

  <div v-else-if="shared" class="flex flex-col gap-3">
    <header class="flex flex-wrap items-center justify-center gap-2">
      <AppWordmark />
      <div class="ms-auto flex items-center gap-1">
        <UiTablerIcon name="eye" />
        <span>View only</span>
      </div>
      <ThemeController />
    </header>

    <SharedWinnieCard :winnie="shared.winnie" :now="now" />

    <div v-if="isComplete" class="flex items-center gap-2">
      <UiTablerIcon name="trophy" />
      Win-challenge complete
    </div>

    <ul>
      <li
        v-for="challenge in challenges"
        :key="challenge.id"
        class="border-b last:border-0"
      >
        <SharedChallengeRow :challenge="challenge" :now="now" />
      </li>
    </ul>
    <footer class="flex items-center gap-2">
      <SharedCopyLink :url="shareUrl" class="flex-1" />
      <span>{{ freshness }}</span>
    </footer>
  </div>
</template>
