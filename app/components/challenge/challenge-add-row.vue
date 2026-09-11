<script setup lang="ts">
import type { FetchError } from "ofetch";
import { useForm } from "vee-validate";
import { z } from "zod";
import { insertChallengeSchema } from "~~/server/db/schema";
import { MAX_CHALLENGES_PER_WINNIE } from "#shared/constants";

const winnieStore = useWinnieStore();
const { currentWinnie, totalCount, pending } = storeToRefs(winnieStore);

const atCap = computed(() => totalCount.value >= MAX_CHALLENGES_PER_WINNIE);

// empty number input one hands back "" rather than undefined
const formSchema = insertChallengeSchema.extend({
  target: z.preprocess(
    value => value === "" ? undefined : value,
    insertChallengeSchema.shape.target,
  ),
});

const { handleSubmit, defineField, errors, setErrors, isSubmitting, resetForm } = useForm({
  validationSchema: zodSchema(formSchema),
});

// Blur and change only
const validateLazily = { validateOnModelUpdate: false };

const [game, gameAttrs] = defineField("game", validateLazily);
const [spec, specAttrs] = defineField("spec", validateLazily);
const [target, targetAttrs] = defineField("target", validateLazily);

const gameId = useId();
const specId = useId();
const targetId = useId();

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
    const fetchError = error as FetchError;

    if (fetchError.data?.data?.fieldErrors)
      setErrors(fetchError.data.data.fieldErrors);
    else
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
    <div v-else class="collapse-title text-center text-2xl font-bold text-secondary">
      Create your first Challenge
    </div>
    <div class="collapse-content">
      <form
        class="flex flex-col items-center gap-2 md:flex-row md:items-start"
        @submit="onSubmit"
      >
        <div class="w-full">
          <input
            :id="gameId"
            ref="gameInput"
            v-model="game"
            type="text"
            v-bind="gameAttrs"
            class="input w-full"
            :class="{ 'input-error': errors.game }"
            placeholder="Game"
            :disabled="atCap"
            :aria-invalid="Boolean(errors.game)"
            :aria-describedby="errors.game ? `${gameId}-hint` : undefined"
          >
          <p
            v-if="errors.game"
            :id="`${gameId}-hint`"
            class="mt-1 text-sm text-error"
          >
            {{ errors.game }}
          </p>
        </div>
        <div class="w-full">
          <input
            :id="specId"
            v-model="spec"
            type="text"
            v-bind="specAttrs"
            class="input w-full"
            :class="{ 'input-error': errors.spec }"
            placeholder="Win Condition"
            :disabled="atCap"
            :aria-invalid="Boolean(errors.spec)"
            :aria-describedby="errors.spec ? `${specId}-hint` : undefined"
          >
          <p
            v-if="errors.spec"
            :id="`${specId}-hint`"
            class="mt-1 text-sm text-error"
          >
            {{ errors.spec }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div v-if="counterChecked">
            <input
              :id="targetId"
              v-model="target"
              type="number"
              v-bind="targetAttrs"
              class="input min-w-20"
              :class="{ 'input-error': errors.target }"
              placeholder="Target"
              :disabled="atCap"
              :aria-invalid="Boolean(errors.target)"
              :aria-describedby="errors.target ? `${targetId}-hint` : undefined"
            >
            <p
              v-if="errors.target"
              :id="`${targetId}-hint`"
              class="mt-1 text-sm text-error"
            >
              {{ errors.target }}
            </p>
          </div>
          <div class="tooltip-neutral tooltip tooltip-top" :data-tip="counterChecked ? 'Remove counter' : 'Add counter'">
            <UiIconButton
              type="button"
              :label="counterChecked ? 'Add counter' : 'Remove counter'"
              :icon="counterChecked ? 'countOn' : 'countOff'"
              :class="counterChecked ? 'btn btn-circle btn-ghost text-primary' : 'btn btn-circle btn-ghost'"
              :disabled="atCap || isSubmitting"
              @click="onCounterToggle"
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
