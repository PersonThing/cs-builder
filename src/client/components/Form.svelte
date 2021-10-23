<form on:submit|preventDefault>
  <div class="form">
    <div class="form-content">
      <slot />
    </div>

    <div class="form-buttons">
      <SaveBtn disabled={!hasChanges} />
      <slot name="buttons" />
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
  .form-content {
    padding: 10px 10px 0 10px;
  }
  .form-buttons {
    padding: 0px 10px 10px 10px;
    display: flex;
    flex-direction: row;
    gap: 5px;
  }
  .form-content {
    z-index: 9;
  }
</style>
