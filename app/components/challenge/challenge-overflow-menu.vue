<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The challenge everything interacts with */
  challenge: ChallengeRow;
}>();

const winnieStore = useWinnieStore();

// dynamix labels
const counterLabel = computed(() => props.challenge.target > 0
  ? "Remove counter"
  : "Add counter");
const pinLabel = computed(() => props.challenge.pinned ? "Unpin" : "Pin");

/**
 * Toggles the counter on/off. Sets Target to 0 if it had one!
 */
async function toggleCounter() {
  try {
    const updatedChallenge = await $fetch(`/api/challenges/${props.challenge.id}/counter`, {
      method: "PATCH",
      body: {
        op: "target",
        target: props.challenge.target > 0
          ? 0
          : 1,
      },
    });

    winnieStore.replaceChallenge(updatedChallenge);
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Pins or unpins (Toggle) the Challenge row.
 */
async function togglePin() {
  try {
    const updatedChallenge = await $fetch(`/api/challenges/${props.challenge.id}`, {
      method: "PATCH",
      body: { pinned: !props.challenge.pinned },
    });

    winnieStore.replaceChallenge(updatedChallenge);
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Resets the timer to 0.
 */
async function resetTimer() {
  try {
    // not saving the resultBody for now, maybe later with timer Issues
    await $fetch(`/api/challenges/${props.challenge.id}/timer`, {
      method: "POST",
      body: { action: "reset" },
    });

    winnieStore.resetChallengeTimer(props.challenge.id);
    useToast().success("Timer reset");
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Copies the Challenge definition and fills up with default fields on server side for a fresh Challenge.
 */
async function duplicate() {
  try {
    const createdChallenge = await $fetch(`/api/challenges/${props.challenge.id}/duplicate`, {
      method: "POST",
    });

    winnieStore.insertDuplicateChallenge(createdChallenge);
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Deletes the challenge.
 */
async function remove() {
  try {
    await $fetch(`/api/challenges/${props.challenge.id}`, { method: "DELETE" });
    winnieStore.removeChallenge(props.challenge.id);
  }
  catch (error) {
    toastApiError(error);
  }
}
</script>

<template>
  <UiMenu>
    <template #trigger="{ trigger }">
      <UiIconButton
        v-bind="trigger"
        icon="more_vert"
        label="Challenge actions"
        variant="ghost"
      />
    </template>

    <UiMenuItem icon="edit" @click="winnieStore.editingChallengeId = challenge.id">
      Edit
    </UiMenuItem>
    <UiMenuItem :icon="challenge.target > 0 ? 'exposure_neg_1' : 'exposure_plus_1'" @click="toggleCounter()">
      {{ counterLabel }}
    </UiMenuItem>
    <UiMenuItem icon="push_pin" @click="togglePin()">
      {{ pinLabel }}
    </UiMenuItem>
    <UiMenuItem icon="restart_alt" @click="resetTimer()">
      Reset timer
    </UiMenuItem>
    <UiMenuItem icon="control_point_duplicate" @click="duplicate()">
      Duplicate
    </UiMenuItem>
    <UiMenuItem separator />
    <UiMenuItem
      icon="delete"
      danger
      @click="remove()"
    >
      Delete
    </UiMenuItem>
  </UiMenu>
</template>
