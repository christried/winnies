<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The challenge everything interacts with */
  challenge: ChallengeRow;
}>();

const winnieStore = useWinnieStore();

// dynamix labels
const counterLabel = computed(() => props.challenge.target > 0 ? "Remove counter" : "Add counter");
const pinLabel = computed(() => props.challenge.pinned ? "Unpin" : "Pin");

/**
 * Toggles the counter on/off. Sets Target to 0 if it had one!
 * @param close close method passed up by the menu.
 */
async function toggleCounter(close: () => void) {
  close();

  try {
    const updatedChallenge = await $fetch(`/api/challenges/${props.challenge.id}/counter`, {
      method: "PATCH",
      body: { op: "target", target: props.challenge.target > 0 ? 0 : 1 },
    });

    winnieStore.replaceChallenge(updatedChallenge);
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Pins or unpins (Toggle) the Challenge row.
 * @param close close method passed up by the menu.
 */
async function togglePin(close: () => void) {
  close();

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
 * @param close close method passed up by the menu.
 */
async function resetTimer(close: () => void) {
  close();

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
 * @param close close method passed up by the menu.
 */
async function duplicate(close: () => void) {
  close();

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
 * @param close close method passed up by the menu.
 */
async function remove(close: () => void) {
  close();

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
  <UiDropdown
    label="Challenge actions"
    trigger-class="btn btn-square btn-sm btn-ghost"
    menu-class="dropdown-end"
  >
    <template #trigger>
      <UiIcon name="more" />
    </template>

    <template #default="{ close }">
      <li>
        <button type="button" @click="winnieStore.editingChallengeId = challenge.id; close()">
          Edit
        </button>
      </li>
      <li>
        <button type="button" @click="toggleCounter(close)">
          {{ counterLabel }}
        </button>
      </li>
      <li>
        <button type="button" @click="togglePin(close)">
          {{ pinLabel }}
        </button>
      </li>
      <li>
        <button type="button" @click="resetTimer(close)">
          Reset timer
        </button>
      </li>
      <li>
        <button type="button" @click="duplicate(close)">
          Duplicate
        </button>
      </li>
      <li class="border-t border-base-300">
        <button
          type="button"
          class="text-error"
          @click="remove(close)"
        >
          Delete
        </button>
      </li>
    </template>
  </UiDropdown>
</template>
