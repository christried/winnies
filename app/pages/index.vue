<script setup lang="ts">
// import { mockWinnies } from "~/data/mock-winnies";

const toast = useToast();

// Throwaway auth harness for WT-D01 step 10 — delete at WT-D03, which builds the
// real account control. Plain $fetch on purpose: no client library for a stub.
const session = ref<unknown>(null);

/** Runs on mount too, so a page reload is what proves the cookie survived. */
async function loadSession() {
  session.value = await $fetch("/api/auth/get-session");
}

/** Better Auth hands back Discord's URL rather than redirecting, so the navigation is ours. */
async function signIn() {
  const result = await $fetch<Record<string, string>>("/api/auth/sign-in/social", {
    method: "POST",
    body: { provider: "discord", callbackURL: "/" },
  });
  if (result.url)
    window.location.href = result.url;
}

/** Clears the cookie server-side; repainting the panel is how you see it worked. */
async function signOut() {
  await $fetch("/api/auth/sign-out", { method: "POST" });
  await loadSession();
}

onMounted(loadSession);
</script>

<template>
  <div>
    <AppHeader />
    <!-- Testing Buttons, get rid in next tickets as soon as space is needed :D -->
    <button class="btn w-40 btn-primary" @click="toast.error('yeeee')">
      Push stuff
    </button>
    <button class="btn w-40 btn-primary " @click="toast.info('yeeee')">
      Push more stuff
    </button>
    <button class="btn w-40 btn-primary" @click="toast.success('yeeee')">
      Push most stuff
    </button>
    <!-- Testing Buttons End -->

    <!-- Auth harness for WT-D01, delete at WT-D03 -->
    <div class="mt-4 flex items-center gap-2">
      <button class="btn btn-primary" @click="signIn">
        Sign in with Discord
      </button>
      <button class="btn btn-ghost" @click="signOut">
        Sign out
      </button>
      <button class="btn btn-ghost" @click="loadSession">
        Reload session
      </button>
      <NuxtLink class="btn btn-ghost" to="/protected">
        Open protected page
      </NuxtLink>
    </div>
    <pre class="mt-2 max-w-200 overflow-x-auto rounded bg-base-200 p-3 text-xs">{{ session ?? "no session" }}</pre>
    <!-- Auth harness End -->

    <!-- Repo Link to be deleted as soon as there's more going on here -->
    <br>
    <div class="aura mt-50 aura-dual">
      <button class="btn border border-black btn-neutral">
        <a
          class="link link-primary"
          href="https://github.com/christried/wintool"
          target="blank"
        >
          Find on Github
        </a>
      </button>
    </div>
  </div>
</template>
