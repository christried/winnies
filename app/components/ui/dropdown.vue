<script lang="ts" setup>
import type { Winnie } from "~/types/winnie";

const props = defineProps<{
  currentWinnie: Winnie;
  winnies: Winnie[];
}>();

const emit = defineEmits<{
  (e: "updateCurrentWinnie", winnie: Winnie): void;
}>();

const id = useId();
const winnieMenu = useTemplateRef<HTMLElement>("winnieMenu");
const otherWinnies = computed(() => props.winnies.filter(w => w.id !== props.currentWinnie.id));

function selectWinnie(winnie: Winnie): void {
  emit("updateCurrentWinnie", winnie);
  winnieMenu.value?.hidePopover();
}
</script>

<template>
  <div>
    <button
      class="btn btn-neutral"
      :popovertarget="id"
      :style="`anchor-name: --${id}`"
    >
      {{ currentWinnie.title }}
      <UiIcon name="chevron" />
    </button>
    <ul
      :id="id"
      ref="winnieMenu"
      class="dropdown menu w-max rounded-box bg-base-100 shadow-sm mt-1 border border-neutral ml-15 "
      popover
      :style="`position-anchor: --${id}`"
    >
      <li v-for="winnie in otherWinnies" :key="winnie.id">
        <button @click="selectWinnie(winnie)">
          {{ winnie.title }}
        </button>
      </li>
    </ul>
  </div>
</template>
