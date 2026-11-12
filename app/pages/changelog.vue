<script setup lang="ts">
const { data: changelog } = await useAsyncData(() => queryCollection("changelog").path("/changelog").first());

if (!changelog.value)
  throw createError({ statusCode: 404, statusMessage: "Changelog not found" });

const { brand } = useAppConfig();

// The Changelog speaks Showcase (spec #257 § 5).
useDialect("showcase");

useSeoMeta({
  title: `Changelog · ${brand.name}`,
  description: changelog.value.description,
});
</script>

<template>
  <div>
    <header class="mb-4 flex">
      <AppWordmark :need-reload="true" />
    </header>

    <main class="p-4 md:p-8">
      <ContentRenderer
        v-if="changelog"
        :value="changelog"
        class="mx-auto max-w-prose"
      />
    </main>
  </div>
</template>
