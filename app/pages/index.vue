<script setup lang="ts">
// import { mockWinnies } from "~/data/mock-winnies";

const toast = useToast();
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
