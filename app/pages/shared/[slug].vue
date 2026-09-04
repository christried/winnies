<script setup lang="ts">
definePageMeta({ layout: "shared" });

const route = useRoute();

const shareUrl = computed(() => `${useRequestURL().origin}/shared/${route.params.slug}`);

const { data: shared, error } = await useFetch(`/api/share/${route.params.slug}`, {
  lazy: true,
});

useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });

const clock = useServerClock();
watch(shared, (value) => {
  if (value)
    clock.sync(new Date(value.serverNow).getTime());
}, { immediate: true });

const now = useNow();

const challenges = computed(() => sortChallenges(shared.value?.winnie.challenges ?? []));
const isComplete = computed(() => isWinnieComplete(challenges.value));
</script>

<template>
  <div v-if="error" class="flex flex-col items-center gap-2 py-16">
    <p class="font-semibold">
      This Winnie doesn't exist. Does it? Did it?
    </p>
    <p class="type-meta">
      The link may have been deleted by its owner.
    </p>
  </div>

  <div v-else-if="shared" class="flex flex-col gap-3">
    <header class="flex items-center gap-2">
      <span class="type-wordmark">Winnies</span>
      <div class="ms-auto badge gap-1">
        <UiIcon name="eye" />
        <span class="type-label">View only</span>
      </div>
    </header>

    <SharedWinnieCard :winnie="shared.winnie" :now="now" />

    <div v-if="isComplete" class="alert border-success bg-success/10">
      <UiIcon name="trophy" class="text-success" />
      Win-challenge complete
    </div>

    <ul class="card bg-base-200">
      <li
        v-for="challenge in challenges"
        :key="challenge.id"
        class="border-b border-base-300 last:border-0"
      >
        <SharedChallengeRow :challenge="challenge" :now="now" />
      </li>
    </ul>
    <footer class="flex items-center gap-2">
      <SharedCopyLink :url="shareUrl" class="flex-1" />
    </footer>
  </div>
</template>
