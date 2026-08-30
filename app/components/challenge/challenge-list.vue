<script setup lang="ts">
const { challenges, totalCount, pending, currentWinnieId } = storeToRefs(useWinnieStore());
const showSkeleton = useDelayed(pending);
</script>

<template>
  <div v-if="showSkeleton" class="h-24 w-full skeleton" />
  <div v-else-if="totalCount === 0 && currentWinnieId" class="flex flex-col items-center gap-2 py-8">
    <p class="font-semibold">
      No Challenges yet
    </p>
    <p class="type-meta">
      Add your first Challenge now.
    </p>
  </div>
  <div v-else class="card bg-base-200">
    <ul>
      <!-- :key is the id, never the index (see step 1) -->
      <li
        v-for="challenge in challenges"
        :key="challenge.id"
        class="border-b border-base-300 last:border-0"
      >
        <ChallengeRow :challenge="challenge" />
      </li>
    </ul>
  </div>
</template>
