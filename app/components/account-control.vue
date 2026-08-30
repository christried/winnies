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
  await navigateTo("/", { replace: true });
}
</script>

<template>
  <button
    v-if="!user"
    type="button"
    class="btn btn-neutral"
    :disabled="signingIn"
    @click="onSignIn()"
  >
    <span v-if="signingIn" class="loading loading-spinner text-primary" />
    Sign in with Discord
  </button>

  <UiDropdown
    v-else
    label="Account Menu"
    menu-class="dropdown-end"
  >
    <template #trigger>
      <div v-if="user.image" class="avatar">
        <div class="w-12 rounded-full">
          <img alt="" :src="user.image">
        </div>
      </div>
      <div v-else class="avatar avatar-placeholder">
        <div class="w-12 rounded-full bg-neutral text-neutral-content">
          <span> {{ userShorthand }}</span>
        </div>
      </div>
    </template>
    <template #default=" { close }">
      <li class="menu-title">
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
