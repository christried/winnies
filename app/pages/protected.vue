<script setup lang="ts">
// Throwaway probe for WT-D02 — delete once a real protected page exists.
// It needs its own route rather than living on the index: the middleware
// redirects to "/", so protecting "/" would loop a signed-out visitor.
definePageMeta({ middleware: "auth" });

const { data: session } = await useAuth();
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl">
      Protected
    </h1>
    <p>Seeing this means the auth middleware let the request through.</p>
    <pre class="mt-2 max-w-200 overflow-x-auto rounded bg-base-200 p-3 text-xs">{{ session ?? "no session" }}</pre>
    <NuxtLink class="link link-primary" to="/">
      Back
    </NuxtLink>
  </div>
</template>
