<form on:submit|preventDefault>
  <div class="form">
    <div class="form-buttons">
      <SaveBtn disabled={!hasChanges} />
      <slot name="buttons" />
    </div>

    <div class="form-content">
      <slot />
    </div>
  </div>
</form>

<script>
  import SaveBtn from './SaveBtn.svelte'

  export let hasChanges = true
</script>

<style>
  .form-content,
  .form-buttons {
    padding: 10px;
  }
  .form-buttons {
    position: sticky;
    top: 0px;
    z-index: 10;
    background: #fff;
    border-bottom: 1px solid #ced4da;
    display: flex;
    flex-direction: row;
    gap: 5px;
  }
  .form-content {
    z-index: 9;
  }
</style>
