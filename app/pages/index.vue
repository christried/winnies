<template>
  <div>
    <!--  modal testzone -->
    <div>
      <button class="btn" onclick="test_modal.showModal()">
        Modal hier testen
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
