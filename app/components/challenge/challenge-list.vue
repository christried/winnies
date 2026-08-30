<script setup lang="ts">
const { challenges, totalCount, pending, currentWinnieId } = storeToRefs(useWinnieStore());
const showSkeleton = useDelayed(pending);
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
    <div v-else class="card bg-base-200">
      <ul>
        <li
          v-for="challenge in challenges"
          :key="challenge.id"
          class="border-b border-base-300 last:border-0"
        >
          <ChallengeRow :challenge="challenge" />
        </li>
      </ul>
    </div>

    <ChallengeAddRow />
  </template>
</template>
