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
const [target, targetAttrs] = defineField("target");

const counterChecked = ref(false);
/**
 * Handles clicking on the toggle button for adding a counter target to the new Challenge creation
 */
function onCounterToggle() {
  counterChecked.value = !counterChecked.value;
  target.value = undefined;
}

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
  Create your next Challenge:
  <!-- then make the form here a fieldset with these nice lines, maybe legends?
   also tooltips are missing on buttons
   also check vee validate and instead feedback on wrong input here (negative numbers in target fields are not legal)
   form should wrap to more lines on smaller devices -->
  <form class="mx-2 flex items-center gap-4 min-[720px]:mx-6" @submit="onSubmit">
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
      placeholder="Win Condition"
      :disabled="atCap"
    >
    <input
      v-if="counterChecked"
      v-model="target"
      type="number"
      v-bind="targetAttrs"
      class="input flex-1 input-sm"
      placeholder="Target"
      :disabled="atCap"
    >

    <UiIconButton
      v-model="counterChecked"
      :label="counterChecked ? 'Add counter' : 'Remove counter'"
      :icon="counterChecked ? 'countOn' : 'countOff'"
      :class="counterChecked ? 'btn btn-circle btn-primary' : 'btn btn-circle'"
      :disabled="atCap || isSubmitting"
      @click.prevent="onCounterToggle"
    />

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
