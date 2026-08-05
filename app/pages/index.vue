<script setup lang="ts">
import Icon from "~/components/ui/icon.vue";
import Modal from "~/components/ui/modal.vue";
</script>

<template>
  <div>
    <!--  modal testzone -->
    <div class="p-4">
      <button class="btn btn-primary" onclick="test_modal.showModal()">
        <Icon
          name="plus"
        />
      </button>
      <Modal
        modal-id="test_modal"
        modal-title="New Winnie"
      >
        <input
          type="text"
          placeholder="Name of your Winnie"
          class="input  bg-base-300"
        >
      </Modal>
    </div>
  </div>
</template>
