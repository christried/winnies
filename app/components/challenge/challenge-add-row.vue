<script setup lang="ts">
import { useForm } from "vee-validate";
import { insertChallengeSchema } from "~~/server/db/schema";
import { MAX_CHALLENGES_PER_WINNIE } from "#shared/constants";

const winnieStore = useWinnieStore();
const { currentWinnie, totalCount } = storeToRefs(winnieStore);

const atCap = computed(() => totalCount.value >= MAX_CHALLENGES_PER_WINNIE);

const { handleSubmit, defineField, isSubmitting, resetForm } = useForm({
  validationSchema: zodSchema(insertChallengeSchema),
});

const [game, gameAttrs] = defineField("game");
const [spec, specAttrs] = defineField("spec");

const gameInput = useTemplateRef("gameInput");
const onSubmit = handleSubmit(async (values) => {
  if (!currentWinnie.value)
    return;

  try {
    const createdChallenge = await $fetch(
      `/api/winnies/${currentWinnie.value.id}/challenges`,
      { method: "POST", body: values },
    );

    winnieStore.addChallenge(createdChallenge);

    resetForm();
    gameInput.value?.focus();
  }
  catch (error) {
    toastApiError(error);
  }
});
</script>

<template>
  <form class="flex items-center gap-4 p-4" @submit="onSubmit">
    <input
      ref="gameInput"
      v-model="game"
      v-bind="gameAttrs"
      class="input flex-1 input-sm"
      placeholder="Game"
      :disabled="atCap"
    >
    <input
      v-model="spec"
      v-bind="specAttrs"
      class="input flex-1 input-sm"
      placeholder="What counts as a win?"
      :disabled="atCap"
    >

    <UiIconButton
      type="submit"
      label="Add challenge"
      icon="plus"
      class="btn"
      :disabled="atCap || isSubmitting"
    />
  </form>

  <p v-if="atCap" class="type-meta px-3 pb-2">
    Limit reached ({{ MAX_CHALLENGES_PER_WINNIE }} challenges)
  </p>
</template>
