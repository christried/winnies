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
    <UiTextInput
      v-model="draft.game"
      variant="inline"
      label="Game"
      hide-label
      class="min-w-0 flex-1"
    />
    <UiTextInput
      v-model="draft.spec"
      variant="inline"
      label="Win Condition"
      hide-label
      class="min-w-0 flex-1"
    />
    <UiTextInput
      v-model.number="draft.target"
      variant="number"
      label="Target"
      hide-label
      min="0"
    />

    <UiIconButton
      label="Save"
      icon="check"
      variant="primary"
      size="sm"
      @click="saveChellengeEdit"
    />
    <UiIconButton
      label="Cancel"
      icon="close"
      variant="ghost"
      size="sm"
      @click="cancel"
    />
  </div>
</template>
