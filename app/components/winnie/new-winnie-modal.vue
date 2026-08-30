<script setup lang="ts">
import type { FetchError } from "ofetch";
import { useForm } from "vee-validate";
import z from "zod";
import { winnieNameSchema } from "~~/shared/schemas/winnie";
import { useWinnieStore } from "~/stores/winnies";

const emit = defineEmits<{
  /** Emitted once the server has created the Winnie. */
  created: [];
}>();

const winnieStore = useWinnieStore();
const modal = useTemplateRef("modal");
const formError = ref("");

const { handleSubmit, errors, setErrors, isSubmitting, defineField, resetForm } = useForm({
  validationSchema: zodSchema(z.object({ name: winnieNameSchema })),
});

const [name, nameAttrs] = defineField("name");

const onSubmit = handleSubmit(async (values) => {
  formError.value = "";

  try {
    const winnie = await $fetch("/api/winnies", { method: "POST", body: values });

    winnieStore.addWinnie(winnie);
    emit("created");
  }
  catch (error) {
    const fetchError = error as FetchError;

    if (fetchError.data?.data?.fieldErrors)
      setErrors(fetchError.data.data.fieldErrors);
    else
      formError.value = apiErrorMessage(fetchError);
  }
});

defineExpose({
  open: () => {
    resetForm();
    formError.value = "";
    modal.value?.open();
  },
  close: () => modal.value?.close(),
});
</script>

<template>
  <UiModal
    ref="modal"
    title="Create a new Winnie"
    action-label="Create"
    :pending="isSubmitting"
    @action="onSubmit"
  >
    <form class="flex flex-col gap-2" @submit="onSubmit">
      <input
        v-model="name"
        v-bind="nameAttrs"
        autofocus
        aria-label="Winnie name"
        class="input w-full input-sm"
        placeholder="e.g. Kitty vs. the world"
      >
      <p v-if="errors.name" class="text-sm text-error">
        {{ errors.name }}
      </p>
      <p v-if="formError" class="alert alert-error">
        {{ formError }}
      </p>
    </form>
  </UiModal>
</template>
