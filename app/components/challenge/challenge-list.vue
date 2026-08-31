<script setup lang="ts">
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";

const winnieStore = useWinnieStore();
const { challenges, totalCount, pending, currentWinnieId, currentWinnie } = storeToRefs(winnieStore);
const showSkeleton = useDelayed(pending);

// DRAG & DROP

const [parent, items] = useDragAndDrop(challenges.value, {
  // assigned in challenge-row component
  dragHandle: ".drag-grip",
  draggingClass: "opacity-80",
  dropZoneClass: "border-2 border-primary",
  onDragend,
});

// Mirrors new Challenge entries into draggable items
watch(challenges, next => (items.value = [...next]));

/**
 * Clamps the Challenge order order to decisions made in sortChallenges.
 * Then sends new order to DB. Then syncronizes db into store into draggable items
 */
async function onDragend() {
  const clampedChallenges = sortChallenges(
    items.value.map((challenge, index) => ({ ...challenge, position: index })),
  );

  items.value = clampedChallenges;

  if (!currentWinnie.value)
    return;

  const orderedIds = clampedChallenges.map(challenge => challenge.id);

  try {
    await $fetch(`/api/winnies/${currentWinnie.value.id}/reorder`, {
      method: "POST",
      body: { ids: orderedIds },
    });
    winnieStore.applyChallengeOrder(orderedIds);
  }
  catch (error) {
    toastApiError(error);
    items.value = [...challenges.value];
  }
}
</script>

<template>
  <div v-if="showSkeleton" class="h-24 w-full skeleton" />
  <template v-else-if="currentWinnieId">
    <div v-if="totalCount === 0" class="flex flex-col items-center gap-2 py-8">
      <p class="font-semibold">
        No Challenges yet
      </p>
      <p class="type-meta">
        Add your first Challenge now.
      </p>
    </div>
    <ul
      v-else
      ref="parent"
      class="card bg-base-200"
    >
      <li
        v-for="challenge in items"
        :key="challenge.id"
        class="border-b border-base-300 transition-all duration-150 last:border-0"
      >
        <ChallengeRow :challenge="challenge" />
      </li>
    </ul>

    <ChallengeAddRow />
  </template>
</template>
