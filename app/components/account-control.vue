<script lang="ts" setup>
const user = useCurrentUser();
const signingIn = ref(false);

const userShorthand = computed(() => {
  return user.value?.name.slice(0, 2).toUpperCase();
});

/**
 * Handles clicks on the sign in button at the top right and navigates to providers defined in authClient.
 */
async function onSignIn() {
  signingIn.value = true;
  await authClient.signIn.social({ provider: "discord", callbackURL: "/" });
}

/**
 * Processes logging out the current User.
 * @param close Passed up from the menu. Gives access to closing the popover menu.
 */
async function onSignOut(close: () => void) {
  close();
  await authClient.signOut();
  await reloadNuxtApp({ path: "/" });
}
</script>

<template>
  <UiButton
    v-if="!user"
    variant="primary"
    :disabled="signingIn"
    @click="onSignIn()"
  >
    Sign in with Discord
  </UiButton>

  <UiDropdown v-else>
    <template #trigger="{ trigger }">
      <!-- The avatar is the glyph: a ghost icon button with the picture (or the initials) inside the circle. -->
      <UiIconButton
        v-bind="trigger"
        label="Account Menu"
        variant="ghost"
      >
        <img
          v-if="user.image"
          alt=""
          :src="user.image"
          class="size-9 rounded-full object-cover"
        >
        <span v-else class="text-sm">{{ userShorthand }}</span>
      </UiIconButton>
    </template>
    <template #default=" { close }">
      <li>
        Logged in as {{ user.name }}
      </li>
      <li>
        <button type="button" @click="onSignOut(close)">
          Log out
        </button>
      </li>
    </template>
  </UiDropdown>
</template>
