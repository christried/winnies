<script setup lang="ts">
import type { ChallengeRow } from "~/stores/winnies";

const props = defineProps<{
  /** The challenge being edited needed to seed the form */
  challenge: ChallengeRow;
}>();

const winnieStore = useWinnieStore();

// inputs collected
const draft = reactive({
  game: props.challenge.game,
  spec: props.challenge.spec,
  target: props.challenge.target,
});

/**
 * Saves the edit and takes the server's version.
 */
async function saveChellengeEdit() {
  const { id, game, spec, target } = props.challenge;

  try {
    if (draft.game !== game || draft.spec !== spec) {
      const updatedChallenge = await $fetch(`/api/challenges/${id}`, {
        method: "PATCH",
        body: { game: draft.game, spec: draft.spec },
      });

      winnieStore.replaceChallenge(updatedChallenge);
    }

    // Changing the target may win the challenge, so use other endpoint to confirm if it does.
    if (draft.target !== target) {
      const updatedChallenge = await $fetch(`/api/challenges/${id}/counter`, {
        method: "PATCH",
        body: { op: "target", target: draft.target },
      });

      winnieStore.replaceChallenge(updatedChallenge);
    }

    winnieStore.editingChallengeId = null;
  }
  catch (error) {
    toastApiError(error);
  }
}

/**
 * Closes the editor **without** saving.
 */
function cancel() {
  winnieStore.editingChallengeId = null;
}
</script>

<template>
  <div class="flex min-w-0 flex-1 items-center gap-2" @keydown.escape="cancel">
    <input v-model="draft.game" class="input min-w-0 flex-1 input-sm">
    <input v-model="draft.spec" class="input min-w-0 flex-1 input-sm">
    <input
      v-model.number="draft.target"
      type="number"
      min="0"
      class="input w-20 input-sm"
    >

    <UiIconButton
      label="Save"
      icon="check"
      class="btn btn-square btn-sm"
      @click="saveChellengeEdit"
    />
    <UiIconButton
      label="Cancel"
      icon="close"
      class="btn btn-square btn-ghost btn-sm"
      @click="cancel"
    />
  </div>
</template>
