<script setup lang="ts">
import { elapsedSeconds, formatDuration } from "~~/shared/utils/timer";

// gets rid of background color
definePageMeta({ layout: false });

// CONFIG (user can config this later, surely)
const CHALLENGES_PER_PAGE = 5;
const PAGE_ROTATION_MS = 10_000;
const FIREWORK_INTERVAL_MS = 1_200;
const FIREWORK_PARTICLE_COUNT = 25;

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

let fireworks: ReturnType<typeof setInterval> | undefined;

const fireworkCanvas = useTemplateRef<HTMLCanvasElement>("fireworkCanvas");

/**
 * Fireworks go brrr
 */
async function startFireworks() {
  if (fireworks || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;

  // The canvas only exists once the panel has rendered.
  await nextTick();

  const canvas = fireworkCanvas.value;

  if (!canvas || !isComplete.value)
    return;

  const { default: confetti } = await import("canvas-confetti");

  // resized to only the overlay, not the whole page
  const confettiBurst = confetti.create(canvas, { resize: true });

  const defaults = {
    particleCount: FIREWORK_PARTICLE_COUNT,
    startVelocity: 18,
    spread: 360,
    ticks: 60,
    scalar: 0.8,
  };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  fireworks = setInterval(() => {
    confettiBurst({ ...defaults, origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0, 0.4) } });
    confettiBurst({ ...defaults, origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0, 0.4) } });
  }, FIREWORK_INTERVAL_MS);
}

/**
 * Stop Confetti going brr.
 */
function stopFireworks() {
  clearInterval(fireworks);
  fireworks = undefined;
}

onMounted(() => {
  watch(isComplete, (complete) => {
    if (complete)
      startFireworks();
    else
      stopFireworks();
  }, { immediate: true });
});

onUnmounted(stopFireworks);
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
    class="relative z-0 w-90 overflow-hidden rounded-lg bg-base-200/90 pb-2"
  >
    <!-- used to only render canvas confetti here and not on the empty rest of the page -->
    <canvas
      ref="fireworkCanvas"
      class="pointer-events-none absolute inset-0 -z-10 size-full"
    />

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
        class="flex items-center gap-2 leading-snug"
      >
        <span class="flex w-5 items-center justify-center">
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
        :class="page - 1 === pageIndex ? 'bg-base-content' : 'bg-base-content/40'"
      />
    </div>
  </div>
</template>
