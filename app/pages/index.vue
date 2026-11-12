<script setup lang="ts">
useCompletion();
useRefreshOnReturn();

// Same route, two surfaces: a signed-in Owner's Workspace speaks none, a visitor's Landing speaks Showcase.
// The server knows the user, so the served HTML already carries the right one.
const user = useCurrentUser();
useDialect(user.value ? null : "showcase");
</script>

<template>
  <div class="flex flex-col gap-2">
    <AppHeader />

    <WinnieCard />

    <WinnieCompleteBanner />

    <ChallengeList />
  </div>
</template>
