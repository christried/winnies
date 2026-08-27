<script lang="ts" setup>
const { data: session } = await useAuth();
</script>

<template>
  <header class="flex flex-wrap items-center gap-2">
    <span class="type-wordmark">Winnies</span>
    <template v-if="session">
      <span class="select">Winnie Picker</span>
      <UiIconButton
        icon="plus"
        label="add new winnie"
      />
      <UiIconButton
        icon="share"
        label="open shared view"
      />
    </template>
    <div class="ms-auto" />
    <AccountControl />
  </header>
</template>
