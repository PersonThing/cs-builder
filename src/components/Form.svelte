<form on:submit|preventDefault>
  <div class="form">
    <div class="form-buttons">
      <slot name="buttons" />
      <SaveBtn disabled={!hasChanges} />
    </div>

    <div class="form-content">
      <slot />
    </div>
  </div>
</form>

<script>
  import SaveBtn from './SaveBtn.svelte'

  export let hasChanges = true
  let className
  export { className as class }
</script>

<style>
  .form-content,
  .form-buttons {
    padding: 10px;
  }
  .form-buttons {
    display: flex;
    flex-direction: row;
    gap: 5px;
  }
  .form-content {
    z-index: 9;
  }
</style>
