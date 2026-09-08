<script setup lang="ts">
import { useForm } from "vee-validate";
import { insertChallengeSchema } from "~~/server/db/schema";
import { MAX_CHALLENGES_PER_WINNIE } from "#shared/constants";

const winnieStore = useWinnieStore();
const { currentWinnie, totalCount, pending } = storeToRefs(winnieStore);

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

const showSkeleton = useDelayed(pending);
</script>

<template>
  <div v-if="showSkeleton" class="h-24 w-full skeleton" />
  <div
    v-else
    tabindex="0"
    class="collapse bg-base-200"
  >
    <div v-if="totalCount > 0" class="collapse-title text-center font-semibold">
      Create your next Challenge
    </div>
    <div v-else class="text-primar collapse-title text-center font-semibold">
      Create your first Challenge
    </div>
    <div class="collapse-content">
      <form
        class="flex flex-col items-center gap-2 md:flex-row"
        @submit="onSubmit"
        @keydown.enter="onSubmit"
      >
        <input
          ref="gameInput"
          v-model="game"
          type="text"
          v-bind="gameAttrs"
          class="input w-full"
          placeholder="Game"
          :disabled="atCap"
        >
        <input
          v-model="spec"
          type="text"
          v-bind="specAttrs"
          class="input w-full"
          placeholder="Win Condition"
          :disabled="atCap"
        >
        <div class="flex items-center gap-2">
          <input
            v-if="counterChecked"
            v-model="target"
            type="number"
            v-bind="targetAttrs"
            class="input min-w-20"
            placeholder="Target"
            :disabled="atCap"
          >
          <div class="tooltip-neutral tooltip tooltip-top" :data-tip="counterChecked ? 'Remove counter' : 'Add counter'">
            <UiIconButton
              :label="counterChecked ? 'Add counter' : 'Remove counter'"
              :icon="counterChecked ? 'countOn' : 'countOff'"
              :class="counterChecked ? 'btn btn-circle btn-ghost text-primary' : 'btn btn-circle btn-ghost'"
              :disabled="atCap || isSubmitting"
              @click.prevent="onCounterToggle"
            />
          </div>

          <div class="tooltip tooltip-top tooltip-primary" data-tip="Add Challenge">
            <UiIconButton
              type="submit"
              label="Add challenge"
              icon="plus"
              class="btn hover:btn-primary"
              :disabled="atCap || isSubmitting"
            />
          </div>
        </div>
      </form>
      <p v-if="atCap" class="mt-4 text-center text-error">
        Limit reached ({{ MAX_CHALLENGES_PER_WINNIE }} challenges per day)
      </p>
    </div>
  </div>
</template>
