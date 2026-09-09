<script setup lang="ts">
import { elapsedSeconds, formatDuration } from "~~/shared/utils/timer";

// gets rid of background color
definePageMeta({ layout: false });

// CONFIG (user can config this later, surely)
const CHALLENGES_PER_PAGE = 5;
const PAGE_ROTATION_MS = 10_000;

const route = useRoute();
const slug = route.params.slug as string;

const { data: shared, error } = await useFetch(`/api/share/${slug}`, { lazy: true });

useHead({
  meta: [{ name: "robots", content: "noindex, nofollow" }],
  // daisyUI paints the root element in theme colors otherwise
  htmlAttrs: { style: "--root-bg: transparent; --page-scroll-bg: transparent" },
});

const clock = useServerClock();
watch(shared, (value) => {
  if (value)
    clock.sync(new Date(value.serverNow).getTime());
}, { immediate: true });

const now = useNow();

const challenges = computed(() => sortChallenges(shared.value?.winnie.challenges ?? []));
const isComplete = computed(() => isWinnieComplete(challenges.value));

// Poll the same endpoint the initial load used.
const { gone } = useSharedPoll<NonNullable<typeof shared.value>>(
  slug,
  (data) => {
    shared.value = data;
  },
  isComplete,
);

const pages = computed(() => {
  const slides: (typeof challenges.value)[] = [];

  for (let index = 0; index < challenges.value.length; index += CHALLENGES_PER_PAGE)
    slides.push(challenges.value.slice(index, index + CHALLENGES_PER_PAGE));

  return slides;
});

const pageIndex = ref(0);

watch(() => pages.value.length, (count) => {
  if (pageIndex.value >= count)
    pageIndex.value = 0;
});

let slideRotation: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  slideRotation = setInterval(() => {
    if (pages.value.length > 1)
      pageIndex.value = (pageIndex.value + 1) % pages.value.length;
  }, PAGE_ROTATION_MS);
});

onUnmounted(() => clearInterval(slideRotation));

// What each row of the current slide displays.
const challengeRows = computed(() => (pages.value[pageIndex.value] ?? pages.value[0] ?? []).map((challenge) => {
  const running = challenge.runningSince !== null;
  const seconds = elapsedSeconds(challenge, now.value);

  return {
    ...challenge,
    running,
    won: challenge.status === "won",
    // challenge not started --> show no time
    showTime: running || seconds > 0,
    time: formatDuration(seconds),
  };
}));

const totalSeconds = computed(() => {
  const winnie = shared.value?.winnie;

  if (!winnie)
    return 0;

  return elapsedSeconds(
    { accumulatedSeconds: winnie.totalAccumulatedSeconds, runningSince: winnie.totalRunningSince },
    now.value,
  );
});

const totalIsRunning = computed(() => shared.value?.winnie.totalRunningSince != null);
</script>

<template>
  <div
    v-if="error || gone"
    class="w-90 rounded-lg bg-base-300/90 p-4 text-center font-bold"
  >
    This Winnie doesn't exist (anymore).
    <br>
    ¯\_(ツ)_/¯
  </div>

  <div
    v-else-if="shared"
    class="w-90 rounded-lg bg-base-200/90 pb-2"
  >
    <div class="border-b p-2 text-center">
      <p class="text-md text-xl font-bold opacity-90">
        {{ shared.winnie.name }}
      </p>

      <p
        class="font-mono text-2xl font-bold"
        :class="isComplete ? 'text-success' : totalIsRunning ? 'text-primary' : ''"
      >
        {{ formatDuration(totalSeconds) }}
      </p>
    </div>

    <ul class="flex flex-col gap-2 p-3">
      <li
        v-for="row in challengeRows"
        :key="row.id"
        class="flex gap-2 leading-snug"
      >
        <span class="flex w-5 justify-center pt-0.5">
          <StatusDot v-if="row.running" status="running" />
          <UiIcon
            v-if="row.won"
            name="trophy"
            class="text-success"
          />
        </span>

        <span
          class="flex-1 font-medium wrap-break-word"
          :class="{ 'text-success': row.won }"
        >
          {{ row.game }}
        </span>

        <span
          v-if="row.target > 0"
          class="font-mono tabular-nums"
          :class="row.won ? 'text-success' : 'opacity-90'"
        >
          {{ row.count }}/{{ row.target }}
        </span>

        <span
          v-if="row.showTime"
          class="font-mono tabular-nums"
          :class="row.won ? 'text-success' : row.running ? 'text-primary' : ''"
        >

          {{ row.time }}
        </span>
      </li>
    </ul>

    <div
      v-if="pages.length > 1"
      class="flex justify-center gap-2"
    >
      <span
        v-for="page in pages.length"
        :key="page"
        class="size-2.5 rounded-full transition-colors"
        :class="page - 1 === pageIndex ? 'bg-base-content' : 'bg-base-content/30'"
      />
    </div>
  </div>
</template>
